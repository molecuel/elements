"use strict";
import {MlclConfig, MlclCore} from "@molecuel/core";
import {MlclDatabase} from "@molecuel/database";
import {di, injectable} from "@molecuel/di";
import * as TSV from "@molecuel/tsvalidate";
import * as Jsonpatch from "fast-json-patch";
import * as _ from "lodash";
import "reflect-metadata";
import {DiffObject} from "./DiffObject";
import * as ELD from "./ElementDecorators";

@injectable
export class MlclElements {
  private get METADATAKEY(): string {
    return "mlcl_elements:decorators";
  }
  public dbHandler: MlclDatabase;

  constructor() {
    di.bootstrap(MlclCore, MlclConfig);
    this.dbHandler = di.getInstance("MlclDatabase");
    if (this.dbHandler) {
      const configHandler = di.getInstance("MlclConfig");
      this.dbHandler.addDatabasesFrom(configHandler.getConfig());
    }
  }

  /**
   * Initialize this instance's properties.
   *
   * @returns {(Promise<boolean|Error>)}
   *
   * @memberOf MlclElements
   */
  public async init(): Promise<boolean|Error> {
    try {
      await this.dbHandler.init();
      if (this.dbHandler.connections) {
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Get an instance of a injectable, Element inheriting class
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
   * Validator an instance based on registerered decorators
   * @param  {Object}           instance [description]
   * @return {Promise<void>}             [description]
   */
  public validate(instance: object): TSV.IValidatorError[] {
      return (new TSV.Validator()).validate(instance);
  }

  /**
   * Convert object to one which can be saved in database
   * @param  {Element}       element [description]
   * @return {any}                   [description]
   */
  public toDbObject(element: object, forPopulationLayer: boolean = false): any {
    return this.toDbObjRecursive(element, forPopulationLayer);
  }

  /**
   * Return string array of injectable, Element inheriting classes
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
   * Applies specified decorator functions to given property of the target or to the target itself
   *
   * @param {object} target
   * @param {string} [propertyName]
   * @param {...Array<(...args: any[]) => any>} decorators
   *
   * @memberOf MlclElements
   */
  public applyDecorators(target: object, propertyName?: string, ...decorators: Array<(...args: any[]) => any>) {
    for (const decorator of decorators) {
      let actualTarget;
      if (typeof Reflect.getPrototypeOf(target) === "function") {
        actualTarget = target;
        if (typeof actualTarget === "function") {
          actualTarget = actualTarget.prototype;
        }
      } else {
        actualTarget = Reflect.getPrototypeOf(target);
      }
      if (typeof propertyName === "undefined") {
        actualTarget = actualTarget.constructor;
      }
      decorator(actualTarget, propertyName);
    }
  }

  /**
   * Return new instance of requested class based on supplied data
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
          && !_.isEmpty(data[key])) {
          if (typeof data[key] === "object" && typeof instance[key] === "object") {
            if (_.includes(this.getClasses(), instance[key].constructor.name)) {
              instance[key] = this.toInstance(instance[key].constructor.name, data[key]);
            } else {
              instance[key] = Object.assign(instance[key], data[key]);
            }
          } else {
            instance[key] = data[key];
          }
        } else {
          instance[key] = data[key];
        }
      }
      this.addCollectionTo(instance);
    }
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
   * Save given instances to their respective target
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
    if (this.dbHandler && this.dbHandler.connections) {
      let testflag = false;
      for (const instance of instances) {
        if (instance.constructor.name === "Engine") {
          testflag = true;
        }
        let validationResult = [];
        try {
          validationResult = instance.validate();
        } catch (error) {
          result.errorCount++;
          result.errors.push(error);
        }
        if (validationResult.length === 0) {
          try {
            const response = await this.dbHandler.persistenceDatabases.save(instance.toDbObject());
            result.successCount++;
            result.successes = result.successes.concat(response.successes);
          } catch (error) {
            result.errorCount++;
            result.errors.push(error);
          }
          const decorators = _.concat(
            Reflect.getMetadata(this.METADATAKEY, Reflect.getPrototypeOf(instance)),
            Reflect.getMetadata(this.METADATAKEY, instance.constructor)).filter((defined) => defined);
          const check = decorators.find((decorator) => {
            return (decorator && decorator.type === ELD.Decorators.NOT_FOR_POPULATION && !decorator.property);
          });
          if (!check) {
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
              await this.dbHandler.populationDatabases.save(instance.toDbObject(true));
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
        testflag = false;
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
   * Populates an instance
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
    }).filter((defined) => defined);
    const queryCollections = refMeta.map((entry) => {
      const instance = this.getInstance(entry.value);
      if (instance && !_.includes(irrelevProps, entry.property)) {
        return instance.collection || instance.constructor.collection || instance.constructor.name;
      }
    }).filter((defined) => defined);
    const queryProperties = refMeta.map((entry) => {
      if (!_.includes(irrelevProps, entry.property)) {
        return entry.property;
      }
    }).filter((defined) => defined);
    if (this.dbHandler && this.dbHandler.connections) {
      try {
        let result = await this.dbHandler.populate((obj as any).toDbObject(), queryProperties, queryCollections);
        if (_.includes(this.getClasses(), obj.constructor.name)) {
          result = this.toInstance(obj.constructor.name, result);
        }
        for (const prop in result) {
          if (result[prop] && _.includes(this.getClasses(), result[prop].constructor.name)) {
            await result[prop].populate();
          } else if (_.isArray(result[prop])) {
            const reference = _.find(refMeta, ["property", prop]);
            if (reference && reference.value && _.includes(this.getClasses(), reference.value)) {
              for (const index in result[prop]) {
                if (Reflect.has(result[prop], index)) {
                  result[prop][index] = this.toInstance(reference.value, result[prop][index]);
                  await result[prop][index].populate();
                }
              }
            }
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
   * Find documents via query and primary connection
   * @param  {any}                                   query [description]
   * @return {Promise<any>}                                [description]
   */
  public async find(query: any, collection: string): Promise<any> {
    if (this.dbHandler && this.dbHandler.connections) {
      try {
        const result = await this.dbHandler.find(query, collection);
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(new Error("No connected databases."));
    }
  }

  /**
   * Find single document via Id and primary connection
   * @param  {any}                                   id [description]
   * @return {Promise<any>}                             [description]
   */
  public async findById(id: any, collection: string): Promise<any> {
    if (this.dbHandler && this.dbHandler.connections) {
      const idPattern = this.dbHandler.connections[0].idPattern || this.dbHandler.connections[0].constructor.idPattern;
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
  protected toDbObjRecursive(obj: any, stripFunctionsOnly: boolean = false, idPattern: string = "id"): any {
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
          result[key] = this.toDbObjRecursive(obj[key], stripFunctionsOnly, idPattern);
        } else if (typeof obj[key] === "object") { // property is object
          if (obj[key][idPattern] && !stripFunctionsOnly) { // property has _id-property itself
            result[key] = obj[key][idPattern];
          } else if (!(idPattern in obj[key]) || stripFunctionsOnly) { // resolve property
            result[key] = this.toDbObjRecursive(obj[key], stripFunctionsOnly, idPattern);
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
        // const setter = (setterValue) => {
        //   Object.defineProperty(this, "collection", {
        //     configurable: true, get(): string {
        //       return setterValue;
        //     }, set(value) { setter(value); } });
        // };
        Object.defineProperty(target, "collection", {
          configurable: true, get(): string {
            return (collectionDecorator as any).value;
        }/*, set(value) { (target as any).collection = value; } */});
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
      }/*, set(value) { (target as any).collection = value; }*/ });
    }
  }
}

import {Element} from "./Element";
