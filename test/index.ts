'use strict'
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import {Elements} from '../dist';
import {Element} from '../dist/classes/Element';
import {Contains, IsDefined} from 'class-validator';

class Post extends Element {
  @Contains('hello')
  text: string;
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
      let mymodel: any = el.getClass('post');
      assert(mymodel.elements instanceof Elements);
    });

    it('should not validate the object', async function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'huhu';
      let errors = await testclass.validate();
      assert(errors.length > 0);
    });

    it('should validate the object', async function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      let errors = await testclass.validate();
      assert(errors.length === 0);
    });

    it('should strip a object to the allowed values only', async function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      testclass.myundefinedattr = 'huhu';
      let errors = await testclass.validate({ skipMissingProperties: true });
      console.log(Reflect.getMetadata('design:type', testclass, '_id'));
      console.log(errors);
      console.log(testclass.toDbObject());
    })
  })
});
