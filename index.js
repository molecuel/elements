/**
 * Created by Dominic Böttger on 14.01.2014
 * INSPIRATIONlabs GmbH
 * http://www.inspirationlabs.com
 */
var formsAngular = require('forms-angular');
var _ = require('underscore');
var fs = require('fs');
var async = require('async');

var molecuel;

/**
 * This module serves the molecuel elements the type definition for database objects
 * @todo implement the dynamic generation of elements
 * @constructor
 */
var elements = function () {
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
    if (self.database && self.elastic) {
      molecuel.emit('mlcl::elements::registrations:pre', self);
      // register subschemas from registry
      self.registerSubSchemas();
      // load the definitions
      self.getDefinitions();
      // register schemas from registry
      self.registerSchemas();
      // render Schemas from registry
      self.setElementTypes();
      // all registered event
      molecuel.emit('mlcl::elements::registrations:post', self);
      // send init event
      molecuel.emit('mlcl::elements::init:post', self);
    }
  };

  /**
   * Execute after successful database connection
   */
  molecuel.on('mlcl::database::connection:success', function (database) {
    self.database = database;
    self.mongoose = self.database.database;
    var Schema = self.mongoose.Schema;
    var ObjectId = self.mongoose.Schema.ObjectId;
    self.ObjectId = ObjectId;
    self.Types = self.mongoose.Schema.Types;
    self.coreSchema = Schema;
    self.baseSchema = {
      updatedat: { type: Date, default: Date.now, form: {hidden: true} },
      createdat: { type: Date, default: Date.now, form: {hidden: true} },
      published: { type: Boolean, default: true }
    };
    checkInit();
  });

  /**
   * Execute after successful elasticsearch connection
   */
  molecuel.on('mlcl::search::connection:success', function (elastic) {
    self.elastic = elastic;
    checkInit();
  });

  /**
   * Register form handler for every data Type
   */
  var formHandlerReg = function formHandlerReg() {
    if (self.dataFormHandler) {
      molecuel.emit('mlcl::elements::dataFormHandler::addResources:pre', self);
      async.each(self.dataFormHandlerRegQueue, function (elname, callback) {
        if (_.indexOf(self.dataFormHandlerReg, elname) === -1) {
          self.dataFormHandler.addResource(elname, self.modelRegistry[elname], {
            onSave: function(doc, req, callback) {
              molecuel.emit('mlcl::elements::api:save', doc, req);
              async.each(self.postApiQueue, function(queueElement, qcallback) {
                queueElement(doc, req, qcallback);
              }, function() {
                console.log('end');
                callback(null);
              });
            }
            //@todo findFunc function(req, callback(err, query)) applies a filter to records returned by the server
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

elements.prototype.registerPostApiHandler = function registerPostApiHandler(handlerFunction) {
  this.postApiQueue.push(handlerFunction);
};

/**
 * Set the base schema this function is like the not yet available mongoose extend function
 * @param mySchema
 */
elements.prototype.setBaseSchema = function (mySchema) {
  this.baseSchema = mySchema;
};

/**
 * Extend the base schema
 * @param mySchema
 */
elements.prototype.addToBaseSchema = function (mySchema) {
  if (_.isObject(mySchema)) {
    _.extend(this.baseSchema, mySchema);
  }
};

/**
 * Extend the defined schema
 * @param mySchema
 */
elements.prototype.addToSchemaDefinition = function (schemaname, mySchema) {
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
elements.prototype.getBaseSchema = function () {
  return this.baseSchema;
};

/**
 * Init function for the molecuel module
 * @param app the express app
 */
elements.prototype.initApplication = function (app) {
  // send init event
  molecuel.emit('mlcl::elements::initApplication:pre', this);

  var self = this;
  /**
   * Form handler stuff
   */
    // send init dataForm Handler
  molecuel.emit('mlcl::elements::dataFormHandlerInit:pre', this);
  // initialize the form handler
  this.dataFormHandler = new (formsAngular)(app);
  molecuel.emit('mlcl::elements::dataFormHandlerInit:post', this, this.dataFormHandler);

  /**
   * Express middleware
   */
  app.get('*', function (req, res, next) {
    if (!req.language) {
      req.language = 'en';
    }
    self.searchByUrl(req.url, req.language, function (err, result) {
      if (result && result.hits && result.hits.hits && result.hits.hits[0]) {
        var myObject = result.hits.hits[0];
        var mySource = result.hits.hits[0]._source;
        var myType = result.hits.hits[0]._type;
        var currentTypeHandler = self.getTypeHandler(myType);
        // check if there is a special handler for the element type
        if(currentTypeHandler) {
          currentTypeHandler(req, res, next);
        } else {
          mySource._meta = {
            module: 'elements',
            type: myObject._type
          };
          mySource._view = { template: 'news'};
          molecuel.setContent(res, 'main', mySource);
          next();
        }
      } else {
        next();
      }
    });
  });

  // set the initialized variable to true
  this.appInitialized = true;

  molecuel.emit('mlcl::elements::initApplication:post', this);
};

/**
 * Inject a definition manually
 * @param name
 * @param definition
 * @param indexable
 */
elements.prototype.injectDefinition = function (name, definition, indexable) {
  this.setElementType(name, definition, indexable);
};

/**
 * Load the definitions
 * @todo load from configuration
 */
elements.prototype.getDefinitions = function getDefinitions() {
  molecuel.emit('mlcl::elements::preGetDefinitions', this);
  var self = this;

  /**
   * Load schema definitions
   * @type {*}
   */
  var defFiles = fs.readdirSync(this.schemaDir);
  defFiles.forEach(function (entry) {
    var currentSchema = require(self.schemaDir + '/' + entry)(self);
    self.registerSchemaDefinition(currentSchema.schemaName, currentSchema.schema, currentSchema.options);
  });
  molecuel.emit('mlcl::elements::postGetDefinitions', this);
};

/**
 * Get the Subschema and if it's not already instantiated as subschema add it to the subschema registry
 * @param schemaname
 * @returns {*}
 */
elements.prototype.getSubSchemaSchema = function (schemaname) {
  if (this.subSchemaRegistry[schemaname] && this.subSchemaRegistry[schemaname].schema) {
    return this.subSchemaRegistry[schemaname].schema;
  } else {
    if (this.schemaDefinitionRegistry[schemaname].schema &&
      this.schemaDefinitionRegistry[schemaname].config && this.schemaDefinitionRegistry[schemaname].config.subSchema) {
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
elements.prototype.registerSchemaDefinition = function (schemaname, schema, config, coreSchema) {
  molecuel.emit('mlcl::elements::registerSchemaDefinition:pre', this, schemaname, schema, config, coreSchema);
  molecuel.emit('mlcl::elements::registerSchemaDefinition:pre::' + schemaname, this, schema, config, coreSchema);
  if (!this.schemaDefinitionRegistry[schemaname]) {
    this.schemaDefinitionRegistry[schemaname] = {};
    this.schemaDefinitionRegistry[schemaname].schema = schema;
    this.schemaDefinitionRegistry[schemaname].config = config;
    if (coreSchema) {
      this.schemaDefinitionRegistry[schemaname].coreSchema = coreSchema;
    }
  }

  molecuel.emit('mlcl::elements::registerSchemaDefinition:post::' + schemaname, this, this.schemaDefinitionRegistry[schemaname]);
  molecuel.emit('mlcl::elements::registerSchemaDefinition:post', this, schemaname, this.schemaDefinitionRegistry[schemaname]);
};

/**
 * Register all possible Subschemas
 */
elements.prototype.registerSubSchemas = function () {
  for (var name in this.schemaDefinitionRegistry) {
    if (this.schemaDefinitionRegistry[name].config.subSchema === true) {
      this.registerSubSchema(name);
    }
  }
};

/**
 * Register as possible subschema
 * @param schemaname
 * this is the place to extend the schema by other modules in the preRegister phase
 */
elements.prototype.registerSubSchema = function (schemaname) {
  molecuel.emit('mlcl::elements::registerSubSchema:pre', this, schemaname, this.schemaDefinitionRegistry[schemaname]);
  molecuel.emit('mlcl::elements::registerSubSchema:pre::' + schemaname, this, this.schemaDefinitionRegistry[schemaname]);

  // create the schema
  var modelSchema = new this.coreSchema(this.schemaDefinitionRegistry[schemaname].schema);

  // add to schema registry
  this.subSchemaRegistry[schemaname] = {};
  this.subSchemaRegistry[schemaname].schema = modelSchema;
  this.subSchemaRegistry[schemaname].config = this.schemaDefinitionRegistry[schemaname].config;

  // emit post register events
  molecuel.emit('mlcl::elements::registerSubSchema:post::' + schemaname, this, modelSchema);
  molecuel.emit('mlcl::elements::registerSubSchema:post', this, schemaname, modelSchema);
};

/**
 * Register schema as mongoose schema
 * @param schemaname
 * this is the place to extend the schema by other modules in the preRegister phase
 */
elements.prototype.registerSchema = function (schemaname) {
  molecuel.emit('mlcl::elements::registerSchema:pre', this, schemaname, this.schemaDefinitionRegistry[schemaname]);
  molecuel.emit('mlcl::elements::registerSchema:pre::' + schemaname, this, this.schemaDefinitionRegistry[schemaname]);
  // merge after putting into registry

  var currentSchema = {};
  _.extend(currentSchema, this.baseSchema, this.schemaDefinitionRegistry[schemaname].schema);

  // if another schema is defined for the element
  if (this.schemaDefinitionRegistry[schemaname].coreSchema) {
    currentSchema = this.coreSchema;
  }

  var config = this.schemaDefinitionRegistry[schemaname].config;

  var schemaoptions = {};

  if (config.collection) {
    schemaoptions.collection = config.collection;
  }
  if (config.safe) {
    schemaoptions.safe = config.safe;
  }

  // create the schema
  var modelSchema = new this.coreSchema(currentSchema, schemaoptions);

  // add to schema registry
  this.schemaRegistry[schemaname] = {};
  this.schemaRegistry[schemaname].schema = modelSchema;
  this.schemaRegistry[schemaname].config = this.schemaDefinitionRegistry[schemaname].config;

  // emit post register event and send the schemaRegistry for the current schema including the model
  molecuel.emit('mlcl::elements::registerSchema:post', this, schemaname, this.schemaRegistry[schemaname]);
  molecuel.emit('mlcl::elements::registerSchema:post::'+schemaname, this, this.schemaRegistry[schemaname]);
};

/**
 * Registers all schemas in schemadefinition registry
 * @param schemaname
 */
elements.prototype.registerSchemas = function () {
  for (var name in this.schemaDefinitionRegistry) {
    if(this.schemaDefinitionRegistry.hasOwnProperty(name)) {
      this.registerSchema(name);
    }
  }
};

/**
 * Get all schemas of all defined elements
 */
elements.prototype.getElementTypeSchemas = function () {

};

/**
 * Get the schema config of a element
 */
elements.prototype.getElementTypeSchemaConfig = function (elementtypename) {
  return this.schemaRegistry[elementtypename];
};

/**
 * Get all definitions of all types
 */
elements.prototype.getElementTypes = function () {

};

/**
 * Get the element of a specific type
 * @param typename
 * @todo implement this
 */
elements.prototype.getElementType = function (typename) {
  return this.modelRegistry[typename];
};

/**
 * Get All available type names
 */
elements.prototype.getElementTypeNames = function () {

};


/**
 * Register Schema definitions
 *
 */
elements.prototype.setElementTypes = function () {
  molecuel.emit('mlcl::elements::setElementTypes:pre', this);
  for (var name in this.schemaRegistry) {
    if (this.schemaRegistry[name].config && !this.schemaRegistry[name].config.noCollection) {
      this.setElementType(name);
    }
  }
  molecuel.emit('mlcl::elements::setElementTypes:post', this);
};

/**
 * Set a element type and it's definition
 * @param typename
 * @param definition
 * @param indexable Add to search engine?
 * @param coreSchema can be used to use the mongoose core schema
 */
elements.prototype.setElementType = function (typeName) {
  molecuel.emit('mlcl::elements::setElementType:pre', this, typeName, this.schemaRegistry[typeName]);
  molecuel.emit('mlcl::elements::setElementType:pre::' + typeName, this, this.schemaRegistry[typeName]);

  var model = this.database.registerModel(typeName, this.schemaRegistry[typeName].schema, this.schemaRegistry[typeName].config);

  // add the model to the model registry
  this.modelRegistry[typeName] = model;

  // add a form handler for the ressource
  this.dataFormHandlerRegQueue.push(typeName);

  molecuel.emit('mlcl::elements::setElementType:post', this, typeName, model);
  molecuel.emit('mlcl::elements::setElementType:post::' + typeName, this, model);
};

/**
 * Get the fields from the system
 */
elements.prototype.getFields = function () {

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

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
elements.instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
elements.getInstance = function () {
  if (this.instance === null) {
    this.instance = new elements();
  }
  return this.instance;
};

var init = function (m) {
  // store molecuel instance
  molecuel = m;
  return elements.getInstance();
};

module.exports = init;