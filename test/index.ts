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
  @V.Contains('hello')
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

    it('should serialize an Element-object', function() {
      let testclass: any = el.getClassInstance('post');
      let secondarytestclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      testclass._id = 'someIdValue';
      secondarytestclass.text = 'world';
      secondarytestclass._id = 'someOtherIdValue';

      try {
        testclass = testclass.toDbObject();
      }
      catch (err) {
        console.log(err.message);
        should.not.exist(err);
      }
    });

    it('should validate an array of objects and save them into their respective MongoDB collection(s)',
      async function() { // , sort them into collections and create missing collections
        let testclass1: any = el.getClassInstance('post');
        let testclass2: any = el.getClassInstance('test');
        testclass1.text = 'hello';
        testclass2.prop = 'world';
        testclass1._id = '000000000000000000000001';
        testclass2._id = '000000000000000000000002';

        await testclass1.save().then((res) => {
          assert(res === 'Success');
          return res;
        }).catch((err) => {
          should.not.exist(err);
          return err;
        });
        let col: any = await el.mongoConnection.collection('config.projectPrefix_Post');
        // console.log(col);
        await col.count().then((qty) => {
          // console.log(qty);
          assert(qty > 0);
          return qty;
        });
      });

  })
});
