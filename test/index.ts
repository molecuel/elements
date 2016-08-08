'use strict'
let BSON = require('bson');
import 'reflect-metadata';
import mongodb = require('mongodb');
import should = require('should');
import assert = require('assert');
import _ = require('lodash');
import { Elements } from '../dist';
import { Element } from '../dist/classes/Element';
import * as V from 'tsvalidate';

class Post extends Element {
  @V.InArray(['hello', 'world'])
  text: string;
}

class SmallTestClass extends Element {
  constructor(value?: any, obj?: Object) {
    super();
    this.prop = value || true;
    this.obj = obj || {};
  }
  @V.Contains('hello')
  prop: any;
  obj: Object;
  func: any = function() { };
  public meth() {

  }
}

describe('mlcl', function() {
  let el: Elements;
  let bson = new BSON.BSONPure.BSON();

  describe('module', function() {
    it('should connect the databases', async function() {
      this.timeout(15000);
      el = new Elements();
      try {
        await el.connect();
      } catch (e) {
        should.not.exist(e);
      }
    });

    it('should register a new data model', function() {
      el.registerClass('post', Post);
      el.registerClass('test', SmallTestClass);
    });

    it('should get a class for a model name', function() {
      let myclass: any = el.getClass('post');
      let mymodel = new myclass();
      assert(mymodel instanceof Post);
    });

    it('should get a instance of a class', function() {
      let mymodel = el.getClassInstance('post');
      assert(mymodel instanceof Post);
    });

    it('should have a instance of Elements as static', function() {
      let mymodel: any = el.getClass('test');
      assert(mymodel.elements instanceof Elements);
    });

    it('should not validate the object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'huhu';
      let errors = testclass.validate();
      assert(errors.length > 0);
    });

    it('should validate the object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      let errors = testclass.validate();
      assert(errors.length === 0);
    });

    it('should ready an Element-object for serialization', function() {
      let secondarytestclass: any = { text: 'hello', _id: 1 };
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      testclass._id = 1;

      try {
        // // factory-generated instance
        // console.log(testclass.toDbObject());
        // console.log(bson.serialize(testclass.toDbObject()));
        //
        // // locally defined instance
        // console.log(secondarytestclass);
        // console.log(bson.serialize(secondarytestclass));

        assert(_.isEqual(testclass.toDbObject(), secondarytestclass));
        assert(_.isEqual(bson.serialize(testclass.toDbObject()), bson.serialize(secondarytestclass)));
      }
      catch (err) {
        console.log(err);
        should.not.exist(err);
      }
    });

    it('should validate an Element-object and save it into its respective MongoDB collection',
      async function() {
        let col: any;
        let testclass1: any = el.getClassInstance('post');
        let testclass2: any = el.getClassInstance('test');
        testclass1.text = 'hello';
        testclass2.prop = 'world';
        testclass1._id = 1;
        testclass2._id = 2;

        try {
          await el.getMongoConnection().dropCollection('config.projectPrefix_Post');
        }
        catch (err) {
          if (!(err instanceof mongodb.MongoError)) {
            throw err;
          }
        }

        await testclass1.save().then((res) => {
          assert(typeof res === 'number'
            && res > 0);
          console.log('return value: ' + res);
          return res;
        }).catch((err) => {
          should.not.exist(err);
          return err;
        });
        // await col.insertOne(testclass1.toDbObject());
        // await col.insertOne({ text: 'hello', _id: 9 });
        await el.getMongoConnection().collection('config.projectPrefix_Post').count().then((qty) => {
          // console.log(qty);
          assert(qty > 0);
          return qty;
        });
      });

  })
});
