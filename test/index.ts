"use strict";
process.env.configpath = "./test/config/";
import * as assert from "assert";
import * as _ from "lodash";
import * as should from "should";

import {di, injectable} from "@molecuel/di";
import {MlclMongoDb} from "@molecuel/mongodb";
import {
  Collection,
  Element,
  IsDefined,
  MlclElements,
  NotForPopulation, // ,
  // ValidateType,
  // IsReferenceTo,
  // ValidateNested,
  // InArray
} from "../dist";
import * as D from "../dist";

// tslint:disable:max-classes-per-file
// tslint:disable:variable-name

describe("Elements", () => {
  let el: MlclElements;

  @injectable
  @Collection("post")
  class Post extends Element {
    // public static get collection(): string {
    //   return "post";
    // }
    @IsDefined()
    public recipient: string = "me";
  }
  @injectable
  @Collection("cylinders")
  @NotForPopulation()
  class Cylinder extends Element {
    @IsDefined()
    public displacementCapacity: number;
    constructor(capacity: number, elementHandler?: MlclElements) {
      super(elementHandler);
      this.displacementCapacity = capacity;
    }
  }
  @injectable
  @Collection("engines")
  class Engine extends Element {
    // public get collection(): string {
    //   return "engines";
    // }
    @D.ValidateType()
    @IsDefined()
    public horsepower: number;
    @D.ValidateType()
    @NotForPopulation()
    @D.IsReferenceTo(Cylinder)
    public cylinders: Cylinder;
    constructor(id: number, cylinderType: Cylinder, hp?: number, elementHandler?: MlclElements) {
      super(elementHandler);
      this.cylinders = cylinderType;
      this.horsepower = hp;
      this.id = id;
    }
  }
  @injectable
  @Collection("hubcaps")
  class Hubcap extends Element {
    @D.ValidateType()
    public diameter: number;
  }
  @injectable
  class Wheel extends Element {
    @D.ValidateType()
    public manufacturer: string;
    @D.ValidateType(Hubcap)
    @D.IsReferenceTo(Hubcap)
    public hubcap: Hubcap;
    constructor(manufacturer?: string, hubcap?: Hubcap, elementHandler?: MlclElements) {
      super(elementHandler);
      this.hubcap = hubcap;
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
    @D.IsReferenceTo(Wheel)
    public wheels: Wheel[];
    @IsDefined()
    public model: string = undefined;
    constructor(id: number, engine: Engine, wheels: Wheel[], elementHandler?: MlclElements) {
      super(elementHandler);
      this.id = id;
      this.engine = engine;
      this.wheels = wheels;
    }
  }

  before(async () => {
    di.bootstrap(MlclMongoDb);
    process.env.configpath = "./test/empty";
    const cfgHandler = di.getInstance("MlclConfig");
    cfgHandler.readConfig();
    el = di.getInstance("MlclElements");
    const success = await el.init();
    assert(success === false);
    el = undefined;
    process.env.configpath = "./test/config/";
    cfgHandler.readConfig();
  });
  describe("init", () => {
    it("should start Elements", async () => {
      el = di.getInstance("MlclElements"); // alternatively: el = new MlclElements();
      assert(el);
    });
    it("should return a list of Element extending classes\' names", () => {
      const classNames = el.getClasses();
      should.exist(classNames);
      classNames.length.should.be.above(0);
      classNames[0].should.be.type("string");
    });
    it("should not generate a new instance of unconfigured classes", () => {
      const compareInstance = el.getInstance("Robot");
      should.not.exist(compareInstance);
    });
  }); // category end
  describe("validation", () => {
    it("should NOT validate erroneous Element instances", () => {
      const post: Post = el.getInstance("Post");
      should.exist(post);
      post.should.be.instanceOf(Element);
      delete post.recipient;
      const validationResult = post.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(1);
    });
    it("should validate an Element inheriting instance", () => {
      const car: Car = el.getInstance("Car", 1);
      should.exist(car);
      car.should.be.instanceOf(Element);
      car.engine.id = 1;
      car.engine.horsepower = 110;
      car.model = "VRM";
      const validationResult = car.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(0);
    });
    it("should respect decorator functions being applied to any properties during runtime", () => {
      const post = el.getInstance("Post");
      post.applyDecorators("sender", IsDefined());
      el.applyDecorators(Post, "sender", D.ValidateType(String));
      const validationResult = post.validate();
      should.exist(validationResult);
      validationResult.length.should.equal(1);
    });
  }); // category end
  describe("versioning", () => {
    const oldObj = {
      firstname: "Diana",
      id: 12,
      lastname: "Brown" };
    const newObj = {
      firstname: "Diana",
      id: 12,
      lastname: "Green" };
    const newObj2 = {
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
      const patches = _.concat(diff2, diff);
      newObj2.lastname.should.equal("Smith");
      el.revertObject(newObj2, patches);
      newObj2.lastname.should.equal("Brown");
    });
  }); // category end
  describe("serialization", () => {
    it("should serialize an Element inheriting instance", () => {
      const car = el.getInstance("Car", 2);
      car.model = "M3";
      car.engine.id = 2;
      car.engine.elements = car.elements;
      const oneWheel = new Wheel("Fireyear");
      car.wheels = [oneWheel, oneWheel, oneWheel, oneWheel];
      const ser = car.toDbObject();
      const jsonSer = JSON.parse(JSON.stringify(ser));
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
      const carData = {
        engine: 2,
        id: 2,
        model: "M3" };
      const robotData = {
        _id: "PR0T0TYP3",
        alloy: "steel",
        arms: 2,
        legs: 2 };
      const car = el.toInstance("Car", carData);
      car.should.be.instanceOf(Car);
      assert(car.save !== undefined);
      assert(car.id === carData.id);
      assert(car.model === carData.model);
      assert(car.engine === carData.engine);
      const robot = el.toInstance("Robot", robotData);
      robot.should.be.instanceOf(Robot);
      assert(robot.save !== undefined);
      assert(robot.id === robotData._id);
      assert(robot.arms === robotData.arms);
      assert(robot.legs === robotData.legs);
      assert(robot.alloy === robotData.alloy);
    });
  }); // category end
  describe("DB interaction", () => {
    let car: Car;
    let wheel: Wheel;
    before(async () => {
      try {
        const failPost: Post = el.getInstance("Post");
        failPost.id = 42;
        const response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      try {
        const response = await el.findById({}, (Post as any).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      try {
        const response = await el.find({}, (Post as any).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      try {
        const failPost: Post = el.getInstance("Post");
        failPost.id = 42;
        await failPost.populate();
      } catch (error) {
        should.exist(error);
        should.exist(error.message);
        error.message.should.equal("No connected databases.");
      }
      const success = await el.init();
      assert(success);
    });
    it("should not save invalid instances", async () => {
      const failEngine: Engine = el.getInstance("Engine");
      failEngine.id = "V8";
      failEngine.horsepower = undefined;
      let  response;
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
      wheel = el.getInstance("Wheel");
      wheel.manufacturer = "Goodstone";
      delete wheel.hubcap;
      let response;
      try {
        response = await wheel.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
      for (const con of el.dbHandler.persistenceDatabases.connections) {
        const wheelColl = await con.database.collection(Wheel.name);
        const wheelCount = await wheelColl.count();
        wheelCount.should.equal(1);
      }
    });
    // tslint:disable-next-line:only-arrow-functions
    it("should save to all configured and connected databases after validation (persistence first)", async function() {
      this.timeout(3750);
      wheel.id = "basic";
      wheel.hubcap = el.getInstance("Hubcap");
      wheel.hubcap.id = "N7";
      wheel.hubcap.diameter = 12.5;
      car = el.getInstance("Car");
      car.id = 101;
      car.model = "BRM";
      car.engine.id = "V6";
      car.engine.horsepower = 9001;
      car.engine.cylinders.id = 69;
      car.engine.cylinders.displacementCapacity = 330;
      car.wheels = [wheel, wheel, wheel, wheel];
      let response;
      try {
        response = await wheel.hubcap.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
      try {
        response = await wheel.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
      try {
        response = await car.engine.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
      try {
        response = await car.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(1);
    });
    it("should not find unsaved objects", async () => {
      let response;
      try {
        response = await el.findById(404, (car as any).collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.not.exist(response);
    });
    it("should respect decorator functions being applied to a class during runtime", async () => {
      el.applyDecorators(Post, undefined, NotForPopulation());
      const post = el.getInstance("Post");
      post.sender = "me";
      post.recipient = "you";
      let response;
      let hitsPersistence;
      let hitsPopulation;
      try {
        response = await post.save();
        hitsPersistence = await el.dbHandler.persistenceDatabases.find({}, post.collection);
        hitsPopulation = await el.dbHandler.populationDatabases.find({}, post.collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(hitsPersistence);
      should.exist(hitsPopulation);
      hitsPersistence.should.be.instanceOf(Array);
      hitsPopulation.should.be.instanceOf(Array);
      hitsPersistence.length.should.be.above(0);
      hitsPopulation.length.should.equal(0);
    });
    it("should save to a different collection upon default override", async () => {
      let response;
      el.applyDecorators(Post, undefined, Collection("foreignPost"));
      const foreignPost = el.getInstance("Post");
      foreignPost.recipient = "Mars";
      foreignPost.sender = "Earth";
      try {
        response = await foreignPost.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(el.dbHandler.persistenceDatabases.connections.length);
      for (const con of el.dbHandler.persistenceDatabases.connections) {
        const fpColl = await con.database.collection("foreignPost");
        const fpCount = await fpColl.count();
        fpCount.should.equal(1);
      }
      foreignPost.collection = "planetaryPost";
      try {
        response = await foreignPost.save();
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      should.exist(response.successCount);
      response.successCount.should.equal(el.dbHandler.persistenceDatabases.connections.length);
      for (const con of el.dbHandler.persistenceDatabases.connections) {
        const fpColl = await con.database.collection("planetaryPost");
        const fpCount = await fpColl.count();
        fpCount.should.equal(1);
      }
    });
    it("should error during save, find and findbyId (closed connection)", async () => {
      const con = el.dbHandler.connections[0];
      try {
        await con.database.close();
        const failPost: Post = el.getInstance("Post");
        failPost.id = 42;
        const response = await failPost.save();
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
      } finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        const response = await el.findById(42, (Post as any).collection);
        should.not.exist(response);
      } catch (error) {
        should.exist(error);
      } finally {
        await con.database.open();
      }
      try {
        await con.database.close();
        const response = await el.find({}, (Post as any).collection);
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
        response = await el.findById(101, (car as any).collection);
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
      const carJson = car.toDbObject();
      carJson.id.should.equal(response._id);
      carJson.model.should.equal(response.model);
      carJson.engine.should.equal(response.engine);
      const newCar = el.toInstance("Car", response);
      newCar.id.should.equal(car.id);
      newCar.model.should.equal(car.model);
      newCar.engine.should.equal(car.engine.id);
      assert(newCar.wheels.length === car.wheels.length);
    });
    it("should be possible to populate another database object", async () => {
      const someCar = el.getInstance("Car", 2);
      someCar.model = "M3";
      someCar.engine = "V6";
      someCar.wheels = [wheel.id, wheel.id];
      await someCar.populate();
      should.exist(someCar.engine);
      should.exist(someCar.engine.horsepower);
      someCar.engine.horsepower.should.be.above(9000);
      should.exist(someCar.wheels);
      someCar.wheels.should.be.instanceOf(Array);
      someCar.wheels.length.should.equal(2);
      someCar.wheels.forEach((entry) => {
        should.exist(entry.id);
        should.exist(entry.hubcap);
        entry.hubcap.should.be.instanceOf(Hubcap);
      });
    });
    it("should store a class instance to persistence only if marked accordingly", async () => {
      let response;
      const someCylinder = el.getInstance("Cylinder");
      someCylinder.id = "Type45";
      someCylinder.displacementCapacity = 330;
      try {
        response = await someCylinder.save();
        should.exist(response);
        let hits = await el.dbHandler.persistenceDatabases.find({}, someCylinder.collection);
        should.exist(hits);
        hits.should.be.instanceOf(Array);
        hits.length.should.equal(1);
        hits[0]._id.should.equal(someCylinder.id);
        hits = await el.dbHandler.populationDatabases.find({}, someCylinder.collection);
        should.exist(hits);
        hits.should.be.instanceOf(Array);
        hits.length.should.equal(0);
      } catch (error) {
        should.not.exist(error);
      }
      should.exist(response);
    });
    it("should not populate a reference if marked accordingly", async () => {
      const someEngine: Engine = el.getInstance("Engine");
      (someEngine as any).cylinders = "Type45";
      try {
        await someEngine.populate("cylinders");
      } catch (error) {
        should.not.exist(error);
      }
      assert(!(someEngine.cylinders instanceof Element));
      someEngine.cylinders.should.be.type("string");
    });
    after(async () => {
      const dbHandler = el.dbHandler;
      if (dbHandler && dbHandler.connections) {
        for (const con of dbHandler.connections) {
          try {
            await con.database.dropDatabase();
          } catch (error) {
            should.not.exist(error);
          }
        }
      }
    });
  }); // category end
}); // test end
