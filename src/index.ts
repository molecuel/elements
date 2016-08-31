'use strict';
import mongodb = require('mongodb');
import elasticsearch = require('elasticsearch');
import 'reflect-metadata';
import * as _ from 'lodash';
import * as TSV from 'tsvalidate';

import * as ELD from './customDecorators';
import { ElasticOptions } from './classes/ElasticOptions';
import { IElement } from './interfaces/IElement';
import { IDocuments } from './interfaces/IDocuments';
import { IIndexSettings } from './interfaces/IIndexSettings';
// import { Element } from './classes/Element';
export { Element as Element } from './classes/Element';


export class Elements {
  public static loaderversion = 2;

  private mongoClient: mongodb.MongoClient;
  private mongoConnection: Promise<mongodb.Db>;
  private elasticClient: elasticsearch.Client;
  private elasticConnection: PromiseLike<elasticsearch.Client>;
  private elasticOptions: ElasticOptions;
  private elementStore: Map<string, IElement>;

  constructor(mlcl?: any, config?: any) {
    this.elementStore = new Map();
    // @todo Get from config object

    this.elasticOptions = new ElasticOptions();
    this.elasticOptions.url = 'http://localhost:9200';
    this.elasticOptions.loglevel = 'trace';
    this.elasticOptions.timeout = 5000;

    this.mongoClient = mongodb.MongoClient;
    this.elasticClient = new elasticsearch.Client({
      host: 'localhost:9200',
      log: 'trace'
    });
  }

  /**
   * Connect function to initialize the database connections to elastic and mongodb
   * @return {[Promise]}
   */
  public async connect(): Promise<void> {
    await this.connectElastic();
    await this.connectMongo();
  }

  /**
   * Register a class instance
   * @param {string} name       [description]
   * @param {any}    definition [description]
   */
  public async registerClass(name: string, definition: any, indexSettings?: IIndexSettings): Promise<void> {
    definition.elements = this;
    this.elementStore.set(name, definition);
    return await this.registerIndex(name, definition, indexSettings);
  }

  /**
   * Get a registered class
   * @param  {string}   name [description]
   * @return {IElement}      [description]
   */
  public getClass(name: string): IElement {
    return this.elementStore.get(name);
  }

  /**
   * Return a class instance
   * @param  {string}   name [description]
   * @return {IElement}      [description]
   */
  public getClassInstance(name: string): any {
    let elementClass: any = this.elementStore.get(name);
    let classInstance: IElement = new elementClass();
    classInstance.setFactory(this);
    return classInstance;
  }

