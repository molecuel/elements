'use strict';
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import {di, injectable} from '@molecuel/di';
import * as V from 'tsvalidate';
// import {Subject, Observable} from '@reactivex/rxjs';
import {MlclElements, Element} from '../dist';
should();

describe('elements', () => {
  let el: MlclElements;

  before(() => {
    di.bootstrap();
  });

  @injectable
  class Post extends Element {
    public recipient: string = 'me';
  }
  @injectable
  class Engine {
    constructor(id, hp?: number) {
      this.horsepower = hp;
    }
  // class Engine extends Element {
  //   constructor(id, hp?: number) {
  //     super(...[...arguments].slice(Engine.length)); // DON'T FORGET!!
  //     this.horsepower = hp;
  //     super.id = id;
  //   }
    @V.ValidateType()
    @V.IsDefined()
    public horsepower: number;
  }
  @injectable
  class Car extends Element {
    constructor(id, engine: any) {
      super(...[...arguments].slice(Car.length)); // DON'T FORGET!!
      this.engine = engine;
      super.id = id;
    }
    @V.ValidateType(Engine)
    @V.ValidateNested()
    public engine: any;
  }

  describe('init', () => {
    it('should start Elements', function() {
      this.timeout(1500);
      el = di.getInstance('MlclElements', []);
      assert(el);
      // console.log(Car.toString());
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
      let elem: Element = di.getInstance('Element');
      elem.should.be.instanceOf(Element);
      let validationResult = elem.validate();
      should.exist(validationResult);
      // console.log([Element.prototype, Object.getPrototypeOf(Element), validationResult]);
      validationResult.length.should.equal(1);
    });
    it('should validate an Element inheriting instance', () => {
      let car: Car = di.getInstance('Car', 1, di.getInstance('Engine', 1, 110), 'someValueNotRelevantForConstructor');
      car.should.be.instanceOf(Element);
      car.id = 1;
      let validationResult = car.validate();
      // console.log(validationResult);
      should.exist(validationResult);
      validationResult.length.should.equal(0);
    });
  }); // category end
  describe('serialization', () => {
    // it('should serialize an Element inheriting instance', () => {
    //   let car = di.getInstance('Car', 2, di.getInstance('Engine', 2, 120));
    //   car.id = 2;
    //   let ser = car.toDbObject();
    //   console.log([car, ser]);
    // });
  }); // category end
}); // test end
