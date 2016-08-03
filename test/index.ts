'use strict'
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import { Elements } from '../dist';
import { Element } from '../dist/classes/Element';
import * as V from 'tsvalidate';

class Post extends Element {
  @V.Contains('hello')
  text: string;
}

class SmallTestClass extends Element {
  constructor(value?: any, obj?: Object) {
    super();
    this.prop = value || true;
    this.obj = obj || {};
  }
  @V.ValidateType()
  @V.Equals(true)
  prop: any;
  obj: Object;
  func: any = function() { };
  public meth() {

  }
}

describe('mlcl', function() {
  let el: Elements;

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
      el.registerClass('test', Post);
    });

    it('should get a class for a model name', function() {
      let myclass: any = el.getClass('post');
      let mymodel = new myclass();
      assert(mymodel instanceof Post);
    });

    it('should get a instance of a class', function() {
      let mymodel = el.getClassInstance('post');
      console.log('prop' in mymodel);
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

    it('should serialize an Element-object', function() {
      let testclass: any = el.getClassInstance('post');
      // let secondarytestclass: any = el.getClassInstance('post');
      // testclass.text = 'hello';
      // secondarytestclass.text = 'world';
      // let testclass: any = new SmallTestClass('hello', new SmallTestClass('world'));

      testclass.text = 'hello';
      testclass._id = 'someId';
      try {
        testclass = testclass.toDbObject();
        console.log(testclass);
      }
      catch (err) {
        console.log(err.message);
        should.not.exist(err);
      }

    });

    // it('should validate an array of objects, create required and get all collections of an active mongoConnection', async function() { // , sort them into collections and create missing collections
    // let testclass1: any = el.getClassInstance('post');
    // let testclass2: any = el.getClassInstance('post');
    // testclass1.text = 'hello';
    // testclass2.text = 'world';
    // try {
    //   await el.saveInstances([testclass1, testclass2]).catch((err) => {
    //     console.log(err);
    //     return err;
    //   });
    //   el.mongoClose();
    // el.getCollections().then((data) => {
    //   console.log(data);
    //   return data;
    // });
    // let collection: any = await el.mongoConnection.collection('config.projectPrefix_Post');
    // await collection.count().then((qty) => {
    //   console.log(qty);
    //   return qty;
    // });
    // }
    // catch (e) {
    //   console.log(e);
    //   should.not.exist(e);
    // }
    // });

  })
});
