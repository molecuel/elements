/// <reference path="./typings/async/async.d.ts"/>
/// <reference path="./typings/mongoose/mongoose.d.ts"/>
/// <reference path="./typings/underscore/underscore.d.ts"/>
/// <reference path="./typings/node/node.d.ts"/>

/**
 * Created by Dominic Böttger on 14.01.2014
 * INSPIRATIONlabs GmbH
 * http://www.inspirationlabs.com
 */
var formServer = require('form-server');
import _ = require('underscore');
import fs = require('fs');
import async = require('async');
import url = require('url');
var mongolastic = require('mongolastic');

var molecuel;

/**
 * This module serves the molecuel elements the type definition for database objects
 * @todo implement the dynamic generation of elements
 * @constructor
 */
var elements = function (): void {
  var self = this;

  // is application middleware already registered
  this.appInitialized = false;

  // emit molecuel elements pre init event
  molecuel.emit('mlcl::elements::init:pre', self);

  // uuid
  this.uuid = require('uuid');

  // validation functions
  this.validator = require('validator');

  // default schema definition directory
  this.schemaDir = __dirname + '/definitions';

  this.modelRegistry = {};
  this.schemaRegistry = {};
  this.subSchemaRegistry = {};
  this.schemaDefinitionRegistry = {};

  this.postApiQueue = [];

  this.dataFormHandlerRegQueue = [];
  this.dataFormHandlerReg = [];

  this.typeHandlerRegistry = {};

  /**
   * Schema directory config
   */
  if (molecuel.config.elements && molecuel.config.elements.schemaDir) {
    this.schemaDir = molecuel.config.elements.schemaDir;
  }

  /**
   * Check if database and elasticsearch are available and register the schemas
   */
  var checkInit = function checkInit() {
  };

  /**
   * Execute after successful database connection
   */
  molecuel.on('mlcl::database::connection:success', function (database) {
  });

  /**
   * Execute after successful elasticsearch connection
   */
  molecuel.on('mlcl::search::connection:success', function (elastic) {
  });

  /**
   * Register form handler for every data Type
   */
  var formHandlerReg = function formHandlerReg() {
  };

  molecuel.on('mlcl::elements::dataFormHandlerInit:post', function () {
  });

  molecuel.on('mlcl::elements::setElementType:post', function () {
  });

  return this;
};


/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
var instance = null;

var getInstance = function(){
  return instance || (instance = new elements());
};

/**
* Empty findByUrl function until db layer init
* Log error when db layer is not available
*/
elements.prototype.findByUrl = function find(url, lang, callback) {
  molecuel.log.error('elements', 'Database url layer is not initialized');
  callback(new Error('Database layer is not initialized'));
};


/**
 * Save middleware for elements
 *
 * @todo Emit events for molecuel
 */
elements.prototype.save = function(model, callback) {
  mongolastic.save(model, callback);
};

/**
* api handler registration
*/
elements.prototype.registerPostApiHandler = function registerPostApiHandler(handlerFunction) {
};

elements.prototype.registerIndexPreprocessor = function registerIndexPreprocessor(handlerFunction) {
};


/**
 * Set the base schema this function is like the not yet available mongoose extend function
 * @param mySchema
 */
elements.prototype.setBaseSchema = function setBaseSchema(mySchema) {
  this.baseSchema = mySchema;
};

/**
 * Extend the base schema
 * @param mySchema
 */
elements.prototype.addToBaseSchema = function addToBaseSchema(mySchema) {
  if (_.isObject(mySchema)) {
    _.extend(this.baseSchema, mySchema);
  }
};

/**
 * Extend the defined schema
 * @param mySchema
 */
elements.prototype.addToSchemaDefinition = function addToSchemaDefinition(schemaname, mySchema) {
  if (_.isObject(mySchema)) {
    _.extend(mySchema, this.schemaDefinitionRegistry[schemaname].schema);

    if (_.isObject(mySchema)) {
      this.schemaDefinitionRegistry[schemaname].schema = mySchema;
    }
  }
};

/**
 * return the base Schema
 * @returns {baseSchema}
 */
elements.prototype.getBaseSchema = function getBaseSchema() {
  return this.baseSchema;
};

/**
 * Init function for the molecuel module
 * @param app the express app
 */
elements.prototype.initApplication = function initApplication() {
};

elements.prototype.middleware = function middleware(config, app) {
};

/**
 * Express middleware
 */
elements.prototype.get = function get(req, res, next) {
};

/**
 * getById returns a element based on the id from the search index
 * @param  {[type]}   index    [description]
 * @param  {[type]}   id       [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
elements.prototype.getById = function get(index, id, callback) {
  this.elastic.connection.get({
    'index': this.elastic.getIndexName(index),
    'type': index,
    'id': id
  }, callback)
};

/**
 * syncMiddleware - Sync function for the data model
 *
 * @param  {type} req description
 * @param  {type} res description
 * @return {type}     description
 *
 * @todo Reimplementation of sync function in underlying mongolastic module
 *       It shoul be able to create a new index and change the alias from the old
 *       index to the new one. After that the old index can be deleted.
 *
 */
