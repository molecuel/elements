'use strict';
import mongodb = require('mongodb');
import elasticsearch = require('elasticsearch');
import 'reflect-metadata';
import * as _ from 'lodash';
import * as TSV from 'tsvalidate';

import { ElasticOptions } from './classes/ElasticOptions';
import { IElement } from './interfaces/IElement';
import { IDocuments } from './interfaces/IDocuments';
import { Element } from './classes/Element';
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
  public registerClass(name: string, definition: any): void {
    definition.elements = this;
    this.elementStore.set(name, definition);
  }

  /**
   * Get a registered class
   * @param  {string}   name [description]
   * @return {IElement}      [description]
   */
  public getClass(name: string): IElement {
    return this.elementStore.get(name || 'element');
  }

  /**
   * Return a class instance
   * @param  {string}   name [description]
   * @return {IElement}      [description]
   */
  public getClassInstance(name: string): any {
    let elementClass: any = this.elementStore.get(name || 'element');
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
   * Get a specific mongo collection
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
  public containsIDocuments(obj: any): boolean {
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
   * Get documents based on query
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
    return await this.findByQuery(collectionName, { _id: inputId }, 1);
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

      if (instance.validate().length === 0) {
        if (!collections[instance.constructor.name]) {
          collections[instance.constructor.name] = [instance.toDbObject()];
        }
        else {
          collections[instance.constructor.name].push(instance.toDbObject());
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
  public saveInstances(instances: IElement[], upsert?: boolean): Promise<any> {
    if (!upsert) {
      upsert = false;
    }
    if (instances.length === 1) {
      if (instances[0].validate().length > 0) {
        return Promise.reject(instances[0].validate());
      }
      else {
        return this.updateMongoElementSingle(
          instances[0].toDbObject(),
          instances[0].constructor.name,
          upsert).then((res) => {
            return [{ result: res.result, ops: res.ops, upsertedCount: res.upsertedCount, upsertedId: res.upsertedId }];
          });
      }
    }
    else {
      return this.validateAndSort(instances).then((res) => {
        return this.mongoUpdate(res, upsert);
      });
    }
  }

  protected toElementArray(collection: IDocuments): Promise<any> {
    let that: any = this;
    let result: any[] = [];
    if (that.containsIDocuments(collection)) {
      // build array of collection based elements
      for (let i = 0; i < collection.documents.length; i++) {
        let currDoc: any = collection.documents[i];
        result.push(that.getClassInstance(collection.collection.toString().toLowerCase()));
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
