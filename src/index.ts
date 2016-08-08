'use strict';
import mongodb = require('mongodb');
import elasticsearch = require('elasticsearch');
import 'reflect-metadata';
import * as TSV from 'tsvalidate';

import { ElasticOptions } from './classes/ElasticOptions';
import { IElement } from './interfaces/IElement';
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

  public mongoClose(): Promise<any> {
    return this.getMongoConnection().close();
  }

  public getMongoConnection(): any {
    return this.mongoConnection;
  }

  public async getMongoCollections(): Promise<any> {
    return await this.getMongoConnection().collections();
  }

  protected async insertMongoElements(instances: Object[], collectionName: string, options?: mongodb.CollectionInsertManyOptions): Promise<any> {
    return await this.getMongoConnection().collection(collectionName).insertMany(instances, options);
  }

  protected async insertMongoElementSingle(instance: Object, collectionName: string, options?: mongodb.CollectionInsertOneOptions): Promise<any> {
    return await this.getMongoConnection().collection(collectionName).insertOne(instance, options);
  }

  protected async getMongoCollectionCount(collectionName: string): Promise<any> {
    return await this.getMongoConnection().collection(collectionName).count();
  }

  public saveInstances(instances: IElement[], options?: mongodb.CollectionInsertManyOptions | mongodb.CollectionInsertOneOptions): Promise<any> {
    return this.instanceSaveWrapper(instances);
  }

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

  protected mongoInsertionWrapper(collections: Object, options?: mongodb.CollectionInsertManyOptions): Promise<any> {
    let result: any[] = [];

    // every instance ok?: save instances to respective collection
    for (let collectionName in collections) {
      let collectionFullName: string = 'config.projectPrefix_' + collectionName;
      result.push(this.insertMongoElements(collections[collectionName], collectionFullName, options));
    }
    return Promise.resolve(result);
  }

  protected async instanceSaveWrapper(instances: IElement[], options?: mongodb.CollectionInsertManyOptions | mongodb.CollectionInsertOneOptions): Promise<any> {
    if (instances.length === 1) {
      if (instances[0].validate().length > 0) {
        return Promise.reject(instances[0].validate());
      }
      else {
        return this.insertMongoElementSingle(
          instances[0].toDbObject(),
          'config.projectPrefix_' + instances[0].constructor.name,
          options);
      }
    }
    else {
      return await this.validateAndSort(instances).then((res) => {
        return this.mongoInsertionWrapper(res, options);
      });
    }


  }

}
