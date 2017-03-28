'use strict';
import 'reflect-metadata';
import * as should from 'should';
import * as assert from 'assert';
import * as _ from 'lodash';
import {di, injectable} from '@molecuel/di';
import {MlclCore} from '@molecuel/core';
import {MlclDatabase, PERSISTENCE_LAYER, POPULATION_LAYER} from '@molecuel/database';
import {MlclMongoDb} from '@molecuel/mongodb';
import {
  MlclElements,
  Element,
  Collection,
  IsDefined,
  ValidateType,
  IsReferenceTo,
  ValidateNested,
  InArray
} from '../dist';

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
  @Collection('post')
  class Post extends Element {
    // public static get collection(): string { return 'post'; };
    @IsDefined()
    public recipient: string = 'me';
  }
  @injectable
  @Collection('engines')
  class Engine extends Element {
    // public static get collection(): string { return 'engines'; };
    constructor(id: number, hp?: number, elementHandler?: any) {
      super(elementHandler);
      this.horsepower = hp;
      this.id = id;
    }
    @ValidateType()
    @IsDefined()
    public horsepower: number;
  }
  @injectable
  class Wheel {
    constructor(manufacturer?: string) {
      this.manufacturer = manufacturer;
    }
    @ValidateType()
    public manufacturer: string;
  }
  @injectable
  @Collection('cars')
  class Car extends Element {
    constructor(id: number, engine: Engine, wheels: Wheel[], elementHandler?: any) {
      super(elementHandler);
      this.id = id;
      this.engine = engine;
      this.wheels = wheels;
    }
    @IsReferenceTo(Engine)
    @ValidateType(Engine)
    @ValidateNested()
    public engine: any;
    @ValidateNested()
    public wheels: Wheel[];
    @IsDefined()
    public model: string = undefined;
  }

  before(() => {
    (<any>di).bootstrap(MlclCore, MlclDatabase, MlclMongoDb);
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
    it('should not generate a new instance of unconfigured classes', () => {
      let compareInstance = el.getInstance('Robot');
      should.not.exist(compareInstance);
    });
  }); // category end
  describe('validation', () => {
    it('should NOT validate erroneous Element instances', () => {
      let post: Post = el.getInstance('Post');
      should.exist(post);
      post.should.be.instanceOf(Element);
      delete post.recipient;
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
      let oneWheel = new Wheel('Fireyear');
      car.wheels = [oneWheel, oneWheel, oneWheel, oneWheel];
      let ser = car.toDbObject();
      let jsonSer = JSON.parse(JSON.stringify(ser));
      assert(jsonSer.id !== undefined);
      assert(jsonSer.model === 'M3');
      assert(_.isEqual(ser, jsonSer));
    });
  }); // category end
  describe('deserialization', () => {
    it('should deserialize an instance to requested Element-Subclass', () => {
      @injectable
      class Robot extends Element {
        @IsDefined()
        public _id;
        @ValidateType()
        public arms: number;
        @ValidateType()
        public legs: number;
        @InArray(['steel', 'brass', 'bronze'])
        public alloy;
      }
       let carData = {
        id: 2,
        model: 'M3',
        engine: 2
      };
      let robotData = {
        _id: 'PR0T0TYP3',
        arms: 2,
        legs: 2,
        alloy: 'steel'
      };
      let car = el.toInstance('Car', carData);
      car.should.be.instanceOf(Car);
      assert(car.save !== undefined);
      assert(car.id === carData.id);
      assert(car.model === carData.model);
      assert(car.engine === carData.engine);
      let robot = el.toInstance('Robot', robotData);
      robot.should.be.instanceOf(Robot);
      assert(robot.save !== undefined);
      assert(robot.id === robotData._id);
      assert(robot.arms === robotData.arms);
      assert(robot.legs === robotData.legs);
      assert(robot.alloy === robotData.alloy);
    });
  }); // category end
  describe('DB interaction', () => {
    let dbHandler: MlclDatabase;
    let car: Car;
    before(async () => {
      dbHandler = di.getInstance('MlclDatabase');
      dbHandler.addDatabasesFrom(config);
      try {
        let failPost: Post = el.getInstance('Post');
        failPost.id = 42;
        let response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal('No connected databases.');
      }
      try {
        let response = await el.findById({}, Post['collection']);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal('No connected databases.');
      }
      try {
        let response = await el.find({}, Post['collection']);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal('No connected databases.');
      }
      await dbHandler.init();
    });
    it('should not save invalid or collection-less instances', async () => {
      let failEngine: Engine = el.getInstance('Engine');
      failEngine.id = 'V8';
      failEngine.horsepower = undefined;
      let response;
      try {
        response = await failEngine.save();
      } catch (error) {
        should.exist(error);
        should.exist(error.errors);
        error.errors.length.should.be.above(0);
      }
      should.not.exist(response);
      delete failEngine['collection'];
      try {
        response = await failEngine.save();
      } catch (error) {
        should.exist(error);
      }
      should.not.exist(response);
    });
    it('should save to all configured and connected databases after validation (persistence first)', async () => {
      car = el.getInstance('Car');
      car.id = 101;
      car.model = 'BRM';
      car.engine = el.getInstance('Engine');
      car.engine.id = 'V6';
      car.engine.horsepower = 9001;
      Object.defineProperty(car, 'collection', { configurable: true, get: function() { return 'cars'; }}); // define instance getter
      let response;
      try {
        response = await car.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(dbHandler.persistenceDatabases.connections.length);
      let engine = car.engine;
      try {
        response = await engine.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(dbHandler.persistenceDatabases.connections.length);
    });
    it('should not find unsaved objects', async () => {
      let response;
      try {
        response = await el.findById(404, car['collection']);
      } catch (error) {
        should.not.exist(error);
      }
      should.not.exist(response);
    });
    it('should error during save, find and findbyId (permissions)', async () => {
      let con = dbHandler.connections[0];
      try {
        await con.database.close();
        let failPost: Post = el.getInstance('Post');
        failPost.id = 42;
        let response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        // console.log(error);
        // should.exist(error.message);
        // error.message.should.equal('No connected databases.');
      }
      finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        let response = await el.findById(42, Post['collection']);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        // console.log(error);
        // should.exist(error.message);
        // error.message.should.equal('No connected databases.');
      }
      finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        let response = await el.find({}, Post['collection']);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        // console.log(error);
        // should.exist(error.message);
        // error.message.should.equal('No connected databases.');
      }
      finally {
        await con.database.open();
      }
    });
    it('should find the saved object', async () => {
      let response;
      try {
        response = await el.findById(101, car['collection']);
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
      it('should be possible to populate another database object', async () => {
        let car = el.getInstance('Car', 2);
        car.model = 'M3';
        car.engine = 'V6';
        await car.populate();
        assert(car.engine.horsepower > 9000);
      });
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
  after(async () => {
    let dbHandler: MlclDatabase = di.getInstance('MlclDatabase');
    for (let con of dbHandler.connections) {
      try {
        await con.database.dropDatabase();
      } catch (error) {
        should.not.exist(error);
      }
    }
  });
}); // test end
