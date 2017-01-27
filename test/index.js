'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
require("reflect-metadata");
const should = require("should");
const assert = require("assert");
const _ = require("lodash");
const di_1 = require("@molecuel/di");
const V = require("tsvalidate");
const dist_1 = require("../dist");
should();
describe('Elements', () => {
    let el;
    before(() => {
        di_1.di.bootstrap();
    });
    let Post = class Post extends dist_1.Element {
        constructor() {
            super(...arguments);
            this.recipient = 'me';
        }
    };
    Post = __decorate([
        di_1.injectable
    ], Post);
    let Engine = Engine_1 = class Engine extends dist_1.Element {
        constructor(id, hp) {
            super(...[...arguments].slice(Engine_1.length));
            this.horsepower = hp;
            this.id = id;
        }
    };
    __decorate([
        V.ValidateType(),
        V.IsDefined(),
        __metadata("design:type", Number)
    ], Engine.prototype, "horsepower", void 0);
    Engine = Engine_1 = __decorate([
        di_1.injectable,
        __metadata("design:paramtypes", [Number, Number])
    ], Engine);
    let Car = Car_1 = class Car extends dist_1.Element {
        constructor(id, engine) {
            super(...[...arguments].slice(Car_1.length));
            this.engine = engine;
            this.id = id;
        }
    };
    __decorate([
        V.ValidateType(Engine),
        V.ValidateNested(),
        __metadata("design:type", Object)
    ], Car.prototype, "engine", void 0);
    Car = Car_1 = __decorate([
        di_1.injectable,
        __metadata("design:paramtypes", [Number, Engine])
    ], Car);
    describe('init', () => {
        it('should start Elements', function () {
            this.timeout(1500);
            el = di_1.di.getInstance('MlclElements', [1]);
            assert(el);
        });
        it('should return a list of Element extending classes\' names', () => {
            let classNames = el.getClasses();
            should.exist(classNames);
            classNames.length.should.be.above(0);
            classNames[0].should.be.type('string');
        });
    });
    describe('validation', () => {
        it('should NOT validate erroneous Element instances', () => {
            let post = el.getInstance('Post');
            should.exist(post);
            post.should.be.instanceOf(dist_1.Element);
            let validationResult = post.validate();
            should.exist(validationResult);
            validationResult.length.should.equal(1);
        });
        it('should validate an Element inheriting instance', () => {
            let car = el.getInstance('Car', 1, el.getInstance('Engine', 1, 110));
            should.exist(car);
            car.should.be.instanceOf(dist_1.Element);
            let validationResult = car.validate();
            should.exist(validationResult);
            validationResult.length.should.equal(0);
        });
    });
    describe('serialization', () => {
        it('should serialize an Element inheriting instance', () => {
            let car = el.getInstance('Car', 2, undefined);
            car.engine.id = 2;
            car.engine.elements = car.elements;
            let ser = car.toDbObject();
            let jsonSer = JSON.parse(JSON.stringify(ser));
            assert(_.isEqual(ser, jsonSer));
        });
    });
    describe('database interaction', () => {
    });
    var Engine_1, Car_1;
});
