import mongodb = require('mongodb');
import elasticsearch = require('elasticsearch');
declare class Elements {
    mongoClient: mongodb.MongoClient;
    static loaderversion: number;
    mongoConnection: Promise<mongodb.Db>;
    elasticClient: elasticsearch.Client;
    elasticConnection: PromiseLike<elasticsearch.Client>;
    constructor(mlcl?: any, config?: any);
    protected mongoConnectWrapper(): Promise<any>;
    protected connectMongo(): Promise<void>;
    protected elasticConnectWrapper(): PromiseLike<any>;
    protected connectElastic(): Promise<void>;
    connect(): Promise<void>;
}
export = Elements;
