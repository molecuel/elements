'use strict';
import 'reflect-metadata';
import * as _ from 'lodash';
import * as TSV from 'tsvalidate';

import * as ELD from './classes/ElementDecorators';
import * as Interfaces from './Interfaces';
import { Element } from './classes/Element';
export { Element as Element } from './classes/Element';
// @todo: export all decorators in single accessor

export class Elements {
  public static loaderversion = 2;

  private elementStore: Map<string, Interfaces.IElement>;
  private databases: Map<string, Interfaces.IDatabaseAdapter>;

  constructor(mlcl?: any, config?: any) {
    this.elementStore = new Map();
    this.databases = new Map();
  }

  /**
   * Register a database instance
   * @param {string} key       [description]
   * @param {any}    database  [description]
   */
  public async registerDatabase(key: string, database: any): Promise<void> {
    this.databases.set(key, database);
  }

  /**
   * Register a class instance
   * @param {string} name       [description]
   * @param {any}    definition [description]
   */
  public async registerClass(name: string, definition: any, registerAsModel: boolean = false): Promise<void> {
    definition.elements = this;
    this.elementStore.set(name, definition);
    if(registerAsModel) {
      for (let [key, database] of this.databases) {
        database.register(this.getClassInstance(name)); // instance or model??
      }
    }
  }

  /**
   * Get a registered class
   * @param  {string}   name [description]
   * @return {Interfaces.Interfaces.IElement}      [description]
   */
  public getClass(name: string): Interfaces.IElement {
    return this.elementStore.get(name);
  }

  /**
   * Return a class instance
   * @param  {string}   name [description]
   * @return {Interfaces.IElement}      [description]
   */
  public getClassInstance(name: string): any {
    let elementClass: any = this.elementStore.get(name);
    let classInstance: Interfaces.IElement = new elementClass();
    classInstance.setFactory(this);
    return classInstance;
  }

  /**
   * Validator function for the instances
   * @param  {Interfaces.IElement}      instance [description]
   * @return {Promise<void>}          [description]
   */
  public validate(instance: Object): TSV.IValidatorError[] {
    let validator = new TSV.Validator();
    return validator.validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {Interfaces.IElement} element [description]
   * @return {any}                 [description]
   */
  public toDbObject(element: Interfaces.IElement): any {
    return this.toDbObjRecursive(element, false);
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj     [description]
   * @param  {boolean} nested  [description]
   * @return any               [description]
   */
  protected toDbObjRecursive(obj: Object, nested: boolean): any {
    let that = obj;
    let result: any = {};
    let objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, that);
    let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function(o: any) {
      return o.property;
    });
    for (let key in that) {
      // check for non-prototype, validator-decorated property
      if (Object.hasOwnProperty.call(that, key)
        && that[key] !== undefined
        && propertiesValidatorDecorators[key]) {
        // @todo: use key from IDatabaseAdapter
        // check for _id
        if (key === '_id'
          && !nested) {

          result[key] = that[key];
        }
        // check if the property is an object
        else if (typeof that[key] === 'object') {

          result[key] = this.toDbObjRecursive(that[key], true);
        }
        else if (typeof that[key] !== 'function') {

          result[key] = that[key];
        }
      }
    }
    return result;
  }

  /**
   * Check object for defined IDocuments properties
   * @param  {any}          obj   [description]
   * @return {boolean}            [description]
   */
  protected containsIDocuments(obj: any): boolean {
    let template: Interfaces.IDocuments = {
      collection: 'collectionName',
      documents: []
    };
    for (let prop in template) {
      if (!(prop in obj)) {
        return false;
      }
    }
    return true;
  }

  /**
   * validate multiple instances of Interfaces.IElement
   * @param  {Interfaces.IElement[]}   instances [Array of instances which implements Interfaces.IElement]
   * @return {Promise<any>}                      [description]
   */
  protected validateAndSort(instances: Interfaces.IElement[]): Promise<any> {
    let errors: TSV.IValidatorError[] = [];
    let collections: any = {};

    // validate all instances and sort transformed objects into array based collections per model name;
    for (let instance of instances) {
      // get the metadata - ELD.METADATAKEY is defined in elementDecorators.ts
      let metadata = Reflect.getMetadata(ELD.METADATAKEY, instance.constructor);
      let collectionName: string = instance.constructor.name;
      _.each(metadata, (entry) => {
        if ('type' in entry
          && entry.type === ELD.Decorators.USE_PERSISTANCE_TABLE
          && 'value' in entry
          && 'property' in entry
          && entry.property === instance.constructor.name) {

          collectionName = entry.value;
        }
      });
      if (instance.validate().length === 0) {
        if (!collections[collectionName]) {
          collections[collectionName] = [instance.toDbObject()];
        }
        else {
          collections[collectionName].push(instance.toDbObject());
        }
      }
      else {
        errors = errors.concat(instance.validate());
      }
    }
    if (errors.length > 0) {
      return Promise.reject(errors);
    }
    else {
      return Promise.resolve(collections);
    }
  }

