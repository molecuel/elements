/// <reference path="./typings/async/async.d.ts"/>
/// <reference path="./typings/mongoose/mongoose.d.ts"/>
/// <reference path="./typings/underscore/underscore.d.ts"/>
/// <reference path="./typings/node/node.d.ts"/>
var formServer = require('form-server');
var _ = require('underscore');
var fs = require('fs');
var async = require('async');
var url = require('url');
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
        if (self.database && self.elastic) {
            molecuel.emit('mlcl::elements::registrations:pre', self);
            self.registerSubSchemas();
            self.getDefinitions();
            self.registerSchemas();
            self.setElementTypes();
            molecuel.emit('mlcl::elements::registrations:post', self);
            molecuel.emit('mlcl::elements::init:post', self);
        }
    };
    molecuel.on('mlcl::database::connection:success', function (database) {
        self.database = database;
        self.mongoose = self.database.database;
        var Schema = self.mongoose.Schema;
        var ObjectId = self.mongoose.Schema.ObjectId;
        self.ObjectId = ObjectId;
        self.Types = self.mongoose.Schema.Types;
        self.coreSchema = Schema;
        self.baseSchema = {
            published: {
                type: Boolean
            }
        };
        checkInit();
    });
    molecuel.on('mlcl::search::connection:success', function (elastic) {
        self.elastic = elastic;
        checkInit();
    });
    var formHandlerReg = function formHandlerReg() {
        if (self.dataFormHandler) {
            molecuel.emit('mlcl::elements::dataFormHandler::addResources:pre', self);
            async.each(self.dataFormHandlerRegQueue, function (elname, callback) {
                if (_.indexOf(self.dataFormHandlerReg, elname) === -1) {
                    self.dataFormHandler.addResource(elname, self.modelRegistry[elname], {
                        onSave: function (doc, req, callback) {
                            molecuel.emit('mlcl::elements::api:save', doc, req);
                            async.each(self.postApiQueue, function (queueElement, qcallback) {
                                queueElement(doc, req, qcallback);
                            }, function () {
                                callback(null);
                            });
                        }
                    });
                    self.dataFormHandlerReg.push(elname);
                }
                callback();
            }, function () {
                molecuel.emit('mlcl::elements::dataFormHandler::addResources:post', self);
            });
        }
    };
    molecuel.on('mlcl::elements::dataFormHandlerInit:post', function () {
        formHandlerReg();
    });
    molecuel.on('mlcl::elements::setElementType:post', function () {
        formHandlerReg();
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
    this.postApiQueue.push(handlerFunction);
};
elements.prototype.registerIndexPreprocessor = function registerIndexPreprocessor(handlerFunction) {
    mongolastic.registerIndexPreprocessor(handlerFunction);
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
    molecuel.emit('mlcl::elements::initApplication:pre', this);
    molecuel.emit('mlcl::elements::initApplication:post', this);
};
elements.prototype.middleware = function middleware(config, app) {
    if (config.type === 'formserver') {
        molecuel.emit('mlcl::elements::dataFormHandlerInit:pre', this);
        this.dataFormHandler = new (formServer)(app, this, molecuel);
        this.appInitialized = true;
        molecuel.emit('mlcl::elements::dataFormHandlerInit:post', this, this.dataFormHandler);
    }
};
elements.prototype.get = function get(req, res, next) {
    var self = this;
    if (!req.language || req.language === 'dev') {
        req.language = 'en';
    }
    var urlObject = url.parse(req.url);
    self.searchByUrl(urlObject.pathname, req.language, function (err, result) {
        if (result && result.hits && result.hits.hits && result.hits.hits[0]) {
            var myObject = result.hits.hits[0];
            var mySource = result.hits.hits[0]._source;
            var myType = result.hits.hits[0]._type;
            mySource._meta = {
                module: 'elements',
                type: myObject._type
            };
            molecuel.setContent(res, 'main', mySource);
            var currentTypeHandler = self.getTypeHandler(myType);
            if (currentTypeHandler) {
                currentTypeHandler(req, res, next);
            }
            else {
                next();
            }
        }
        else {
            next();
        }
    });
};
elements.prototype.syncMiddleware = function syncMiddleware(req, res) {
    if (req.query.model) {
        this.sync(req.query.model, function (err) {
            if (!err) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        });
    }
};
elements.prototype.injectDefinition = function injectDefinition(name, definition, indexable) {
    this.setElementType(name, definition, indexable);
};
elements.prototype.getDefinitions = function getDefinitions() {
    molecuel.emit('mlcl::elements::preGetDefinitions', this);
    var self = this;
    var defFiles = fs.readdirSync(this.schemaDir);
    defFiles.forEach(function (entry) {
        var currentSchema = require(self.schemaDir + '/' + entry)(self);
        self.registerSchemaDefinition(currentSchema);
    });
    molecuel.emit('mlcl::elements::postGetDefinitions', this);
};
elements.prototype.getSubSchemaSchema = function getSubSchemaSchema(schemaname) {
    if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
        return this.subSchemaRegistry[schemaname].schema;
    }
    else {
        if (this.schemaDefinitionRegistry[schemaname].schema && this.schemaDefinitionRegistry[schemaname].options && this.schemaDefinitionRegistry[schemaname].options.subSchema) {
            this.registerSubSchema(schemaname);
            if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
                return this.subSchemaRegistry[schemaname].schema;
            }
        }
    }
    return null;
};
elements.prototype.registerSchemaDefinition = function registerSchemaDefinition(schema, coreSchema) {
    var schemaName = schema.schemaName;
    molecuel.emit('mlcl::elements::registerSchemaDefinition:pre', this, schema.schemaName, schema, coreSchema);
    molecuel.emit('mlcl::elements::registerSchemaDefinition:pre::' + schema.schemaName, this, schema, coreSchema);
    if (!this.schemaDefinitionRegistry[schemaName]) {
        this.schemaDefinitionRegistry[schemaName] = schema;
        if (coreSchema) {
            this.schemaDefinitionRegistry[schemaName].coreSchema = coreSchema;
        }
    }
    molecuel.emit('mlcl::elements::registerSchemaDefinition:post::' + schemaName, this, this.schemaDefinitionRegistry[schema.schemaName]);
    molecuel.emit('mlcl::elements::registerSchemaDefinition:post', this, schemaName, this.schemaDefinitionRegistry[schema.schemaName]);
};
elements.prototype.registerSubSchemas = function registerSubSchemas() {
    for (var name in this.schemaDefinitionRegistry) {
        if (this.schemaDefinitionRegistry[name].options.subSchema === true) {
            this.registerSubSchema(name);
        }
    }
};
elements.prototype.registerSubSchema = function registerSubSchema(schemaname) {
    molecuel.emit('mlcl::elements::registerSubSchema:pre', this, schemaname, this.schemaDefinitionRegistry[schemaname]);
    molecuel.emit('mlcl::elements::registerSubSchema:pre::' + schemaname, this, this.schemaDefinitionRegistry[schemaname]);
    var modelSchema = new this.coreSchema(this.schemaDefinitionRegistry[schemaname].schema);
    this.subSchemaRegistry[schemaname] = {};
    this.subSchemaRegistry[schemaname].schema = modelSchema;
    this.subSchemaRegistry[schemaname].options = this.schemaDefinitionRegistry[schemaname].options;
    this.subSchemaRegistry[schemaname].indexes = this.schemaDefinitionRegistry[schemaname].indexes;
    molecuel.emit('mlcl::elements::registerSubSchema:post::' + schemaname, this, modelSchema);
    molecuel.emit('mlcl::elements::registerSubSchema:post', this, schemaname, modelSchema);
};
elements.prototype.registerSchema = function registerSchema(schemaname) {
    var self = this;
    molecuel.emit('mlcl::elements::registerSchema:pre', this, schemaname, this.schemaDefinitionRegistry[schemaname]);
    molecuel.emit('mlcl::elements::registerSchema:pre::' + schemaname, this, this.schemaDefinitionRegistry[schemaname]);
    var currentSchema = {};
    _.extend(currentSchema, this.baseSchema, this.schemaDefinitionRegistry[schemaname].schema);
    if (this.schemaDefinitionRegistry[schemaname].coreSchema) {
        currentSchema = this.coreSchema;
    }
    var options = this.schemaDefinitionRegistry[schemaname].options;
    var schemaOptions = {};
    if (options.collection) {
        schemaOptions.collection = options.collection;
    }
    if (options.safe) {
        schemaOptions.safe = options.safe;
    }
    var modelSchema = new this.coreSchema(currentSchema, schemaOptions);
    modelSchema.plugin(self._defaultSchemaPlugin);
    _.each(this.schemaDefinitionRegistry[schemaname].indexes, function (index) {
        modelSchema.index(index);
    });
    this.schemaRegistry[schemaname] = {};
    this.schemaRegistry[schemaname].schema = modelSchema;
    this.schemaRegistry[schemaname].options = this.schemaDefinitionRegistry[schemaname].options;
    this.schemaRegistry[schemaname].indexes = this.schemaDefinitionRegistry[schemaname].indexes;
    molecuel.emit('mlcl::elements::registerSchema:post', this, schemaname, this.schemaRegistry[schemaname]);
    molecuel.emit('mlcl::elements::registerSchema:post::' + schemaname, this, this.schemaRegistry[schemaname]);
};
elements.prototype.registerSchemas = function registerSchemas() {
    for (var name in this.schemaDefinitionRegistry) {
        if (this.schemaDefinitionRegistry.hasOwnProperty(name)) {
            this.registerSchema(name);
        }
    }
};
elements.prototype.getElementTypeSchemas = function getElementTypeSchemas() {
};
elements.prototype.getElementTypeSchemaConfig = function getElementTypeSchemaConfig(elementtypename) {
    return this.schemaRegistry[elementtypename];
};
elements.prototype.getElementTypes = function getElementTypes() {
};
elements.prototype.getElementType = function getElementType(typename) {
    return this.modelRegistry[typename];
};
elements.prototype.getElementTypeNames = function getElementTypeNames() {
};
elements.prototype.setElementTypes = function setElementTypes() {
    molecuel.emit('mlcl::elements::setElementTypes:pre', this);
    for (var name in this.schemaRegistry) {
        if (this.schemaRegistry[name].options && !this.schemaRegistry[name].options.noCollection) {
            this.setElementType(name);
        }
    }
    molecuel.emit('mlcl::elements::setElementTypes:post', this);
};
elements.prototype.setElementType = function setElementType(typeName) {
    molecuel.emit('mlcl::elements::setElementType:pre', this, typeName, this.schemaRegistry[typeName]);
    molecuel.emit('mlcl::elements::setElementType:pre::' + typeName, this, this.schemaRegistry[typeName]);
    var model = this.database.registerModel(typeName, this.schemaRegistry[typeName].schema, this.schemaRegistry[typeName].options);
    if (this.schemaDefinitionRegistry[typeName].search) {
        model.elastic = this.schemaDefinitionRegistry[typeName].search;
    }
    this.modelRegistry[typeName] = model;
    this.dataFormHandlerRegQueue.push(typeName);
    molecuel.emit('mlcl::elements::setElementType:post', this, typeName, model);
    molecuel.emit('mlcl::elements::setElementType:post::' + typeName, this, model);
};
elements.prototype.getFields = function getFields() {
};
elements.prototype._defaultSchemaPlugin = function _defaultSchemaPlugin(schema) {
    schema.add({
        updatedat: {
            type: Date,
            default: Date.now,
            form: {
                readonly: true
            }
        },
        createdat: {
            type: Date,
            default: Date.now,
            form: {
                readonly: true
            }
        },
        publishedat: {
            type: Date,
            form: {
                readonly: true
            }
        }
    });
    schema.path('published').set(function (newval) {
        if (this.published === false && newval === true) {
            this.publishedat = new Date();
        }
        return newval;
    });
    schema.pre('save', function (next) {
        this.updatedat = new Date();
        next();
    });
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
