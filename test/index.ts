'use strict'
let BSON = require('bson');
import 'reflect-metadata';
import mongodb = require('mongodb');
import should = require('should');
import assert = require('assert');
import _ = require('lodash');
import { Elements } from '../dist';
import { Element } from '../dist/classes/Element';
import { IElement } from '../dist/interfaces/IElement';
import * as V from 'tsvalidate';
import * as ELD from '../dist/classes/ElementDecorators';

class Post extends Element {
  @V.ValidateType()
  @V.ClearValidators()
  _id: number;
  @ELD.Mapping()
  @V.InArray(['hello', 'world', 'earth1', 'earth2', 'earth3', 'earth4', 'earth5'])
  text: string;
}

@ELD.UsePersistanceTable('Post')
class SmallTestClass extends Element {
  constructor(value?: any, obj?: Post) {
    super();
    this.prop = value || true;
    this.obj = obj || new Post();
  }
  @V.ValidateType(String)
  @V.Contains('hello')
  @ELD.Mapping()
  prop: any;
  @ELD.Mapping()
  @V.ValidateNested()
  obj: Post;
  func: any = function() { };
  public meth() {

  }
}

describe('mlcl', function() {
  let el: Elements;
  let bson = new BSON.BSONPure.BSON();

  describe('module', function() {
    it('should start elements', async function() {
      this.timeout(15000);
      el = new Elements();
    });

    it('should register a new data model and a new elasticsearch index', async function() {
      await el.registerClass('post', Post);
      // let conf = { settings: { number_of_shards: 3 } };
      // console.log(SmallTestClass['obj']);
      await el.registerClass('test', SmallTestClass, true);
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

    it('should NOT validate an object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'huhu';
      let errors = testclass.validate();
      assert(errors.length > 0);
    });

    it('should validate an object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      let errors = testclass.validate();
      assert(errors.length === 0);
    });

    it('should serialize an Element-object', function() {
      let secondarytestclass: any = { _id: 1, text: 'hello' };
      let testclass: any = el.getClassInstance('post');
      testclass._id = 1;
      testclass.text = 'hello';

      try {
        // // factory-generated instance
        // console.log((testclass).toDbObject());
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
  })
});