  /**
   * Wrapper for instance save
   * @param  {Interfaces.IElement[]}                          instances [description]
   * @param  {boolean}                             upsert    [description]
   * @return {Promise<any>}                                  [description]
   */
  public async saveInstances(instances: Interfaces.IElement[], upsert: boolean = false): Promise<any> {
    // check if there is only one instance 
    if (instances.length === 1) {
      // check if there were errors on validation
      if (instances[0].validate().length > 0) {
        return Promise.reject(instances[0].validate());
      } else {
        let metadata = Reflect.getMetadata(ELD.METADATAKEY, instances[0].constructor);
        let collectionName: string = instances[0].constructor.name;
        _.each(metadata, (entry) => {
          if ('type' in entry
            && entry.type === ELD.Decorators.USE_PERSISTANCE_TABLE
            && 'value' in entry
            && 'property' in entry
            && entry.property === instances[0].constructor.name) {

            collectionName = entry.value;
          }
        });
      }
    }
    else {
      return this.validateAndSort(instances).then((res) => {
        // @todo: save all to databases
      });
    }
  }

  /**
   * Build Mapping for index based on applied decorators
   * @param  {any}     model  [description]
   * @return {Object}         [description]
   */
  protected getMappingProperties(model: any): Object {
    let result = {};
    let propertyDecorators: any[] = _.concat(Reflect.getMetadata(TSV.METADATAKEY, new model()), Reflect.getMetadata(ELD.METADATAKEY, new model()));
    _.each(propertyDecorators, (decorator) => {
      if (decorator && _.find(propertyDecorators, function(checkedDecorator: any) {
        return (checkedDecorator
          && checkedDecorator.property === decorator.property
          && checkedDecorator.type === ELD.Decorators.INDEX_MAPPING
          && checkedDecorator.property !== model.name
          && checkedDecorator.property !== '_id');
      }) && !_.find(propertyDecorators, function(checkedDecorator: any) {
        return (checkedDecorator
          && checkedDecorator.property === decorator.property
          && checkedDecorator.type === ELD.Decorators.NOT_FOR_POPULATION
          && checkedDecorator.property !== model.name
          && checkedDecorator.property !== '_id');
      })) {
        if (!result['properties']) {
          result = { properties: {} };
        }
        if (_.find(propertyDecorators, (checkedDecorator) => {
          return (checkedDecorator
            && checkedDecorator.property === decorator.property
            && checkedDecorator.type === TSV.DecoratorTypes.NESTED);
        })) {
          result['properties'][decorator.property] = this.getMappingProperties(Reflect.getMetadata('design:type', new model(), decorator.property));
        }
        else if (!result['properties'][decorator.property]) {
          result['properties'][decorator.property] = { type: _.get(this.getPropertyType(model, decorator.property, propertyDecorators), decorator.property) };
        }
      }
    });
    return result;
  }

  /**
   * Return an object with the Elasticsearch required type for any property
   * @param  {any}    model       [description]
   * @param  {string} property    [description]
   * @param  {any}    decorators  [description]
   * @return {Object}             [description]
   */
  protected getPropertyType(model: any, property: string, decorators: any): Object {
    let result = {};
    _.each(decorators, (decorator) => {
      if (decorator && !result[property]
        && decorator.property === property) {

        switch (decorator.type) {
          case TSV.DecoratorTypes.IS_INT:
            result[property] = 'integer';
            break;
          case TSV.DecoratorTypes.IS_FLOAT:
          case TSV.DecoratorTypes.IS_DECIMAL:
            result[property] = 'float';
            break;
          case TSV.DecoratorTypes.IP_ADDRESS:
          case TSV.DecoratorTypes.MAC_ADDRESS:
          case TSV.DecoratorTypes.EMAIL:
          case TSV.DecoratorTypes.ALPHA:
            result[property] = 'string';
            break;
          case TSV.DecoratorTypes.DATE:
          case TSV.DecoratorTypes.DATE_AFTER:
          case TSV.DecoratorTypes.DATE_BEFORE:
          case TSV.DecoratorTypes.DATE_ISO8601:
            result[property] = 'date';
            break;
        }
      }
    });
    if (!result[property]) {
      switch (Reflect.getMetadata('design:type', new model(), property).name) {
        // declared type: string
        case 'String':
          result[property] = 'string';
          break;
        // declared type: number
        case 'Number':
          result[property] = 'integer';
          break;
        // declared type: boolean
        case 'Boolean':
          result[property] = 'boolean';
          break;
        // declared type: any
        case 'Object':
        // declared type: object
        default:
          result[property] = 'object';
          break;
      }
    }
    return result;
  }

}
