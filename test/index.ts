'use strict';
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import * as _ from 'lodash';
import * as V from 'tsvalidate';
import {di, injectable} from '@molecuel/di';
import {MlclCore} from '@molecuel/core';
import {MlclMongoDb} from '@molecuel/mongodb';
import {MlclDatabase, PERSISTENCE_LAYER, POPULATION_LAYER} from '@molecuel/database';
import {MlclElements, Element} from '../dist';
// import * as ELD from '../dist/classes/ElementDecorators';
should();

let config: any = {
  molecuel: {
    databases: [{
      name: 'mongodb_pers',
      type: 'MlclMongoDb',
      uri: 'mongodb://localhost/mongodb_persistence_test',
      layer: PERSISTENCE_LAYER
    }, {
      name: 'mongodb_popul',
      type: 'MlclMongoDb',
      url: 'mongodb://localhost/mongodb_population_test',
      layer: POPULATION_LAYER
    }]
  }
};

describe('Elements', () => {
  let el: MlclElements;

  @injectable
  class Post extends Element {
    public static get collection(): string { return 'Post'; };
    public recipient: string = 'me';
  }
  @injectable
  class Engine extends Element {
    public static get collection(): string { return 'Engines'; };
    constructor(id: number, hp?: number) {
      super(); // super(...[...arguments].slice(Engine.length)); // use to manually inject parent class dependencies
      this.horsepower = hp;
      this.id = id;
    }
    @V.ValidateType()
    @V.IsDefined()
    public horsepower: number;
  }
  @injectable
  class Wheels {
    public static get collection(): string { return 'Wheels'; };
    constructor(count?: number, manufacturer?: string) {
      this.count = count;
      this.manufacturer = manufacturer;
    }
    @V.IsInt()
    public count: number;
    @V.ValidateType()
    public manufacturer: string;
  }
  @injectable
  class Car extends Element {
    public static get collection(): string { return 'Cars'; };
    constructor(id: number, engine: Engine, wheels: Wheels) {
      super();
      this.id = id;
      this.engine = engine;
      this.wheels = wheels;
    }
    // @ELD.IsReferenceTo(Engine);
    @V.ValidateType(Engine)
    @V.ValidateNested()
    public engine: any;
    @V.ValidateNested()
    public wheels: Wheels;
    @V.IsDefined()
    public model: string = undefined;
  }

  before(() => {
    di.bootstrap(MlclCore, MlclDatabase, MlclMongoDb);
  });
  describe('init', () => {
    it('should start Elements', function() {
      this.timeout(1500);
      el = di.getInstance('MlclElements', [{name: 'test'}]);
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
      car.model = 'VRM';
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
      car.wheels = new Wheels(4, 'Fireyear');
      let ser = car.toDbObject();
      let jsonSer = JSON.parse(JSON.stringify(ser));
      assert(jsonSer.id !== undefined);
      assert(jsonSer.model === 'M3');
      assert(_.isEqual(ser, jsonSer));
    });
  }); // category end
  describe('deserialization', () => {
    let carObject = {
      id: 2,
      model: 'M3',
      engine: 2
    };
    it('should deserialize an instance to requested Element-Subclass', () => {
      let car = el.toInstance('Car', carObject);
      // check if element
      car.should.be.instanceOf(Car);
      // console.log(car);
      assert(car.save !== undefined);
      assert(car.id === 2);
      assert(car.model === 'M3');
      assert(car.engine === 2);
    });
  }); // category end
  describe('DB interaction', () => {
    let dbHandler: MlclDatabase;
    let car: Car;
    before(async () => {
      dbHandler = di.getInstance('MlclDatabase');
      dbHandler.addDatabasesFrom(config);
      await dbHandler.init();
    });
    it('should not save invalid or collection-less instances', async () => {

    });
    it('should save to all configured and connected databases after validation (persistence first)', async () => {
      // console.log(Reflect.getMetadata(ELD.METADATAKEY, Car));
      car = el.getInstance('Car');
      car.id = 101;
      car.model = 'BRM';
      car.engine = el.getInstance('Engine');
      car.engine.id = 'V6';
      Object.defineProperty(car, 'collection', { configurable: true, get: function() { return 'Cars'; }}); // define instance getter
      let response;
      try {
        response = await car.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
    });
    it('should find the saved object', async () => {
      let response;
      try {
        response = await el.findById(101, Car.collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      let carJson = car.toDbObject();
      carJson.id.should.equal(response._id);
      carJson.model.should.equal(response.model);
      carJson.engine.should.equal(response.engine);
      let newCar = el.toInstance('Car', response);
      newCar.id.should.equal(car.id);
      newCar.model.should.equal(car.model);
      newCar.engine.should.equal(car.engine.id);
      assert(_.isEqual(newCar.wheels, car.wheels));
    });
    it('should not find unsaved objects', async () => {

    });
  //   it('should be possible to populate another database object', async () => {
  //     let car = el.getInstance('Car', 2);
  //     car.model = 'M3';
  //     car.engine = 2;
  //     await car.populate('engine');
  //     assert(car.engine.id === 2);
  //   });
  }); // category end
  describe('versioning', () => {
    let oldObj = {
        id: 12,
        firstname: 'Diana',
        lastname: 'Brown'
      };
    let newObj = {
      id: 12,
      firstname: 'Diana',
      lastname: 'Green'
    };
    let newObj2 = {
      id: 12,
      firstname: 'Diana',
      lastname: 'Smith',
      age: 22,
      eyecolor: 'yellow'
    };
    let diff;
    let diff2;
    it('should be possible to diff objects', () => {
      diff = el.diffObjects(oldObj, newObj);
      assert(diff[0].op === 'replace');
      assert(diff[0].path === '/lastname');
      assert(diff[0].value === 'Brown');
    });
    it('should be possible to diff with multiple changes', () => {
      diff2 = el.diffObjects(newObj, newObj2);
      assert(diff2[0].op === 'remove');
      assert(diff2[0].path === '/eyecolor');
      assert(diff2[1].op === 'remove');
      assert(diff2[1].path === '/age');
      assert(diff2[2].op === 'replace');
      assert(diff2[2].path === '/lastname');
      assert(diff2[2].value === 'Green');
    });
    it('should be possible to revert with a collection of diffs in correct order', () => {
      let patches = _.concat(diff2, diff);
      assert(newObj2.lastname === 'Smith');
      el.revertObject(newObj2, patches);
      assert(newObj2.lastname === 'Brown');
    });
  }); // category end
}); // test end
