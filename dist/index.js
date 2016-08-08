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
require('reflect-metadata');
const TSV = require('tsvalidate');
const ElasticOptions_1 = require('./classes/ElasticOptions');
var Element_1 = require('./classes/Element');
exports.Element = Element_1.Element;
class Elements {
    constructor(mlcl, config) {
        this.elementStore = new Map();
        this.elasticOptions = new ElasticOptions_1.ElasticOptions();
        this.elasticOptions.url = 'http://localhost:9200';
        this.elasticOptions.loglevel = 'trace';
        this.elasticOptions.timeout = 10000;
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
        return __awaiter(this, void 0, Promise, function* () {
            this.mongoConnection = yield this.mongoConnectWrapper();
        });
    }
    elasticConnectWrapper() {
        return this.elasticClient.ping({
            requestTimeout: this.elasticOptions.timeout,
            hello: 'elasticsearch'
        });
    }
    connectElastic() {
        return __awaiter(this, void 0, Promise, function* () {
            this.elasticConnection = yield this.elasticConnectWrapper();
        });
    }
    connect() {
        return __awaiter(this, void 0, Promise, function* () {
            yield this.connectElastic();
            yield this.connectMongo();
        });
    }
    registerClass(name, definition) {
        definition.elements = this;
        this.elementStore.set(name, definition);
    }
    getClass(name) {
        return this.elementStore.get(name);
    }
    getClassInstance(name) {
        let elementClass = this.elementStore.get(name);
        let classInstance = new elementClass();
        classInstance.setFactory(this);
        return classInstance;
    }
    validate(instance) {
        let validator = new TSV.Validator();
        return validator.validate(instance);
    }
    mongoClose() {
        return this.getMongoConnection().close();
    }
    getMongoConnection() {
        return this.mongoConnection;
    }
    getMongoCollections() {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collections();
        });
    }
    insertMongoElements(instances, collectionName, options) {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collection(collectionName).insertMany(instances, options);
        });
    }
    getMongoCollectionCount(collectionName) {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collection(collectionName).count();
        });
    }
    saveInstances(instances) {
        return this.instanceSaveWrapper(instances);
    }
    instanceSaveWrapper(instances, options) {
        let errors = [];
        let insertions = 3;
        let collections = {};
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
        if (this.mongoConnection
            && errors.length === 0) {
            for (let collectionName in collections) {
                try {
                    let collectionFullName = 'config.projectPrefix_' + collectionName;
                    this.getMongoCollectionCount(collectionFullName).then((res) => {
                        if (typeof res === 'number'
                            && res !== NaN) {
                            insertions -= res;
                            console.log('pre-insert value: ' + insertions);
                            return res;
                        }
                    });
                    this.insertMongoElements(collections[collectionName], collectionFullName, options);
                    this.getMongoCollectionCount(collectionFullName).then((res) => {
                        if (typeof res === 'number'
                            && res !== NaN) {
                            insertions += res;
                            console.log('post-insert value: ' + insertions);
                            return res;
                        }
                    });
                }
                catch (err) {
                    return Promise.reject(err);
                }
            }
            return Promise.resolve(insertions);
        }
        else if (errors.length > 0) {
            return Promise.reject(errors);
        }
    }
}
Elements.loaderversion = 2;
exports.Elements = Elements;

//# sourceMappingURL=index.js.map
