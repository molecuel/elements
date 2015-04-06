/**
 * Created by Dominic Böttger on 11.05.2014
 * INSPIRATIONlabs GmbH
 * http://www.inspirationlabs.com
 */
var should = require('should'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  express = require('express'),
  mlcl_database = require('mlcl_database'),
  mlcl_elastic = require('mlcl_elastic'),
  mlcl_url = require('mlcl_url'),
  request = require('request'),
  assert = require('assert'),
  mlcl_elements = require('../');

describe('mlcl_elastic', function() {
  var mlcl;
  var molecuel;
  var mongo;
  var elastic;
  var elements;

  before(function(done) {
    // init fake molecuel
    mlcl = function() {
      return this;
    };
    util.inherits(mlcl, EventEmitter);
    molecuel = new mlcl();

    molecuel.config = { };
    molecuel.config.search = {
      hosts: ['http://localhost:9200'],
      prefix: 'mlcl-elements-unit'
    };
    molecuel.config.database = {
      type: 'mongodb',
      uri: 'mongodb://localhost/mlcl-elements-unit'
    };
    molecuel.config.elements = {
      schemaDir: __dirname + '/definitions'
    };

    molecuel.config.routes = [
      {
        url: '/api/maintenance/sync',
        get: true,
        callbacks: [{
          module: 'elements',
          function: 'syncMiddleware'
        }]
      },
    ];

    molecuel.setContent  = function(res, region, data) {
      res.locals = res.locals || {};
      res.locals.data = res.locals.data || {};
      res.locals.data[region] = res.locals.data[region] || {};
      res.locals.data[region] = data;
    };

    mongo = mlcl_database(molecuel);
    elastic = mlcl_elastic(molecuel);
    elements = mlcl_elements(molecuel);
    mlcl_url(molecuel);
    done();
  });

  describe('elements', function() {
    var elements;
    var app;
    var pagemodel;

    it('should initialize db connection', function(done) {
      molecuel.once('mlcl::elements::init:post', function(ele) {
        elements = ele;
        ele.should.be.a.object;
        done();
      });
      molecuel.emit('mlcl::core::init:post', molecuel);
    });

    it('should initialize the middleware', function(done) {
      app = express();
      //elements.initApplication(app);
      elements.middleware({type: 'formserver'}, app);
      app.get(elements.get);
      app.get('*',function(req, res) {
        res.send(JSON.stringify(res.locals));
      });
      app.listen(8000);
      //elements.appInitialized.should.be.true;
      done();
    });

    it('should return the registered page model', function(done) {
      pagemodel = elements.getModel('page');
      pagemodel.should.be.a.object;
      done();
    });

    var testobject;
    it('should save a object to database and let the url generate', function(done) {
      var mypage = new pagemodel();
      mypage.lang = 'en';
      mypage.title = 'This is a testpage';
      elements.save(mypage, function(err, result) {
        testobject = result;
        should.not.exist(err);
        done();
      });
    });

    it('should wait for saved objects be refreshed in index', function(done) {
      setTimeout(function() {
        done();
      }, 1000);
    });

    it('should search and return a object via url and lang', function(done) {
      elements.searchByUrl(testobject.url, 'en', function(err, result) {
        should.not.exists(err);
        should.exist(result);
        result.should.be.an.Object;
        result.hits.should.be.an.Object;
        result.hits.hits.should.be.an.Array;
        result.hits.hits[0].should.be.an.Object;
        done();
      });
    });

    it('should find and return a object via url and lang', function(done) {
      elements.findByUrl(testobject.url, 'en', function(err, result) {
        should.not.exists(err);
        should.exist(result);
        done();
      });
    });

    it('should register a type handler', function(done) {
      /**
       * register a function to handle a specific object type
       */
      elements.registerTypeHandler('page', function(req, res) {
        res.send('special page message');
      });
      assert(typeof elements.getTypeHandler('page') === 'function');
      done();
    });

    it('should unregister a type handler', function(done) {
      /**
       * register a function to handle a specific object type
       */
      elements.unregisterTypeHandler('page');
      should.not.exists(elements.getTypeHandler('page'));
      done();
    });

    it('should answer the request for the model list', function(done) {
      request('http://localhost:8000/api/models', function (error, response, body) {
        assert(response.statusCode === 200);
        var bodyres = JSON.parse(body);
        bodyres.should.be.instanceof(Array);
        assert(bodyres.length > 0);
        done();
      });
    });

    it('should answer sync function', function(done) {
      request('http://localhost:8000/api/maintenance/sync?model=page', function (error, response) {
        assert(response.statusCode === 200);
        done();
      });
    });


    after(function(done) {
      elements.database.database.connection.db.dropDatabase(function(error) {
        should.not.exists(error);
        elements.elastic.deleteIndex('*', function(error) {
          should.not.exists(error);
          done();
        });
      });
    });
  });
});
