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

  protected instanceSaveWrapper(instances: IElement[], options?: mongodb.CollectionInsertManyOptions): Promise<any> {
    let errors: TSV.IValidatorError[] = [];
    let collections: any = {};
    let connectedDb: mongodb.Db;
    for (let instance of instances) {
      if (!instance.validate()) {
        if (!collections[instance.constructor.name]) {
          collections[instance.constructor.name] = <IElement[]>[instance];
        }
        else {
          collections[instance.constructor.name].push(<IElement>instance);
        }
      }
      else {
        errors.concat(instance.validate());
      }
    }
    if (this.mongoConnection
      && errors.length === 0) {
      this.mongoConnection.then((thatDb) => {
        connectedDb = thatDb;
      });
      // for (let collection of collections) {
      //   let instanceCollection = connectedDb.collection('config.projectPrefix' + collection[0].constructor.name);
      //   instanceCollection.insertMany(collection, options);
      // }
      return connectedDb.collections();
      // return new Promise((resolve, reject) => {
      //   resolve('success');
      // });
    }
    else if (errors) {
      return new Promise((resolve, reject) => {
        reject(errors);
      });
    }
  }

  public async saveInstance(instances: IElement[]): Promise<void> {
    await this.instanceSaveWrapper(instances);
  }
}
