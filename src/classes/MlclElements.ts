"use strict";
import {di, injectable} from "@molecuel/di";
import * as TSV from "@molecuel/tsvalidate";
import * as Jsonpatch from "fast-json-patch";
import * as _ from "lodash";
import "reflect-metadata";
// import {Observable} from '@reactivex/rxjs';
import {DiffObject} from "./DiffObject";
import * as ELD from "./ElementDecorators";

@injectable
export class MlclElements {
  private get METADATAKEY(): string {
    return "mlcl_elements:validators";
  }

  /**
   * modified getInstance of di, setting handler to current instance
   * @param  {string}           name [description]
   * @return {Promise<void>}         [description]
   */
  public getInstance(name: string, ...params): any {
    if (_.includes(this.getClasses(), name)) {
      const instance = di.getInstance(name, ...params);
      if (instance && _.includes(Object.keys(instance), "elements")) {
        instance.elements = this;
      }
      this.addCollectionTo(instance);
      return instance;
    } else {
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
  //   const core = di.getInstance('MlclCore');
  //   const registrationStream = core.createStream('elementsRegistration');
  //   const myobs = Observable.from([model]);
  //   myobs = registrationStream.renderStream(myobs);
  //   const regResult = await myobs.toPromise();
  //   return regResult;
  // }

  /**
   * Validator function for the instances
   * @param  {Object}           instance [description]
   * @return {Promise<void>}             [description]
   */
  public validate(instance: object): TSV.IValidatorError[] {
      return (new TSV.Validator()).validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {Element}       element [description]
   * @return {any}                   [description]
   */
  public toDbObject(element: Element, forPopulationLayer: boolean = false): any {
    return this.toDbObjRecursive(element);
  }

  /**
   * Return string array of injectable Element extending classes
   * @return {string[]}                 [description]
   */
  public getClasses(): string[] {
    const result: string[] = [];
    for (const [name, injectable] of di.injectables) {
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
  public toInstance(className: string, data: any): any {
    const instance = this.getInstance(className);
    if (instance) {
      const metakeys = Reflect.getMetadataKeys(Reflect.getPrototypeOf(instance));
      let meta = [];
      for (const metakey of metakeys) {
        if (!metakey.includes("design:")) {
          meta = meta.concat(Reflect.getMetadata(metakey, Reflect.getPrototypeOf(instance)));
        }
      }
      for (const key in data) {
        if (key === "_id" && (key.slice(1) in instance || _.includes(_.map(meta, "property"), key.slice(1)))) {
          instance[key.slice(1)] = data[key];
        } else if ((key in instance || _.includes(_.map(meta, "property"), key))
          && (typeof data[key] !== "object" || !_.isEmpty(data[key]))) {

          instance[key] = data[key];
        }
      }
    }
    this.addCollectionTo(instance);
    return instance;
  }

  public diffObjects(oldObj, newObj) {
    const diff: DiffObject[] = Jsonpatch.compare(newObj, oldObj);
    return diff;
  }

  public revertObject(obj, patches: DiffObject[]) {
    const result = Jsonpatch.apply(obj, patches);
    return result;
  }

  /**
   * Wrapper for instance save
   * @param  {Element[]}                           instances [description]
   * @param  {boolean}                             upsert    [description]
   * @return {Promise<any>}                                  [description]
   */
  public async saveInstances(instances: Element[], upsert: boolean = true): Promise<any> {
    const result = {
      errorCount: 0,
      errors: [],
      successCount:  0,
      successes: [] };
    const dbHandler = di.getInstance("MlclDatabase");
    if (dbHandler && dbHandler.connections) {
      for (const instance of instances) {
        let validationResult = [];
        try {
          validationResult = instance.validate();
        } catch (error) {
          result.errorCount++;
          result.errors.push(error);
        }
        if (validationResult.length === 0) {
          try {
            const response = await dbHandler.persistenceDatabases.save(instance.toDbObject());
            result.successCount++;
            result.successes = result.successes.concat(response.successes);
          } catch (error) {
            result.errorCount++;
            result.errors.push(error);
          }
          const decorators = _.concat(
            Reflect.getMetadata(this.METADATAKEY, Reflect.getPrototypeOf(instance)),
            Reflect.getMetadata(this.METADATAKEY, instance.constructor)).filter((defined) => defined);
          if (!decorators.find((decorator) => {
            return (decorator && decorator.type === ELD.Decorators.NOT_FOR_POPULATION);
          })) {
            try {
              await this.populate(instance);
            } catch (error) {
              const reason = new Error("Population failed");
              (reason as any).object = error;
              delete reason.stack;
              result.errorCount++;
              result.errors.push(reason);
            }
            try {
              await dbHandler.populationDatabases.save(instance.toDbObject());
            } catch (error) {
              if (typeof error.errorCount === "undefined" || error.errorCount > 0) {
                result.errorCount++;
                result.errors.push(error);
              }
            }
          }
        } else {
          result.errorCount += validationResult ? validationResult.length : 1;
          result.errors = result.errors.concat(result.errors, validationResult);
        }
      }
    } else {
      return Promise.reject(new Error("No connected databases."));
    }
    if (result.successCount) {
      return Promise.resolve(result);
    } else {
      return Promise.reject(result);
    }
  }

  /**
   * Populates an object instance
   *
   * @param {Object} obj            object instance to populate
   * @param {string} [properties]   properties to populate; defaults to all
   * @returns {Promise<any>}        populated instance or error
   *
   * @memberOf MlclElements
   */
  public async populate(obj: object, properties?: string): Promise<any> {
    const meta = _.concat(
      Reflect.getMetadata(this.METADATAKEY, Reflect.getPrototypeOf(obj)),
      Reflect.getMetadata(this.METADATAKEY, obj.constructor))
      .filter((defined) => defined);
    const refMeta = meta.filter((entry) => {
      return (entry.type === ELD.Decorators.IS_REF_TO
        && (!properties || _.includes(properties.split(" "), entry.property)));
    });
    const irrelevProps = meta.map((entry) => {
      if (entry.type === ELD.Decorators.NOT_FOR_POPULATION
        && entry.property
        && (!properties || _.includes(properties.split(" "), entry.property))) {

        return entry.property;
      }
    });
    const queryCollections = refMeta.map((entry) => {
      const instance = this.getInstance(entry.value);
      if (instance && !_.includes(irrelevProps, entry.property)) {
        return instance.collection || instance.constructor.collection || instance.constructor.name;
      }
    });
    const queryProperties = refMeta.map((entry) => {
      if (!_.includes(irrelevProps, entry.property)) {
        return entry.property;
      }
    });
    const dbHandler = di.getInstance("MlclDatabase");
    if (dbHandler && dbHandler.connections) {
      try {
        let result = await dbHandler.populate(obj, queryProperties, queryCollections);
        if (_.includes(this.getClasses(), obj.constructor.name)) {
          result = this.toInstance(obj.constructor.name, result);
        }
        for (const prop in result) {
          if (result[prop] && _.includes(this.getClasses(), result[prop].constructor.name)) {
            await this.toInstance(result[prop].constructor.name, result[prop]).populate()
              .then((value) => { result[prop] = value; })
              .catch((error) => { error = error; });
          }
        }
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(new Error("No connected databases."));
    }
  }

  /**
   * Wrapper for instance get
   * @param  {any}                                   query [description]
   * @return {Promise<any>}                                [description]
   */
  public async find(query: any, collection: string): Promise<any> {
    const dbHandler = di.getInstance("MlclDatabase");
    if (dbHandler && dbHandler.connections) {
      try {
        const result = await dbHandler.find(query, collection);
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(new Error("No connected databases."));
    }
  }

  /**
   * Wrapper for instance get by id
   * @param  {any}                                   id [description]
   * @return {Promise<any>}                             [description]
   */
  public async findById(id: any, collection: string): Promise<any> {
    const dbHandler = di.getInstance("MlclDatabase");
    if (dbHandler && dbHandler.connections) {
      const idPattern = dbHandler.connections[0].idPattern || dbHandler.connections[0].constructor.idPattern;
      const query = {};
      query[idPattern] = id;
      try {
        const result = await this.find(query, collection);
        if (result && result[0]) {
          result[0][idPattern] = id;
          return Promise.resolve(result[0]);
        } else {
          return Promise.resolve(undefined);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(new Error("No connected databases."));
    }
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj                 [description]
   * @param  {boolean} nested              [description]
   * @return any                           [description]
   */
  protected toDbObjRecursive(obj: any, idPattern: string = "id"): any {
    let objectValidatorDecorators;
    let result;
    if (_.isArray(obj)) {
      result = objectValidatorDecorators = [];
    } else {
      result = {};
      // get all validator decorators
      objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, Reflect.getPrototypeOf(obj));
    }
    const propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, (o: any) => {
      // map by property name
      return o.property;
    });
    for (const key in obj) {
      if (obj.hasOwnProperty(key)
        && obj[key] !== undefined
        && (propertiesValidatorDecorators[key]
        || _.isArray(obj))) {
          // check for non-prototype, validator-decorated property
        if (_.isArray(obj[key])) {
          result[key] = this.toDbObjRecursive(obj[key], idPattern);
        } else if (typeof obj[key] === "object") { // property is object
          if (obj[key][idPattern]) { // property has _id-property itself
            result[key] = obj[key][idPattern];
          } else if (!(idPattern in obj[key])) { // resolve property
            result[key] = this.toDbObjRecursive(obj[key], idPattern);
          }
        } else if (typeof obj[key] !== "function") {
          result[key] = obj[key];
        }
      }
    }
    this.addCollectionTo(result, obj);
    return result;
  }

  protected addCollectionTo(target: object, model?: object) {
    if (!model) {
      model = target;
    }
    const collectionDecorator = _.find(
      Reflect.getMetadata(this.METADATAKEY, model.constructor),
      ["type", ELD.Decorators.COLLECTION]);
    if ((collectionDecorator || (model as any).collection || (model as any).constructor.collection)
      && ! (target as any).collection) {

      // check for decorator
      if (collectionDecorator) {
        Object.defineProperty(target, "collection", {
          configurable: true, get(): string {
            return (collectionDecorator as any).value;
          },
        });
      }
      // other getters have priority -> continue anyway
      const classCollectionDescriptor = Object.getOwnPropertyDescriptor(model.constructor, "collection");
      // check for static getter on class
      if (classCollectionDescriptor && typeof classCollectionDescriptor.get === "function") {
        Object.defineProperty(target, "collection", classCollectionDescriptor);
      }
      const protoCollectionDescriptor = Object.getOwnPropertyDescriptor(Reflect.getPrototypeOf(model), "collection");
      // check for getter on prototype
      if (protoCollectionDescriptor && typeof protoCollectionDescriptor.get === "function") {
        Object.defineProperty(target, "collection", protoCollectionDescriptor);
      }
      const instanceCollectionDescriptor = Object.getOwnPropertyDescriptor(model, "collection");
      // check for value on instance
      if (instanceCollectionDescriptor) {
        Object.defineProperty(target, "collection", instanceCollectionDescriptor);
      }
    }
    // make sure there is always one collection getter
    if (!(target as any).collection) {
      Object.defineProperty(target, "collection", {
        configurable: true, get(): string {
          return model.constructor.name;
        },
      });
    }
  }
}

import {Element} from "./Element";