  /**
   * Validator function for the instances
   * @param  {IElement}      instance [description]
   * @return {Promise<void>}          [description]
   */
  public validate(instance: Object): TSV.IValidatorError[] {
    let validator = new TSV.Validator();
    return validator.validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {IElement} subElement [description]
   * @return {any}                 [description]
   */
  public toDbObject(element: IElement): any {
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
   * Close mongo connection
   * @return {Promise<any>} [description]
   */
  public mongoClose(): Promise<any> {
    return this.getMongoConnection().close();
  }

  /**
   * Return the mongo connection
   * @return {any} [description]
   */
  protected getMongoConnection(): any {
    return this.mongoConnection;
  }

  /**
   * Return the mongo connection
   * @return {any} [description]
   */
  protected getElasticConnection(): any {
    return this.elasticClient;
  }

  /**
   * Get all mongo collections
   * @return {Promise<any>} [description]
   */
  public async getMongoCollections(): Promise<any> {
    return await this.getMongoConnection().collections();
  }

  /**
   * Check object for defined IDocuments properties
   * @param  {any}          obj   [description]
   * @return {boolean}            [description]
   */
  protected containsIDocuments(obj: any): boolean {
    let template: IDocuments = {
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
   * Get documents from MongoDb based on query
   * @param  {IElement}     model [description]
   * @param  {any}          query [description]
   * @return {Promise<any>}       [description]
   */
  public async findByQuery(collection: string | IElement, query?: any, limit?: number): Promise<any> {
    let input: any = collection;
    let collectionName: string;
    if (typeof input === 'string') {
      collectionName = input;
    }
    else if ('prototype' in input) {
      collectionName = input.prototype.constructor.name;
    }
    else {
      collectionName = input.constructor.name;
    }
    return await this.getMongoConnection().collection(collectionName).find(query).limit(limit || 0).toArray().then((res) => {
      return this.toElementArray({ collection: collectionName, documents: res });
    });
  }

  /**
   * Get Element based object from MongoDb by supplied collection and Id
   * @param {number | string | IElement} id          [description]
   * @param {string | IElement}          collection  [description]
   * @return  [description]
   */
  public async findById(id: number | string | IElement, collection?: string | IElement): Promise<any> {
    let inputColl: any = collection;
    let inputId: any = id;
    let collectionName: string;
    if (typeof collection !== 'undefined') {
      if (typeof inputColl === 'string') {
        collectionName = inputColl;
      }
      else if ('prototype' in inputColl) {
        collectionName = inputColl.prototype.constructor.name;
      }
      else {
        collectionName = inputColl.constructor.name;
      }
    }
    else if (typeof inputId !== 'number'
      && typeof inputId !== 'string') {
      if ('constructor' in inputId) {
        collectionName = id.constructor.name;
      }
      if ('_id' in inputId) {
        inputId = inputId._id;
      }
      else {
        return Promise.reject(new Error('No valid id supplied.'));
      }
    }
    else {
      return Promise.reject(new Error('Could not determine target collection.'));
    }
    return await this.findByQuery(collectionName, { _id: inputId }, 1);
  }

  /**
   *
   * @param   [description]
   * @return  [description]
   */
  public async search(query: Object): Promise<any> {
    let input: any = query;
    if (this.elasticOptions.prefix) {
      if (!input.index) {
        input.index = this.elasticOptions.prefix + '-*';
      }
      else if (!input.index.match(new RegExp('^' + this.elasticOptions.prefix + '-'))) {
        input.index = this.elasticOptions.prefix + '-' + input.index;
      }
    }
    return await this.getElasticConnection().search(input);
  }

  /**
   * Wrapper for mongodb to return a promise needed by the async function
   * @return {Promise<any>} [Returns the connection promise]
   */
  protected mongoConnectWrapper(): Promise<any> {
    return this.mongoClient.connect('mongodb://localhost/elements?connectTimeoutMS=10000&socketTimeoutMS=10000', { promiseLibrary: Promise });
  }

  /**
   * Async function for the mongo database connection
   * @return {[type]} [description]
   */
  protected async connectMongo(): Promise<void> {
    this.mongoConnection = await this.mongoConnectWrapper();
  }

  /**
   * Return the elasticsearch connection
   * @return {PromiseLike<any>} [description]
   */
  protected elasticConnectWrapper(): PromiseLike<any> {
    return this.elasticClient.ping({
      requestTimeout: this.elasticOptions.timeout,
      hello: 'elasticsearch'
    });
  }

  /**
   * Async elasticsearch connection function
   * @return {Promise<void>} [Return the promise for the elasticsearch connection]
   */
  protected async connectElastic(): Promise<void> {
    this.elasticConnection = await this.elasticConnectWrapper();
  }

  /**
   * Bulk insert of mongodb documents
   * @param  {Object[]}                            instances      [description]
   * @param  {string}                              collectionName [description]
   * @param  {mongodb.CollectionInsertManyOptions} options        [description]
   * @return {Promise<any>}                                       [description]
   */
  protected async updateMongoElements(instances: IElement[], collectionName: string, upsert?: boolean): Promise<any> {
    if (!upsert) {
      upsert = false;
    }
    let bulk = await this.getMongoConnection().collection(collectionName).initializeUnorderedBulkOp();
    _.each(instances, (instance) => {
      if (upsert) {
        bulk.find({ _id: instance._id }).upsert().updateOne(instance);
      }
      else {
        bulk.find({ _id: instance._id }).updateOne(instance);
      }
    });
    return await bulk.execute();
  }

  /**
   * Insert single mongodb document
   * @param  {Object}                             instance       [description]
   * @param  {string}                             collectionName [description]
   * @param  {mongodb.CollectionInsertOneOptions} options        [description]
   * @return {Promise<any>}                                      [description]
   */
  protected async updateMongoElementSingle(instance: IElement, collectionName: string, upsert?: boolean): Promise<any> {
    if (!upsert) {
      upsert = false;
    }
    return await this.getMongoConnection().collection(collectionName).updateOne({ _id: instance._id }, instance, { upsert: upsert });
  }

  /**
   * validate multiple instances of IElement
   * @param  {IElement[]}   instances [Array of instances which implements IElement]
   * @return {Promise<any>}           [description]
   */
  protected validateAndSort(instances: IElement[]): Promise<any> {
    let errors: TSV.IValidatorError[] = [];
    let collections: any = {};

    // validate all instances and sort transformed objects into array based collections per model name;
    for (let instance of instances) {

      let metadata = Reflect.getMetadata(ELD.METADATAKEY, instance.constructor);
      let collectionName: string = instance.constructor.name;
      _.each(metadata, (entry) => {
        if ('type' in entry
          && entry.type === ELD.Decorators.USE_MONGO_COLLECTION
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
   * Bulk update/upsert of elements into respective collection
   * @param  {Object}                              collections [description]
   * @param  {boolean}                             upsert      [description]
   * @return {Promise<any>}                                    [description]
   */
  protected async mongoUpdate(collections: Object, upsert?: boolean): Promise<any> {
    let result: any[] = [];
    if (!upsert) {
      upsert = false;
    }
    for (let collectionName in collections) {
      let collectionFullName: string = collectionName;
      let prom = await this.updateMongoElements(collections[collectionName], collectionFullName, upsert);
      result.push({ [collectionName]: prom });
    }
    return Promise.resolve(result);
  }

  /**
   * Wrapper for instance save
   * @param  {IElement[]}                          instances [description]
   * @param  {boolean}                             upsert    [description]
   * @return {Promise<any>}                                  [description]
   */
  public async saveInstances(instances: IElement[], upsert?: boolean): Promise<any> {
    if (!upsert) {
      upsert = false;
    }
    if (instances.length === 1) {
      if (instances[0].validate().length > 0) {
        return Promise.reject(instances[0].validate());
      }
      else {
        let metadata = Reflect.getMetadata(ELD.METADATAKEY, instances[0].constructor);
        let collectionName: string = instances[0].constructor.name;
        _.each(metadata, (entry) => {
          if ('type' in entry
            && entry.type === ELD.Decorators.USE_MONGO_COLLECTION
            && 'value' in entry
            && 'property' in entry
            && entry.property === instances[0].constructor.name) {

            collectionName = entry.value;
          }
        });
        let that = this;
        return await this.updateMongoElementSingle(
          instances[0].toDbObject(),
          collectionName,
          upsert).then(async function(mres) {
            if (mres
              && ((mres.upsertedId && instances[0]._id === mres.upsertedId._id)
                || (mres.modified && mres.modified >= 1))) {

              await that.updateElasticElementSingle(instances[0], upsert).then((eres) => {
                // @todo bind resolve in outer resolve
                return eres;
              });
            }
            return [{ result: mres.result, ops: mres.ops, upsertedCount: mres.upsertedCount, upsertedId: mres.upsertedId }];
          });
      }
    }
    else {
      return this.validateAndSort(instances).then((res) => {
        return this.mongoUpdate(res, upsert);
      });
    }
  }

  /**
   * Index a single Element based object, if it is not yet indexed; return  response
   * @param  {IElement} element [description]
   * @return {Promise<any>}     [description]
   */
  public async createElastic(element: IElement): Promise<any> {
    let _body = element.toDbObject();
    delete _body._id;
    return await this.getElasticConnection().create({
      index: this.getIndexName(element),
      type: element.constructor.name,
      id: element._id,
      body: _body
    });
  }

  /**
   * Update or upsert a single Element based object in Elasticsearch; return response
   * @param  {IElement} element   [description]
   * @param  {boolean}  [upsert]  [description]
   * @return {Promise<any>} [description]
   */
  protected async updateElasticElementSingle(element: IElement, upsert?: boolean): Promise<any> {
    let _body = element.toDbObject();
    delete _body._id;
    if (!upsert) {
      upsert = false;
    }
    if (upsert) {
      return await this.getElasticConnection().index({
        index: this.getIndexName(element),
        type: element.constructor.name,
        id: element._id,
        body: _body
      });
    }
    else {
      return await this.getElasticConnection().update({
        index: this.getIndexName(element),
        type: element.constructor.name,
        id: element._id,
        body: _body
      });
    }
  }

  /**
   * Create an index and coresponding mapping for a supplied class
   * @param  {any} definition  [description]
   * @return {Promise<any>}    [description]
   */
  protected async registerIndex(name: string, definition: any, indexSettings?: IIndexSettings): Promise<any> {
    let _type: string = definition.prototype.constructor.name;
    let objectDecorators = _.concat(Reflect.getMetadata(TSV.METADATAKEY, this.getClassInstance(name)), Reflect.getMetadata(ELD.METADATAKEY, this.getClassInstance(name)));
    // console.log(objectDecorators);
    let decoratedProperties = _.keyBy(objectDecorators, function(o: any) {
      if (o && o.type !== ELD.Decorators.NOT_FOR_ELASTIC
        && o.property !== definition.prototype.constructor.name
        && o.property !== '_id') {
        return o.property;
      }
    });
    let propertyType = this.getPropertyType(definition, objectDecorators);
    let configuration = {
      settings: {},
      mappings: {}
    };
    for (let setting in indexSettings) {
      configuration['settings'][setting] = indexSettings[setting];
    }
    configuration.mappings[_type] = { properties: {} };
    return await this.getElasticConnection().indices.create({
      index: this.getIndexName(this.getClassInstance(name)),
      body: configuration
    });
  }

  // protected getMappingProperties(decoratedProperties: any, type: string): Object {
  //   let result = { properties: {} };
  //   let propertyType = this.getPropertyType(name, definition, objectDecorators);
  //   _.each(decoratedProperties, (decorator) => { // @todo recursive rework for nested obj
  //     if (decorator && !configuration.mappings[_type].properties[decorator]) {
  //       configuration.mappings[_type].properties[decorator.property] = {
  //         type: _.get(propertyTypes, decorator.property)
  //       };
  //     }
  //   });
  // }

  /**
   * Return an object with the Elasticsearch required type for each property
   * @param   [description]
   * @return  [description]
   */
  protected getPropertyType(source: any, decorators: any): Object {
    let result = {};
    _.each(decorators, (decorator) => {
      if (decorator && !result[decorator.property]
        && decorator.property !== source.prototype.constructor.name) {

        switch (decorator.type) {
          case TSV.DecoratorTypes.IS_INT:
            result[decorator.property] = 'integer';
            break;
          case TSV.DecoratorTypes.IS_FLOAT:
          case TSV.DecoratorTypes.IS_DECIMAL:
            result[decorator.property] = 'float';
            break;
          case TSV.DecoratorTypes.IP_ADDRESS:
          case TSV.DecoratorTypes.MAC_ADDRESS:
          case TSV.DecoratorTypes.EMAIL:
          case TSV.DecoratorTypes.ALPHA:
            result[decorator.property] = 'string';
            break;
          case TSV.DecoratorTypes.DATE:
          case TSV.DecoratorTypes.DATE_AFTER:
          case TSV.DecoratorTypes.DATE_BEFORE:
          case TSV.DecoratorTypes.DATE_ISO8601:
            result[decorator.property] = 'date';
            break;
          case TSV.DecoratorTypes.NESTED:
            console.log('HERE BE DRAGONS!');
            console.log('TARGETING ' + decorator.property + ' OF ' + source + ' -> ' + source[decorator.property]);
            console.log('TARGETING ' + decorator.property + ' OF ' + source.prototype + ' -> ' + source.prototype[decorator.property]);
            // this.getPropertyType(source[decorator.property]);
            // result[decorator.property] = 'nested';
            break;
          default:
            switch (Reflect.getMetadata('design:type', new source(), decorator.property).name) {
              // declared type: string
              case 'String':
                result[decorator.property] = 'string';
                break;
              // declared type: number
              case 'Number':
                result[decorator.property] = 'integer';
                break;
              // declared type: boolean
              case 'Boolean':
                result[decorator.property] = 'boolean';
                break;
              // declared type: any
              case 'Object':
              // declared type: object
              default:
                result[decorator.property] = 'object';
                break;
            }
            break;
        }
      }
    });
    return result;
  }

  /**
   * Returns the index name for a given Element based Object
   * @param  {IElement} element [description]
   * @return {string}           [description]
   */
  protected getIndexName(element: IElement): string {
    if (this.elasticOptions.prefix) {
      return (this.elasticOptions.prefix + '-' + element.constructor.name).toLowerCase();
    }
    else {
      return element.constructor.name.toLowerCase();
    }
  }

  /**
   * Convert document search result to array of Element objects
   * @param  {IDocuments}   collection [description]
   * @return {Promise<any>}            [description]
   */
  protected toElementArray(collection: IDocuments): Promise<any> {
    let that: any = this;
    let result: any[] = [];
    if (that.containsIDocuments(collection)) {
      // build array of collection based elements
      for (let i = 0; i < collection.documents.length; i++) {
        let currDoc: any = collection.documents[i];
        let mappedName;
        this.elementStore.forEach((value, key, map) => {
          let constr: any = value;
          if (constr && !mappedName && constr.name.toLowerCase() === collection.collection.toString().toLowerCase()) {
            mappedName = key;
          }
        });
        result.push(that.getClassInstance(mappedName));
        for (let key in currDoc) {
          result[i][key] = currDoc[key];
        }
      }
      return Promise.resolve(result);
    }
    else {
      return Promise.reject(new Error('Could not determine class'));
    }
  }
}
