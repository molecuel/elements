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

  public async populate(obj: Object, properties?: string): Promise<any> {
    let core = di.getInstance('MlclCore');
    let populationStream = core.createStream('elementsPopulation');
    let pobs = Observable.from([{object: obj, properties: properties}]);
    pobs = populationStream.renderStream(pobs);
    let populResult = await pobs.toPromise();
    // use this.toInstance(obj.constructor.name, <resolved promise>)
    return populResult;
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
      // console.log(Object.keys(instance));
      for (let key in data) {
        if (key in instance) {
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
    if (result.successCount) {
      return Promise.resolve(result);
    }
    else {
      return Promise.reject(result);
    }
  }

  /**
   * Wrapper for instance get
   * @param  {any}                                   query [description]
   * @return {Promise<any>}                                [description]
   */
  public async find(query: any): Promise<any> {
    return Promise.reject(query);
  }

  /**
   * Wrapper for instance get by id
   * @param  {any}                                   id [description]
   * @return {Promise<any>}                             [description]
   */
  public async findById(id: any): Promise<any> {
    return await this.find(id);
  }
}

import {Element} from './Element';
