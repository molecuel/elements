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
const _ = require('lodash');
const TSV = require('tsvalidate');
const ELD = require('./customDecorators');
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
    toDbObject(element) {
        return this.toDbObjRecursive(element, false);
    }
    toDbObjRecursive(obj, nested) {
        let that = obj;
        let result = {};
        let objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, that);
        let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function (o) {
            return o.property;
        });
        for (let key in that) {
            if (Object.hasOwnProperty.call(that, key)
                && that[key] !== undefined
                && propertiesValidatorDecorators[key]) {
                if (key === '_id'
                    && !nested) {
                    result[key] = that[key];
                }
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
    mongoClose() {
        return this.getMongoConnection().close();
    }
    getMongoConnection() {
        return this.mongoConnection;
    }
    getElasticConnection() {
        return this.elasticClient;
    }
    getMongoCollections() {
        return __awaiter(this, void 0, Promise, function* () {
            return yield this.getMongoConnection().collections();
        });
    }
    containsIDocuments(obj) {
        let template = {
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
    findByQuery(collection, query, limit) {
        return __awaiter(this, void 0, Promise, function* () {
            let input = collection;
            let collectionName;
            if (typeof input === 'string') {
                collectionName = input;
            }
            else if ('prototype' in input) {
                collectionName = input.prototype.constructor.name;
            }
            else {
                collectionName = input.constructor.name;
            }
            return yield this.getMongoConnection().collection(collectionName).find(query).limit(limit || 0).toArray().then((res) => {
                return this.toElementArray({ collection: collectionName, documents: res });
            });
        });
    }
    findById(id, collection) {
        return __awaiter(this, void 0, Promise, function* () {
            let inputColl = collection;
            let inputId = id;
            let collectionName;
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
            return yield this.findByQuery(collectionName, { _id: inputId }, 1);
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
    updateMongoElements(instances, collectionName, upsert) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!upsert) {
                upsert = false;
            }
            let bulk = yield this.getMongoConnection().collection(collectionName).initializeUnorderedBulkOp();
            _.each(instances, (instance) => {
                if (upsert) {
                    bulk.find({ _id: instance._id }).upsert().updateOne(instance);
                }
                else {
                    bulk.find({ _id: instance._id }).updateOne(instance);
                }
            });
            return yield bulk.execute();
        });
    }
    updateMongoElementSingle(instance, collectionName, upsert) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!upsert) {
                upsert = false;
            }
            return yield this.getMongoConnection().collection(collectionName).updateOne({ _id: instance._id }, instance, { upsert: upsert });
        });
    }
    validateAndSort(instances) {
        let errors = [];
        let collections = {};
        for (let instance of instances) {
            let metadata = Reflect.getMetadata(ELD.METADATAKEY, instance.constructor);
            let collectionName = instance.constructor.name;
            _.each(metadata, (entry) => {
                if ('type' in entry
                    && entry.type === ELD.Decorators.USE_MONGO_COLLECTION
                    && 'value' in entry
                    && 'property' in entry
                    && entry.property === instance.constructor.name) {
                    collectionName = entry.value;
                }
            });
            if (instance.validate().length === 0) {
                if (!collections[collectionName]) {
                    collections[collectionName] = [instance.toDbObject()];
                }
                else {
                    collections[collectionName].push(instance.toDbObject());
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
    mongoUpdate(collections, upsert) {
        return __awaiter(this, void 0, Promise, function* () {
            let result = [];
            if (!upsert) {
                upsert = false;
            }
            for (let collectionName in collections) {
                let collectionFullName = collectionName;
                let prom = yield this.updateMongoElements(collections[collectionName], collectionFullName, upsert);
                result.push({ [collectionName]: prom });
            }
            return Promise.resolve(result);
        });
    }
    saveInstances(instances, upsert) {
        if (!upsert) {
            upsert = false;
        }
        if (instances.length === 1) {
            if (instances[0].validate().length > 0) {
                return Promise.reject(instances[0].validate());
            }
            else {
                return this.updateMongoElementSingle(instances[0].toDbObject(), instances[0].constructor.name, upsert).then((res) => {
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
    toElementArray(collection) {
        let that = this;
        let result = [];
        if (that.containsIDocuments(collection)) {
            for (let i = 0; i < collection.documents.length; i++) {
                let currDoc = collection.documents[i];
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
Elements.loaderversion = 2;
exports.Elements = Elements;

//# sourceMappingURL=index.js.map
