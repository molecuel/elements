'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const mongodb = require('mongodb');
const elasticsearch = require('elasticsearch');
class Elements {
    constructor(mlcl, config) {
        this.mongoClient = mongodb.MongoClient;
        this.elasticClient = new elasticsearch.Client({
            host: 'localhost:9200',
            log: 'trace'
        });
    }
    mongoConnectWrapper() {
        return this.mongoClient.connect('mongodb://localhost/elements?connectTimeoutMS=10000&socketTimeoutMS=10000', { promiseLibrary: Promise });
    }
    connectMongo() {
        return __awaiter(this, void 0, void 0, function* () {
            this.mongoConnection = yield this.mongoConnectWrapper();
        });
    }
    elasticConnectWrapper() {
        return this.elasticClient.ping({
            requestTimeout: 30000,
            hello: 'elasticsearch'
        });
    }
    connectElastic() {
        return __awaiter(this, void 0, void 0, function* () {
            this.elasticConnection = yield this.elasticConnectWrapper();
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectElastic();
            yield this.connectMongo();
        });
    }
}
Elements.loaderversion = 2;
module.exports = Elements;

//# sourceMappingURL=index.js.map
