'use strict';
import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as _ from 'lodash';
import {Observable} from '@reactivex/rxjs';
// import * as ELD from './ElementDecorators';
import {di, injectable} from '@molecuel/di';
import * as jsonpatch from 'fast-json-patch';
import {DiffObject} from './DiffObject';

@injectable
export class MlclElements {
  /**
   * modified getInstance of di, setting handler to current instance
   * @param  {string}           name [description]
   * @return {Promise<void>}         [description]
   */
  public getInstance(name: string, ...params): any {
    if (_.includes(this.getClasses(), name)) {
      let instance = di.getInstance(name, ...params);
      if (instance && _.includes(Object.keys(instance), 'elements')) {
        instance.elements = this;
      }
      return instance;
    }
    else {
      return undefined;
    }
  }

  /**
   * explicit register of class for database(s)
   * @param  {any}              model        [description]
   * @return {Promise<void>}                 [description]
   * @todo Save collectionname/tablenname as static on model
   */
  public async registerModel(model: any) {
    let core = di.getInstance('MlclCore');
    let registrationStream = core.createStream('elementsRegistration');
    let myobs = Observable.from([model]);
    myobs = registrationStream.renderStream(myobs);
    let regResult = await myobs.toPromise();
    return regResult;
  }

  /**
   * Validator function for the instances
   * @param  {Object}           instance [description]
   * @return {Promise<void>}             [description]
   */
  public validate(instance: Object): TSV.IValidatorError[] {
      return (new TSV.Validator()).validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {Element}       element [description]
   * @return {any}                   [description]
   */
  public toDbObject(element: Element): any {
    return this.toDbObjRecursive(element);
  }

  /**
   * Return string array of injectable Element extending classes
   * @return {string[]}                 [description]
   */
  public getClasses(): string[] {
    let result: string[] = [];
    for (let [name, injectable] of di.injectables) {
      if (injectable.injectable && new injectable.injectable() instanceof Element && name !== Element.name) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Return new instance of requested class with supplied data
   * @param  {string} className              [description]
   * @param  {Object} data                   [description]
   * @return any                             [description]
   */
  public toInstance(className: string, data: Object): any {
    let instance = this.getInstance(className);
    if (instance) {
      for (let key in data) {
        if (key === '_id' && key.slice(1) in instance) {
          instance[key.slice(1)] = data[key];
        }
        else if (key in instance && (typeof data[key] !== 'object' || !_.isEmpty(data[key]))) {
          instance[key] = data[key];
        }
      }
    }
    return instance;
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj                 [description]
   * @param  {boolean} nested              [description]
   * @return any                           [description]
   */
  protected toDbObjRecursive(obj: Object, databaseName?: string): any {
    let result: any = {};
    let objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, obj); // get all validator decorators
    let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function(o: any) { // map by property name
      return o.property;
    });
    for (let key in obj) {
      if (obj.hasOwnProperty(key)
        && obj[key] !== undefined
        && propertiesValidatorDecorators[key]) {
          // check for non-prototype, validator-decorated property
        if (typeof obj[key] === 'object') { // property is object
          if (obj[key].id) { // property has _id-property itself (use DB-id later)
            result[key] = obj[key].id;
          }
          else if (!('id' in obj[key])) { // resolve property
            result[key] = this.toDbObjRecursive(obj[key], databaseName);
          }
        }
        else if (typeof obj[key] !== 'function') {
          result[key] = obj[key];
        }
      }
    }
    if ((obj['collection'] || obj.constructor['collection']) && !result['collection']) {
      let classCollectionDescriptor = Object.getOwnPropertyDescriptor(obj.constructor, 'collection');
      // check for static getter on class; instance getter has priority -> continue in any case
      if (classCollectionDescriptor && typeof classCollectionDescriptor.get === 'function') {
        Object.defineProperty(result, 'collection', classCollectionDescriptor);
      }
      let instanceCollectionDescriptor = Object.getOwnPropertyDescriptor(obj, 'collection');
      // check for instance getter
      if (instanceCollectionDescriptor && typeof instanceCollectionDescriptor.get === 'function') {
        Object.defineProperty(result, 'collection', instanceCollectionDescriptor);
      }
    }
    return result;
  }

  public diffObjects(oldObj, newObj) {
    let diff: Array<DiffObject> = jsonpatch.compare(newObj, oldObj);
    return diff;
  }

  public revertObject(obj, patches: Array<DiffObject>) {
    let result = jsonpatch.apply(obj, patches);
    return result;
  }

  /**
   * Wrapper for instance save
   * @param  {Element[]}                           instances [description]
   * @param  {boolean}                             upsert    [description]
   * @return {Promise<any>}                                  [description]
   */
  public async saveInstances(instances: Element[], upsert: boolean = false): Promise<any> {
    let result = {
      successCount:  0,
      errorCount: 0,
      errors: []
    };
    let dbHandler = di.getInstance('MlclDatabase');
    if (dbHandler && dbHandler.connections) {
      for (let instance of instances) {
        let validationResult = instance.validate;
        if (validationResult.length === 0) {
          try {
            await dbHandler.persistenceDatabases.save(instance.toDbObject());
            result.successCount++;
            // await this.populate(instance); // subcollections?
            // await dbHandler.populationDatabases.save(instance);
          } catch (error) {
            result.errorCount++;
            result.errors.push(error);
          }
        }
        else {
          result.errorCount += validationResult ? validationResult.length : 1;
          result.errors = result.errors.concat(result.errors, validationResult);
        }
      }
    }
    else {
      result.errorCount++;
      result.errors.push(new Error('No connected databases.'));
    }
    if (result.successCount) {
      return Promise.resolve(result);
    }
    else {
      return Promise.reject(result);
    }
  }

  // public async populate(obj: Object, properties?: string): Promise<any> {
  //   // let core = di.getInstance('MlclCore');
  //   // let populationStream = core.createStream('elementsPopulation');
  //   // let pobs = Observable.from([{object: obj, properties: properties}]);
  //   // pobs = populationStream.renderStream(pobs);
  //   // let populResult = await pobs.toPromise();
  //   // return populResult;
  //   let dbHandler = di.getInstance('MlclDatabase');
  //   if (dbHandler && dbHandler.connections) {
  //     try {
  //       let result = await dbHandler.populationDatabases.populate(obj, properties);
  //       if (_.includes(this.getClasses(), obj.constructor.name)) {
  //         return Promise.resolve(this.toInstance(obj.constructor.name, result));
  //       }
  //       else {
  //         return Promise.resolve(result);
  //       }
  //     } catch (error) {
  //       return Promise.reject(error);
  //     }
  //   }
  //   else {
  //     return Promise.reject(new Error('No connected databases.'));
  //   }
  // }

  /**
   * Wrapper for instance get
   * @param  {any}                                   query [description]
   * @return {Promise<any>}                                [description]
   */
  public async find(query: any, collection: string): Promise<any> {
    try {
      let dbHandler = di.getInstance('MlclDatabase');
      if (dbHandler && dbHandler.connections) {
        let result = await dbHandler.find(query, collection);
        return Promise.resolve(result);
      }
      else {
        Promise.reject(new Error('No connected databases.'));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Wrapper for instance get by id
   * @param  {any}                                   id [description]
   * @return {Promise<any>}                             [description]
   */
  public async findById(id: any, collection: string): Promise<any> {
    try {
      let result = await this.find({_id: id}, collection);
      return Promise.resolve(result[0]);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

import {Element} from './Element';
