"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var formServer = require('form-server');
var _ = require("underscore");
var mongolastic = require('mongolastic');
var molecuel;
var elements = function () {
    var self = this;
    this.appInitialized = false;
    molecuel.emit('mlcl::elements::init:pre', self);
    this.uuid = require('uuid');
    this.validator = require('validator');
    this.schemaDir = __dirname + '/definitions';
    this.modelRegistry = {};
    this.schemaRegistry = {};
    this.subSchemaRegistry = {};
    this.schemaDefinitionRegistry = {};
    this.postApiQueue = [];
    this.dataFormHandlerRegQueue = [];
    this.dataFormHandlerReg = [];
    this.typeHandlerRegistry = {};
    if (molecuel.config.elements && molecuel.config.elements.schemaDir) {
        this.schemaDir = molecuel.config.elements.schemaDir;
    }
    var checkInit = function checkInit() {
    };
    molecuel.on('mlcl::database::connection:success', function (database) {
    });
    molecuel.on('mlcl::search::connection:success', function (elastic) {
    });
    var formHandlerReg = function formHandlerReg() {
    };
    molecuel.on('mlcl::elements::dataFormHandlerInit:post', function () {
    });
    molecuel.on('mlcl::elements::setElementType:post', function () {
    });
    return this;
};
var instance = null;
var getInstance = function () {
    return instance || (instance = new elements());
};
elements.prototype.findByUrl = function find(url, lang, callback) {
    molecuel.log.error('elements', 'Database url layer is not initialized');
    callback(new Error('Database layer is not initialized'));
};
elements.prototype.save = function (model, callback) {
    mongolastic.save(model, callback);
};
elements.prototype.registerPostApiHandler = function registerPostApiHandler(handlerFunction) {
};
elements.prototype.registerIndexPreprocessor = function registerIndexPreprocessor(handlerFunction) {
};
elements.prototype.setBaseSchema = function setBaseSchema(mySchema) {
    this.baseSchema = mySchema;
};
elements.prototype.addToBaseSchema = function addToBaseSchema(mySchema) {
    if (_.isObject(mySchema)) {
        _.extend(this.baseSchema, mySchema);
    }
};
elements.prototype.addToSchemaDefinition = function addToSchemaDefinition(schemaname, mySchema) {
    if (_.isObject(mySchema)) {
        _.extend(mySchema, this.schemaDefinitionRegistry[schemaname].schema);
        if (_.isObject(mySchema)) {
            this.schemaDefinitionRegistry[schemaname].schema = mySchema;
        }
    }
};
elements.prototype.getBaseSchema = function getBaseSchema() {
    return this.baseSchema;
};
elements.prototype.initApplication = function initApplication() {
};
elements.prototype.middleware = function middleware(config, app) {
};
elements.prototype.get = function get(req, res, next) {
};
elements.prototype.getById = function get(index, id, callback) {
    this.elastic.connection.get({
        'index': this.elastic.getIndexName(index),
        'type': index,
        'id': id
    }, callback);
};
elements.prototype.syncMiddleware = function syncMiddleware(req, res) {
};
elements.prototype.injectDefinition = function injectDefinition(name, definition, indexable) {
    this.setElementType(name, definition, indexable);
};
elements.prototype.getDefinitions = function getDefinitions() {
};
elements.prototype.getSubSchemaSchema = function getSubSchemaSchema(schemaname) {
    if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
        return this.subSchemaRegistry[schemaname].schema;
    }
    else {
        if (this.schemaDefinitionRegistry[schemaname].schema
            && this.schemaDefinitionRegistry[schemaname].options
            && this.schemaDefinitionRegistry[schemaname].options.subSchema) {
            this.registerSubSchema(schemaname);
            if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
                return this.subSchemaRegistry[schemaname].schema;
            }
        }
    }
    return null;
};
elements.prototype.registerSchemaDefinition = function registerSchemaDefinition(schema, coreSchema) {
};
elements.prototype.registerSubSchemas = function registerSubSchemas() {
};
elements.prototype.registerSubSchema = function registerSubSchema(schemaname) {
};
elements.prototype.registerSchema = function registerSchema(schemaname) {
};
elements.prototype.registerSchemas = function registerSchemas() {
};
elements.prototype.getElementTypeSchemas = function getElementTypeSchemas() {
};
elements.prototype.getElementTypeSchemaConfig = function getElementTypeSchemaConfig(elementtypename) {
};
elements.prototype.getElementTypes = function getElementTypes() {
};
elements.prototype.getElementType = function getElementType(typename) {
};
elements.prototype.getElementTypeNames = function getElementTypeNames() {
};
elements.prototype.setElementTypes = function setElementTypes() {
};
elements.prototype.setElementType = function setElementType(typeName) {
};
elements.prototype.getFields = function getFields() {
};
elements.prototype._defaultSchemaPlugin = function _defaultSchemaPlugin(schema) {
};
elements.prototype.searchByUrl = function searchByUrl(url, language, callback) {
    if (this.elastic) {
        this.elastic.searchByUrl(url, language, callback);
    }
    else {
        callback(new Error('No Elasticsearch connection'));
    }
};
elements.prototype.getModelNames = function getModelNames() {
};
elements.prototype.getModel = function getModel(modelName) {
    return this.modelRegistry[modelName];
};
elements.prototype.registerTypeHandler = function registerTypeHandler(type, handler) {
    this.typeHandlerRegistry[type] = handler;
};
elements.prototype.getTypeHandler = function getTypeHandler(type) {
    return this.typeHandlerRegistry[type];
};
elements.prototype.unregisterTypeHandler = function unregisterTypeHandler(type) {
    delete this.typeHandlerRegistry[type];
};
elements.prototype.sync = function sync(modelName, callback) {
    if (this.modelRegistry[modelName]) {
        if (this.elastic) {
            this.elastic.sync(this.modelRegistry[modelName], modelName, callback);
        }
        else {
            callback(new Error('No Elasticsearch connection'));
        }
    }
};
var init = function (m) {
    molecuel = m;
    return getInstance();
};
module.exports = init;