elements.prototype.syncMiddleware = function syncMiddleware(req, res) {
};

/**
 * Inject a definition manually
 * @param name
 * @param definition
 * @param indexable
 */
elements.prototype.injectDefinition = function injectDefinition(name, definition, indexable) {
  this.setElementType(name, definition, indexable);
};

/**
 * Load the definitions
 * @todo load from configuration
 */
elements.prototype.getDefinitions = function getDefinitions() {
};

/**
 * Get the Subschema and if it's not already instantiated as subschema add it to the subschema registry
 * @param schemaname
 * @returns {*}
 */
elements.prototype.getSubSchemaSchema = function getSubSchemaSchema(schemaname) {
  if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
    return this.subSchemaRegistry[schemaname].schema;
  } else {
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

/**
 * Register Schema
 * @param schemaname
 * @param schema
 * @param config
 */
elements.prototype.registerSchemaDefinition = function registerSchemaDefinition(schema, coreSchema) {
};

/**
 * Register all possible Subschemas
 */
elements.prototype.registerSubSchemas = function registerSubSchemas() {
};

/**
 * Register as possible subschema
 * @param schemaname
 * this is the place to extend the schema by other modules in the preRegister phase
 */
elements.prototype.registerSubSchema = function registerSubSchema(schemaname) {
};

/**
 * Register schema as mongoose schema
 * @param schemaname
 * this is the place to extend the schema by other modules in the preRegister phase
 */
elements.prototype.registerSchema = function registerSchema(schemaname) {
};

/**
 * Registers all schemas in schemadefinition registry
 * @param schemaname
 */
elements.prototype.registerSchemas = function registerSchemas() {
};

/**
 * Get all schemas of all defined elements
 */
elements.prototype.getElementTypeSchemas = function getElementTypeSchemas() {

};

/**
 * Get the schema config of a element
 */
elements.prototype.getElementTypeSchemaConfig = function getElementTypeSchemaConfig(elementtypename) {
};

/**
 * Get all definitions of all types
 */
elements.prototype.getElementTypes = function getElementTypes() {

};

/**
 * Get the element of a specific type
 * @param typename
 * @todo implement this
 */
elements.prototype.getElementType = function getElementType(typename) {
};

/**
 * Get All available type names
 */
elements.prototype.getElementTypeNames = function getElementTypeNames() {

};


/**
 * Register Schema definitions
 *
 */
elements.prototype.setElementTypes = function setElementTypes() {
};

/**
 * Set a element type and it's definition
 * @param typename
 * @param definition
 * @param indexable Add to search engine?
 * @param coreSchema can be used to use the mongoose core schema
 */
elements.prototype.setElementType = function setElementType(typeName) {
};

/**
 * Get the fields from the system
 */
elements.prototype.getFields = function getFields() {

};

elements.prototype._defaultSchemaPlugin = function _defaultSchemaPlugin(schema) {
};

/**
 * Get a field by name
 * @param fieldname
 * @todo implement this
 */
/*elements.prototype.getField = function (fieldname) {

 };*/

/**
 * Set or create a field
 * @param fieldname
 * @param definition
 * @todo implement this
 */
/*
 elements.prototype.setField = function (fieldname, definition) {

 };*/

/**
 * Search for element by url
 * @param url
 * @param language
 * @param callback
 */
elements.prototype.searchByUrl = function searchByUrl(url, language, callback) {
  if (this.elastic) {
    this.elastic.searchByUrl(url, language, callback);
  } else {
    callback(new Error('No Elasticsearch connection'));
  }
};

elements.prototype.getModelNames = function getModelNames() {
};

/**
 * Return the model from the model registry
 * @param modelName
 * @returns {*}
 */
elements.prototype.getModel = function getModel(modelName) {
  return this.modelRegistry[modelName];
};

/**
 * Register a handler for a element type
 * @param type
 * @param handler
 */
elements.prototype.registerTypeHandler = function registerTypeHandler(type, handler ) {
  this.typeHandlerRegistry[type] = handler;
};

/**
 * Get the handler for a element type
 * @param type
 * @returns {*}
 */
elements.prototype.getTypeHandler = function getTypeHandler(type) {
  return this.typeHandlerRegistry[type];
};

/**
 * Unregister the type handler
 * @param type
 */
elements.prototype.unregisterTypeHandler = function unregisterTypeHandler(type) {
  delete this.typeHandlerRegistry[type];
};

/**
 * Search for element by id
 */

/**
 * Syncs a model to elasticsearch
 */
elements.prototype.sync = function sync(modelName, callback) {
  if(this.modelRegistry[modelName]) {
    if (this.elastic) {
      this.elastic.sync(this.modelRegistry[modelName], modelName, callback);
    } else {
      callback(new Error('No Elasticsearch connection'));
    }
  }
};

var init = function (m) {
  // store molecuel instance
  molecuel = m;
  return getInstance();
};

module.exports = init;
