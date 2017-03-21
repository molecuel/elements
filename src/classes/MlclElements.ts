'use strict';
import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as ELD from './ElementDecorators';
import * as _ from 'lodash';
import * as Jsonpatch from 'fast-json-patch';
import {DiffObject} from './DiffObject';
// import {Observable} from '@reactivex/rxjs';
// import * as ELD from './ElementDecorators';
import {di, injectable} from '@molecuel/di';

@injectable
export class MlclElements {
  private get METADATAKEY(): string { return 'mlcl_elements:validators'; };

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
      this.addCollectionTo(instance);
      return instance;
    }
    else {
      return undefined;
    }
  }

  // /**
  //  * explicit register of class for database(s)
  //  * @param  {any}              model        [description]
  //  * @return {Promise<void>}                 [description]
  //  * @todo Save collectionname/tablenname as static on model
  //  */
  // public async registerModel(model: any) {
  //   let core = di.getInstance('MlclCore');
  //   let registrationStream = core.createStream('elementsRegistration');
  //   let myobs = Observable.from([model]);
  //   myobs = registrationStream.renderStream(myobs);
  //   let regResult = await myobs.toPromise();
  //   return regResult;
  // }

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
      let metakeys = Reflect.getMetadataKeys(Reflect.getPrototypeOf(instance));
      let meta = [];
      for (let metakey of metakeys) {
        if (!metakey.includes('design:')) {
          meta = meta.concat(Reflect.getMetadata(metakey, Reflect.getPrototypeOf(instance)));
        }
      }
      for (let key in data) {
        if (key === '_id' && (key.slice(1) in instance || _.includes(_.map(meta, 'property'), key.slice(1)))) {
          instance[key.slice(1)] = data[key];
        }
        else if ((key in instance || _.includes(_.map(meta, 'property'), key)) && (typeof data[key] !== 'object' || !_.isEmpty(data[key]))) {
          instance[key] = data[key];
        }
      }
    }
    this.addCollectionTo(instance);
    return instance;
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj                 [description]
   * @param  {boolean} nested              [description]
   * @return any                           [description]
   */
  protected toDbObjRecursive(obj: Object, idPattern?: string): any {
    if (!idPattern) {
      idPattern = 'id';
    }
    let result: any = _.isArray(obj) ? [] : {};
    let objectValidatorDecorators = _.isArray(obj) ? [] : Reflect.getMetadata(TSV.METADATAKEY, Reflect.getPrototypeOf(obj)); // get all validator decorators
    let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function(o: any) { // map by property name
      return o.property;
    });
    for (let key in obj) {
      if (obj.hasOwnProperty(key)
        && obj[key] !== undefined
        && (propertiesValidatorDecorators[key]
        || _.isArray(obj))) {
          // check for non-prototype, validator-decorated property
        if (_.isArray(obj[key])) {
          result[key] = this.toDbObjRecursive(obj[key]);
        }
        else if (typeof obj[key] === 'object') { // property is object
          if (obj[key][idPattern]) { // property has _id-property itself (use DB-id later)
            result[key] = obj[key][idPattern];
          }
          else if (!(idPattern in obj[key])) { // resolve property
            result[key] = this.toDbObjRecursive(obj[key]);
          }
        }
        else if (typeof obj[key] !== 'function') {
          result[key] = obj[key];
        }
      }
    }
    this.addCollectionTo(result, obj);
    return result;
  }

  protected addCollectionTo(target: Object, model?: Object) {
    if (!model) {
      model = target;
    }
    let collectionDecorator = _.find(Reflect.getMetadata(this.METADATAKEY, model.constructor), ['type', ELD.Decorators.COLLECTION]);
    if ((collectionDecorator || model['collection'] || model.constructor['collection']) && !target['collection']) {
      // check for decorator
      if(collectionDecorator) {
        Object.defineProperty(target, 'collection', {
          configurable: true, get: function(): string {
            return collectionDecorator['value'];
          }
        });
      }
      // other getters have priority -> continue anyway
      let classCollectionDescriptor = Object.getOwnPropertyDescriptor(model.constructor, 'collection');
      // check for static getter on class
      if (classCollectionDescriptor && typeof classCollectionDescriptor.get === 'function') {
        Object.defineProperty(target, 'collection', classCollectionDescriptor);
      }
      let protoCollectionDescriptor = Object.getOwnPropertyDescriptor(Reflect.getPrototypeOf(model), 'collection');
      // check for getter on prototype
      if (protoCollectionDescriptor && typeof protoCollectionDescriptor.get === 'function') {
        Object.defineProperty(target, 'collection', protoCollectionDescriptor);
      }
      let instanceCollectionDescriptor = Object.getOwnPropertyDescriptor(Reflect.getPrototypeOf(model), 'collection');
      // check for getter on instance
      if (instanceCollectionDescriptor && typeof instanceCollectionDescriptor.get === 'function') {
        Object.defineProperty(target, 'collection', instanceCollectionDescriptor);
      }
      // make sure there is always one collection getter
      if (!target['collection']) {
        bject.defineProperty(target, 'collection', {
          configurable: true, get: function(): string {
            return model.constructor.name;
          }
        });
      }
    }
  }

  public diffObjects(oldObj, newObj) {
    let diff: Array<DiffObject> = Jsonpatch.compare(newObj, oldObj);
    return diff;
  }

  public revertObject(obj, patches: Array<DiffObject>) {
    let result = Jsonpatch.apply(obj, patches);
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
      successes: [],
      errors: []
    };
    let dbHandler = di.getInstance('MlclDatabase');
    if (dbHandler && dbHandler.connections) {
      for (let instance of instances) {
        let validationResult = [];
        try {
          validationResult = instance.validate();
        } catch (error) {
          result.errorCount++;
          result.errors.push(error);
        }
        if (validationResult.length === 0) {
          try {
            let response = await dbHandler.persistenceDatabases.save(instance.toDbObject());
            result.successCount++;
            result.successes = result.successes.concat(response.successes);
          } catch (error) {
            result.errorCount++;
            result.errors.push(error);
          }
          try {
            await this.populate(instance);
          } catch (error) {
            let reason = new Error('Population failed');
            (<any>reason).object = error;
            delete reason.stack;
            result.errorCount++;
            result.errors.push(reason);
          }
          try {
            await dbHandler.populationDatabases.save(instance.toDbObject());
          } catch (error) {
            if (typeof error.errorCount === 'undefined' || error.errorCount > 0) {
              result.errorCount++;
              result.errors.push(error);
            }
          }
        }
        else {
          result.errorCount += validationResult ? validationResult.length : 1;
          result.errors = result.errors.concat(result.errors, validationResult);
        }
      }
    }
    else {
      return Promise.reject(new Error('No connected databases.'));
    }
    if (result.successCount) {
      return Promise.resolve(result);
    }
    else {
      return Promise.reject(result);
    }
  }

  public async populate(obj: Object, properties?: string): Promise<any> {
    let meta = Reflect.getMetadata(this.METADATAKEY, obj.constructor) ? Reflect.getMetadata(this.METADATAKEY, obj.constructor).filter((entry) => {
      return (entry.type === ELD.Decorators.IS_REF_TO && (!properties || _.includes(properties.split(' '), entry.property)));
    }) : [];
    let queryCollections = meta.map((entry) => {
      let instance = this.getInstance(entry.value);
      if (instance) {
        return instance.collection || instance.constructor.collection || instance.constructor.name;
      }
    });
    let queryProperties = meta.map((entry) => {
      return entry.property;
    });
    let dbHandler = di.getInstance('MlclDatabase');
    if (dbHandler && dbHandler.connections) {
      try {
        let result = await dbHandler.populate(obj, queryProperties, queryCollections);
        if (_.includes(this.getClasses(), obj.constructor.name)) {
          let deepResult;
          await this.toInstance(obj.constructor.name, result).populate().then((value) => { deepResult = value; }).catch((error) => { deepResult = error; });
          return Promise.resolve(deepResult);
        }
        else {
          return Promise.resolve(result);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    }
    else {
      return Promise.reject(new Error('No connected databases.'));
    }
  }

  /**
   * Wrapper for instance get
   * @param  {any}                                   query [description]
   * @return {Promise<any>}                                [description]
   */
  public async find(query: any, collection: string): Promise<any> {
    let dbHandler = di.getInstance('MlclDatabase');
    if (dbHandler && dbHandler.connections) {
      try {
        let result = await dbHandler.find(query, collection);
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    else {
      return Promise.reject(new Error('No connected databases.'));
    }
  }

  /**
   * Wrapper for instance get by id
   * @param  {any}                                   id [description]
   * @return {Promise<any>}                             [description]
   */
  public async findById(id: any, collection: string): Promise<any> {
    let dbHandler = di.getInstance('MlclDatabase');
    if (dbHandler && dbHandler.connections) {
      let idPattern = dbHandler.connections[0].idPattern || dbHandler.connections[0].constructor.idPattern;
      let query = {};
      query[idPattern] = id;
      try {
        let result = await this.find(query, collection);
        if (result && result[0]) {
          result[0][idPattern] = id;
          return Promise.resolve(result[0]);
        }
        else {
          return Promise.resolve(undefined);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    }
    else {
      return Promise.reject(new Error('No connected databases.'));
    }
  }
}

import {Element} from './Element';
