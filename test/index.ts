'use strict';
import should = require('should');
import assert = require('assert');
import {Elements, Element} from '../dist';
import 'reflect-metadata';
import {Contains} from "class-validator";

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
    })

    it('should have a instance of Elements as static', function() {
      let mymodel: any = el.getClass('post');
      console.log(mymodel.elements);
    })
  })
});
