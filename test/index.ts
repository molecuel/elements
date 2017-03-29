"use strict";
import * as assert from "assert";
import * as _ from "lodash";
import "reflect-metadata";
import * as should from "should";

import {MlclCore} from "@molecuel/core";
import {MlclDatabase, PERSISTENCE_LAYER, POPULATION_LAYER} from "@molecuel/database";
import {di, injectable} from "@molecuel/di";
import {MlclMongoDb} from "@molecuel/mongodb";
import {
  Collection,
  Element,
  IsDefined,
  MlclElements, // ,
  // ValidateType,
  // IsReferenceTo,
  // ValidateNested,
  // InArray
} from "../dist";
import * as D from "../dist";

// tslint:disable:max-classes-per-file
// tslint:disable:variable-name

let config: any = {
  molecuel: {
    databases: [{
      layer: PERSISTENCE_LAYER,
      name: "mongodb_pers",
      type: "MlclMongoDb",
      uri: "mongodb://localhost/mongodb_persistence_test" }, {
      layer: POPULATION_LAYER,
      name: "mongodb_popul",
      type: "MlclMongoDb",
      url: "mongodb://localhost/mongodb_population_test" }] } };

describe("Elements", () => {
  let el: MlclElements;

  @injectable
  @Collection("post")
  class Post extends Element {
    public static get collection(): string { return "post"; }; // code coverage setting
    @IsDefined()
    public recipient: string = "me";
  }
  @injectable
  @Collection("engines")
  class Engine extends Element {
    public get collection(): string { return "engines"; }; // code coverage setting
    @D.ValidateType()
    @IsDefined()
    public horsepower: number;
    constructor(id: number, hp?: number, elementHandler?: any) {
      super(elementHandler);
      this.horsepower = hp;
      this.id = id;
    }
  }
  @injectable
  class Wheel extends Element {
    @D.ValidateType()
    public manufacturer: string;
        constructor(manufacturer?: string, elementHandler?: any) {
      super(elementHandler);
      this.manufacturer = manufacturer;
    }
  }
  @injectable
  @Collection("cars")
  class Car extends Element {
    @D.IsReferenceTo(Engine)
    @D.ValidateType(Engine)
    @D.ValidateNested()
    public engine: any;
    @D.ValidateNested()
    public wheels: Wheel[];
    @IsDefined()
    public model: string = undefined;
    constructor(id: number, engine: Engine, wheels: Wheel[], elementHandler?: any) {
      super(elementHandler);
      this.id = id;
      this.engine = engine;
      this.wheels = wheels;
    }
  }

  before(() => {
    di.bootstrap(MlclCore, MlclDatabase, MlclMongoDb);
  });
  describe("init", () => {
    it("should start Elements", () => {
      el = di.getInstance("MlclElements", [{name: "test"}]);
      assert(el);
    });
    it("should return a list of Element extending classes\' names", () => {
      let classNames = el.getClasses();
      should.exist(classNames);
      classNames.length.should.be.above(0);
      classNames[0].should.be.type("string");
    });
    it("should not generate a new instance of unconfigured classes", () => {
      let compareInstance = el.getInstance("Robot");
      should.not.exist(compareInstance);
    });
  }); // category end
  describe("validation", () => {
    it("should NOT validate erroneous Element instances", () => {
      let post: Post = el.getInstance("Post");
      should.exist(post);
      post.should.be.instanceOf(Element);
      delete post.recipient;
      let validationResult = post.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(1);
    });
    it("should validate an Element inheriting instance", () => {
      let car: Car = el.getInstance("Car", 1);
      should.exist(car);
      car.should.be.instanceOf(Element);
      car.engine = el.getInstance("Engine", 1, 110);
      car.model = "VRM";
      let validationResult = car.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(0);
    });
  }); // category end
  describe("serialization", () => {
    it("should serialize an Element inheriting instance", () => {
      let car = el.getInstance("Car", 2);
      car.model = "M3";
      car.engine.id = 2;
      car.engine.elements = car.elements;
      let oneWheel = new Wheel("Fireyear");
      car.wheels = [oneWheel, oneWheel, oneWheel, oneWheel];
      let ser = car.toDbObject();
      let jsonSer = JSON.parse(JSON.stringify(ser));
      assert(jsonSer.id !== undefined);
      assert(jsonSer.model === "M3");
      assert(_.isEqual(ser, jsonSer));
    });
  }); // category end
  describe("deserialization", () => {
    it("should deserialize an instance to requested Element-Subclass", () => {
      @injectable
      class Robot extends Element {
        @IsDefined()
        public _id;
        @D.ValidateType()
        public arms: number;
        @D.ValidateType()
        public legs: number;
        @D.InArray(["steel", "brass", "bronze"])
        public alloy;
      }
      let carData = {
        engine: 2,
        id: 2,
        model: "M3" };
      let robotData = {
        _id: "PR0T0TYP3",
        alloy: "steel",
        arms: 2,
        legs: 2 };
      let car = el.toInstance("Car", carData);
      car.should.be.instanceOf(Car);
      assert(car.save !== undefined);
      assert(car.id === carData.id);
      assert(car.model === carData.model);
      assert(car.engine === carData.engine);
      let robot = el.toInstance("Robot", robotData);
      robot.should.be.instanceOf(Robot);
      assert(robot.save !== undefined);
      assert(robot.id === robotData._id);
      assert(robot.arms === robotData.arms);
      assert(robot.legs === robotData.legs);
      assert(robot.alloy === robotData.alloy);
    });
  }); // category end
  describe("DB interaction", () => {
    let dbHandler: MlclDatabase;
    let car: Car;
    before(async () => {
      dbHandler = di.getInstance("MlclDatabase");
      dbHandler.addDatabasesFrom(config);
      try {
        let failPost: Post = el.getInstance("Post");
        failPost.id = 42;
        let response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      try {
        let response = await el.findById({}, (<any> Post).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      try {
        let response = await el.find({}, (<any> Post).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      await dbHandler.init();
    });
    it("should not save invalid instances", async () => {
      let failEngine: Engine = el.getInstance("Engine");
      failEngine.id = "V8";
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
    });
    it("should save models without explicit colletion to one based on the model name", async () => {
      let wheel: Wheel = el.getInstance("Wheel");
      wheel.manufacturer = "Goodstone";
      let response;
      try {
        response = await wheel.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(dbHandler.persistenceDatabases.connections.length);
      for (let con of dbHandler.persistenceDatabases.connections) {
        let wheelColl = await con.database.collection(Wheel.name);
        let wheelCount = await wheelColl.count();
        wheelCount.should.equal(1);
      }
    });
    it("should save to all configured and connected databases after validation (persistence first)", async () => {
      car = el.getInstance("Car");
      car.id = 101;
      car.model = "BRM";
      car.engine = el.getInstance("Engine");
      car.engine.id = "V6";
      car.engine.horsepower = 9001;
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
    it("should not find unsaved objects", async () => {
      let response;
      try {
        response = await el.findById(404, (<any> car).collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.not.exist(response);
    });
    it("should save to a different collection upon default override", async () => {
      let response;
      let foreignPost = el.getInstance("Post");
      foreignPost.recipient = "Mars";
      Object.defineProperty(foreignPost, "collection", {
        configurable: true, get(): string {
          return "foreignPost"; } });
      try {
        response = await foreignPost.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(dbHandler.persistenceDatabases.connections.length);
      for (let con of dbHandler.persistenceDatabases.connections) {
        let fpColl = await con.database.collection((<any> foreignPost).collection);
        let fpCount = await fpColl.count();
        fpCount.should.equal(1);
      }
    });
    it("should error during save, find and findbyId (closed connection)", async () => {
      let con = dbHandler.connections[0];
      try {
        await con.database.close();
        let failPost: Post = el.getInstance("Post");
        failPost.id = 42;
        let response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
      } finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        let response = await el.findById(42, (<any> Post).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
      } finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        let response = await el.find({}, (<any> Post).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
      } finally {
        await con.database.open();
      }
    });
    it("should find the saved object", async () => {
      let response;
      try {
        response = await el.findById(101, (<any> car).collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      let carJson = car.toDbObject();
      carJson.id.should.equal(response._id);
      carJson.model.should.equal(response.model);
      carJson.engine.should.equal(response.engine);
      let newCar = el.toInstance("Car", response);
      newCar.id.should.equal(car.id);
      newCar.model.should.equal(car.model);
      newCar.engine.should.equal(car.engine.id);
      assert(_.isEqual(newCar.wheels, car.wheels));
    });
    it("should be possible to populate another database object", async () => {
      let someCar = el.getInstance("Car", 2);
      someCar.model = "M3";
      someCar.engine = "V6";
      await someCar.populate();
      assert(someCar.engine.horsepower > 9000);
    });
  }); // category end
  describe("versioning", () => {
    let oldObj = {
      firstname: "Diana",
      id: 12,
      lastname: "Brown" };
    let newObj = {
      firstname: "Diana",
      id: 12,
      lastname: "Green" };
    let newObj2 = {
      age: 22,
      eyecolor: "yellow",
      firstname: "Diana",
      id: 12,
      lastname: "Smith" };
    let diff;
    let diff2;
    it("should be possible to diff objects", () => {
      diff = el.diffObjects(oldObj, newObj);
      diff[0].op.should.equal("replace");
      diff[0].path.should.equal("/lastname");
      diff[0].value.should.equal("Brown");
    });
    it("should be possible to diff with multiple changes", () => {
      diff2 = el.diffObjects(newObj, newObj2);
      diff2[0].op.should.equal("replace");
      diff2[0].path.should.equal("/lastname");
      diff2[0].value.should.equal("Green");
      diff2[1].op.should.equal("remove");
      diff2[1].path.should.equal("/eyecolor");
      diff2[2].op.should.equal("remove");
      diff2[2].path.should.equal("/age");
    });
    it("should be possible to revert with a collection of diffs in correct order", () => {
      let patches = _.concat(diff2, diff);
      newObj2.lastname.should.equal("Smith");
      el.revertObject(newObj2, patches);
      newObj2.lastname.should.equal("Brown");
    });
  }); // category end
  after(async () => {
    let dbHandler: MlclDatabase = di.getInstance("MlclDatabase");
    for (let con of dbHandler.connections) {
      try {
        await con.database.dropDatabase();
      } catch (error) {
        should.not.exist(error);
      }
    }
  });
}); // test end
