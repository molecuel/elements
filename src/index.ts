'use strict';
import mongodb = require('mongodb');

class Elements {
  public mongoClient: mongodb.MongoClient;

  public static loaderversion = 2;
  constructor(mlcl?: any, config?: any) {
    this.mongoClient = mongodb.MongoClient;
  }
  protected async connectMongo() {
    //    await this.mongoClient()
  }

  protected connectElastics() {

  }

  public connect() {

  }
}

export = Elements;
