'use strict';
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import * as _ from 'lodash';
import {di, injectable} from '@molecuel/di';
import * as V from 'tsvalidate';
// import {Subject, Observable} from '@reactivex/rxjs';
import {MlclElements, Element} from '../dist';
should();

describe('Elements', () => {
  let el: MlclElements;

  before(() => {
    di.bootstrap();
  });

  @injectable
  class Post extends Element {
    public recipient: string = 'me';
  }
  @injectable
  class Engine extends Element {
    constructor(id: number, hp?: number) {
      super(...[...arguments].slice(Engine.length)); // DON'T FORGET!!
      this.horsepower = hp;
      this.id = id;
    }
    @V.ValidateType()
    @V.IsDefined()
    public horsepower: number;
  }
  @injectable
  class Car extends Element {
    constructor(id: number, engine: Engine) {
      super(...[...arguments].slice(Car.length)); // DON'T FORGET!!
      this.engine = engine;
      this.id = id;
    }
    @V.ValidateType(Engine)
    @V.ValidateNested()
    public engine: any;
  }

  describe('init', () => {
    it('should start Elements', function() {
      this.timeout(1500);
      el = di.getInstance('MlclElements', [1]);
      assert(el);
    });
    it('should return a list of Element extending classes\' names', () => {
      let classNames = el.getClasses();
      should.exist(classNames);
      classNames.length.should.be.above(0);
      classNames[0].should.be.type('string');
    });
  }); // category end
  describe('validation', () => {
    it('should NOT validate erroneous Element instances', () => {
      let post: Post = el.getInstance('Post');
      should.exist(post);
      post.should.be.instanceOf(Element);
      let validationResult = post.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(1);
    });
    it('should validate an Element inheriting instance', () => {
      let car: Car = el.getInstance('Car', 1, el.getInstance('Engine', 1, 110));
      should.exist(car);
      car.should.be.instanceOf(Element);
      let validationResult = car.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(0);
    });
  }); // category end
  describe('serialization', () => {
    it('should serialize an Element inheriting instance', () => {
      let car = el.getInstance('Car', 2, undefined);
      car.engine.id = 2;
      car.engine.elements = car.elements;
      let ser = car.toDbObject();
      let jsonSer = JSON.parse(JSON.stringify(ser));
      assert(_.isEqual(ser, jsonSer));
    });
  }); // category end
  describe('database interaction', () => {
    // it('should save an Element inheriting instance', async function() {
    //   this.timeout(1500);
    //   let post: Post = di.getInstance('Post', el);
    //   should.exist(post);
    //   try {
    //     let response = await post.save();
    //     should.exist(response);
    //   }
    //   catch (err) {
    //     should.not.exist(err);
    //   }
    // });
    // it('should get an Element inheriting instance by id', async function() {
    //   this.timeout(1500);
    //   let id = 'd1515da1d';
    //   try {
    //     let response = await el.getInstanceById(id);
    //     should.exist(response);
    //   }
    //   catch (err) {
    //     should.not.exist(err);
    //   }
    // });
  }); // category end
}); // test end
