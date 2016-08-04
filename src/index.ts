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
    let activeDb: any = this.mongoConnection;
    return activeDb.close();
  }

  protected async createCollection(name: string): Promise<any> {
    let activeDb: any = this.mongoConnection;
    return await activeDb.createCollection(name);
  }

  public async getCollections(): Promise<any> {
    let activeDb: any = this.mongoConnection;
    return await activeDb.collections();
  }

  protected async insertElements(instances: IElement[], collectionName: string, options?: mongodb.CollectionInsertManyOptions): Promise<any> {
    let activeDb: any = this.mongoConnection;
    let prom: any;
    try {
      let col: any = await activeDb.collection(collectionName);
      if (col) {
        prom = await col.insert(instances, options);
      }
    }
    catch (e) {
      prom = e;
    }
    console.log(prom);
    return prom;
  }

  protected instanceSaveWrapper(instances: IElement[], options?: mongodb.CollectionInsertManyOptions): Promise<void> {
    let errors: TSV.IValidatorError[] = [];
    let collections: any = {};
    let resultArray: any = [];

    // validate all instances and pre- sort into array based collections per model name;
    for (let instance of instances) {
      // let temp = Reflect.getMetadata('tsvalidate:validators', instance, '_id');
      // let val = new TSV.Validator();
      // val.validate(instance);

      if (instance.validate().length === 0) {
        if (!collections[instance.constructor.name]) {
          collections[instance.constructor.name] = <IElement[]>[instance];
        }
        else {
          collections[instance.constructor.name].push(<IElement>instance);
        }
      }
      else {
        errors = errors.concat(instance.validate());
      }
    }
    // every instance ok?: save instances to respective collection
    if (this.mongoConnection
      && errors.length === 0) {
      for (let collectionName in collections) {
        try {
          let collectionFullName: string = 'config.projectPrefix_' + collectionName;
          resultArray.concat(collections[collectionName]);
          // this.insertElements(collections[collectionName], collectionFullName, options);
        }
        catch (e) {
          return e;
        }
      }
      return resultArray;
    }
    else if (errors) {
      return new Promise((reject, resolve) => {
        reject(errors);
      });
    }
  }

  public async saveInstances(instances: IElement[]): Promise<void> {
    return await this.instanceSaveWrapper(instances);
  }
}
