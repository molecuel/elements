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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
require('reflect-metadata');
const should = require('should');
const assert = require('assert');
const dist_1 = require('../dist');
const Element_1 = require('../dist/classes/Element');
const V = require('tsvalidate');
class Post extends Element_1.Element {
}
__decorate([
    V.Contains('hello'), 
    __metadata('design:type', String)
], Post.prototype, "text", void 0);
class SmallTestClass extends Element_1.Element {
    constructor(value, obj) {
        super();
        this.func = function () { };
        this.prop = value || true;
        this.obj = obj || {};
    }
    meth() {
    }
}
__decorate([
    V.MongoID(), 
    __metadata('design:type', Object)
], SmallTestClass.prototype, "prop", void 0);
describe('mlcl', function () {
    let el;
    describe('module', function () {
        it('should connect the databases', function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(15000);
                el = new dist_1.Elements();
                try {
                    yield el.connect();
                }
                catch (e) {
                    should.not.exist(e);
                }
            });
        });
        it('should register a new data model', function () {
            el.registerClass('post', Post);
            el.registerClass('test', SmallTestClass);
        });
        it('should get a class for a model name', function () {
            let myclass = el.getClass('post');
            let mymodel = new myclass();
            assert(mymodel instanceof Post);
        });
        it('should get a instance of a class', function () {
            let mymodel = el.getClassInstance('post');
            assert(mymodel instanceof Post);
        });
        it('should have a instance of Elements as static', function () {
            let mymodel = el.getClass('test');
            assert(mymodel.elements instanceof dist_1.Elements);
        });
        it('should not validate the object', function () {
            let testclass = el.getClassInstance('post');
            testclass.text = 'huhu';
            let errors = testclass.validate();
            assert(errors.length > 0);
        });
        it('should validate the object', function () {
            let testclass = el.getClassInstance('post');
            testclass.text = 'hello';
            let errors = testclass.validate();
            assert(errors.length === 0);
        });
        it('should serialize an Element-object', function () {
            let testclass = el.getClassInstance('post');
            let secondarytestclass = el.getClassInstance('post');
            testclass.text = 'hello';
            testclass._id = 'someIdValue';
            secondarytestclass.text = 'world';
            secondarytestclass._id = 'someOtherIdValue';
            try {
                testclass = testclass.toDbObject();
            }
            catch (err) {
                console.log(err.message);
                should.not.exist(err);
            }
        });
        it('should validate an array of objects and sort them into collections', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testclass1 = el.getClassInstance('test');
                let testclass2 = el.getClassInstance('post');
                testclass1.prop = 'hello';
                testclass2.text = 'world';
                testclass1._id = 'nonononotanobjectidatall';
                try {
                    yield testclass1.save().catch((err) => {
                        console.log(err);
                        should.not.exist(err);
                        return err;
                    }).then((res) => {
                        console.log(res);
                    });
                }
                catch (e) {
                    console.log(e);
                    should.not.exist(e);
                }
            });
        });
    });
});
