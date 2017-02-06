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
      super(); // super(...[...arguments].slice(Engine.length)); // use to autoinject parent class dependencies
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
      super();
      this.engine = engine;
      this.id = id;
    }
    @V.ValidateType(Engine)
    @V.ValidateNested()
    public engine: any;
    public model: string;
  }

  describe('init', () => {
    it('should start Elements', function() {
      this.timeout(1500);
      el = di.getInstance('MlclElements', [{name: 'test', idPattern: '_id'}]);
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
      let car: Car = el.getInstance('Car', 1);
      should.exist(car);
      car.should.be.instanceOf(Element);
      car.engine = el.getInstance('Engine', 1, 110);
      let validationResult = car.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(0);
    });
  }); // category end
  describe('serialization', () => {
    it('should serialize an Element inheriting instance', () => {
      let car = el.getInstance('Car', 2);
      car.model = 'M3';
      car.engine.id = 2;
      car.engine.elements = car.elements;
      let ser = car.toDbObject();
      console.log(ser);
      let jsonSer = JSON.parse(JSON.stringify(ser));
      console.log(jsonSer);
      assert(_.isEqual(ser, jsonSer));
    });
  }); // category end
}); // test end
