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
        let activeDb = this.mongoConnection;
        return activeDb.close();
    }
    createCollection(name) {
        return __awaiter(this, void 0, Promise, function* () {
            let activeDb = this.mongoConnection;
            return yield activeDb.createCollection(name);
        });
    }
    getCollections() {
        return __awaiter(this, void 0, Promise, function* () {
            let activeDb = this.mongoConnection;
            return yield activeDb.collections();
        });
    }
    insertElements(instances, collectionName, options) {
        return __awaiter(this, void 0, Promise, function* () {
            let activeDb = this.mongoConnection;
            let prom;
            try {
                let col = yield activeDb.collection(collectionName);
                if (col) {
                    prom = yield col.insert(instances, options);
                }
            }
            catch (e) {
                prom = e;
            }
            console.log(prom);
            return prom;
        });
    }
    instanceSaveWrapper(instances, options) {
        let errors = [];
        let collections = {};
        for (let instance of instances) {
            if (instance.validate().length === 0) {
                if (!collections[instance.constructor.name]) {
                    collections[instance.constructor.name] = [instance];
                }
                else {
                    collections[instance.constructor.name].push(instance);
                }
            }
            else {
                errors.concat(instance.validate());
            }
        }
        if (this.mongoConnection
            && errors.length === 0) {
            for (let collectionName in collections) {
                try {
                    let collectionFullName = 'config.projectPrefix_' + collectionName;
                    this.insertElements(collections[collectionName], collectionFullName, options);
                }
                catch (e) {
                    return e;
                }
            }
        }
        else if (errors) {
            return new Promise((resolve, reject) => {
                reject(errors);
            });
        }
    }
    saveInstances(instances) {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.instanceSaveWrapper(instances);
        });
    }
}
Elements.loaderversion = 2;
exports.Elements = Elements;

//# sourceMappingURL=index.js.map
