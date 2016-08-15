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
let BSON = require('bson');
require('reflect-metadata');
const mongodb = require('mongodb');
const should = require('should');
const assert = require('assert');
const _ = require('lodash');
const dist_1 = require('../dist');
const Element_1 = require('../dist/classes/Element');
const V = require('tsvalidate');
class Post extends Element_1.Element {
}
__decorate([
    V.ValidateType(),
    V.ClearValidators(), 
    __metadata('design:type', Number)
], Post.prototype, "_id", void 0);
__decorate([
    V.InArray(['hello', 'world']), 
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
    V.Contains('hello'), 
    __metadata('design:type', Object)
], SmallTestClass.prototype, "prop", void 0);
describe('mlcl', function () {
    let el;
    let bson = new BSON.BSONPure.BSON();
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
        it('should NOT validate the object', function () {
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
            let secondarytestclass = { _id: 1, text: 'hello' };
            let testclass = el.getClassInstance('post');
            testclass._id = 1;
            testclass.text = 'hello';
            try {
                assert(_.isEqual(testclass.toDbObject(), secondarytestclass));
                assert(_.isEqual(bson.serialize(testclass.toDbObject()), bson.serialize(secondarytestclass)));
            }
            catch (err) {
                console.log(err);
                should.not.exist(err);
            }
        });
        it('should validate an Element-object and save it into its respective MongoDB collection', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testclass = el.getClassInstance('post');
                testclass.text = 'hello';
                testclass._id = 1;
                try {
                    yield el.getMongoConnection().dropCollection('Post');
                }
                catch (err) {
                    if (!(err instanceof mongodb.MongoError)) {
                        throw err;
                    }
                }
                yield testclass.save().then((res) => {
                    (res.length).should.be.above(0);
                    assert.equal(res[0].result.ok, 1);
                    assert.equal(res[0].result.n, 1);
                    return res;
                }).catch((err) => {
                    should.not.exist(err);
                    return err;
                });
            });
        });
        it('should NOT validate an Element-object, thus not saving it into its respective MongoDB collection', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testclass = el.getClassInstance('post');
                testclass.text = 'hello';
                testclass._id = 'invalidId';
                try {
                    yield el.getMongoConnection().dropCollection('Post');
                }
                catch (err) {
                    if (!(err instanceof mongodb.MongoError)) {
                        throw err;
                    }
                }
                yield testclass.save().then((res) => {
                    should.not.exist(res);
                    return res;
                }).catch((err) => {
                    should.exist(err);
                    (err.length).should.be.above(0);
                    return err;
                });
            });
        });
        it('should validate an array of Element-objects and save them into their respective MongoDB collection(s)', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testclass1 = el.getClassInstance('post');
                let testclass2 = el.getClassInstance('post');
                testclass1.text = 'hello';
                testclass2.text = 'world';
                testclass1._id = 1;
                testclass2._id = 2;
                try {
                    yield el.getMongoConnection().dropCollection('Post');
                }
                catch (err) {
                    if (!(err instanceof mongodb.MongoError)) {
                        throw err;
                    }
                }
                yield el.instanceSaveWrapper([testclass1, testclass2]).then((res) => {
                    if (typeof res === 'object') {
                        assert.equal(res[0].result.ok, 1);
                        (res[0].result.n).should.be.above(1);
                    }
                    return res;
                }).catch((err) => {
                    should.not.exist(err);
                    return err;
                });
            });
        });
        it('should get a document based off an Element-object/-model as query from the respective collection', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testmodel = el.getClass('post');
                yield el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
                    (res).should.be.above(0);
                });
                yield el.getMongoDocuments(testmodel, {}).then((res) => {
                    (res.documents.length).should.be.above(0);
                    return res;
                });
            });
        });
        it('should deserialize an array of DbObjects', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let result = [];
                let testmodel = el.getClass('post');
                yield el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
                    (res).should.be.above(0);
                });
                yield el.getMongoDocuments(testmodel, {}).then((res) => {
                    for (let doc of res.documents) {
                        result.push(el.toElementArray(doc)[0]);
                        (result[(result.length - 1)]).should.be.instanceOf(Element_1.Element);
                    }
                    (result.length).should.be.above(0);
                    return res;
                });
            });
        });
        it('should deserialize an IDocuments-based object', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let result = [];
                let testmodel = el.getClass('post');
                yield el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
                    (res).should.be.above(0);
                });
                yield el.getMongoDocuments(testmodel, {}).then((res) => {
                    result = el.toElementArray(res);
                    for (let doc of result) {
                        (doc).should.be.instanceOf(testmodel);
                    }
                    (result.length).should.be.above(0);
                    return res;
                });
            });
        });
    });
});
