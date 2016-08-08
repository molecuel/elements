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
        this.elasticOptions.timeout = 5000;
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
    insertMongoElementSingle(instance, collectionName, options) {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collection(collectionName).insertOne(instance, options);
        });
    }
    getMongoCollectionCount(collectionName) {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collection(collectionName).count();
        });
    }
    saveInstances(instances, options) {
        return this.instanceSaveWrapper(instances);
    }
    validateAndSort(instances) {
        let errors = [];
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
        if (errors.length > 0) {
            return Promise.reject(errors);
        }
        else {
            return Promise.resolve(collections);
        }
    }
    mongoInsertionWrapper(collections, options) {
        let result = [];
        for (let collectionName in collections) {
            let collectionFullName = 'config.projectPrefix_' + collectionName;
            result.push(this.insertMongoElements(collections[collectionName], collectionFullName, options));
        }
        return Promise.resolve(result);
    }
    instanceSaveWrapper(instances, options) {
        return __awaiter(this, void 0, Promise, function* () {
            if (instances.length === 1) {
                if (instances[0].validate().length > 0) {
                    return Promise.reject(instances[0].validate());
                }
                else {
                    return this.insertMongoElementSingle(instances[0].toDbObject(), 'config.projectPrefix_' + instances[0].constructor.name, options);
                }
            }
            else {
                return yield this.validateAndSort(instances).then((res) => {
                    return this.mongoInsertionWrapper(res, options);
                });
            }
        });
    }
}
Elements.loaderversion = 2;
exports.Elements = Elements;

//# sourceMappingURL=index.js.map
