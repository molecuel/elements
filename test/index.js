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
const ELD = require('../dist/customDecorators');
class Post extends Element_1.Element {
}
__decorate([
    V.ValidateType(),
    V.ClearValidators(), 
    __metadata('design:type', Number)
], Post.prototype, "_id", void 0);
__decorate([
    ELD.Mapping(),
    V.InArray(['hello', 'world', 'earth1', 'earth2', 'earth3', 'earth4', 'earth5']), 
    __metadata('design:type', String)
], Post.prototype, "text", void 0);
let SmallTestClass = class SmallTestClass extends Element_1.Element {
    constructor(value, obj) {
        super();
        this.func = function () { };
        this.prop = value || true;
        this.obj = obj || new Post();
    }
    meth() {
    }
};
__decorate([
    V.ValidateType(String),
    V.Contains('hello'),
    ELD.Mapping(), 
    __metadata('design:type', Object)
], SmallTestClass.prototype, "prop", void 0);
__decorate([
    ELD.Mapping(),
    V.ValidateNested(), 
    __metadata('design:type', Post)
], SmallTestClass.prototype, "obj", void 0);
SmallTestClass = __decorate([
    ELD.UseMongoCollection('Post'), 
    __metadata('design:paramtypes', [Object, Post])
], SmallTestClass);
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
        it('should register a new data model and a new elasticsearch index', function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield el.registerClass('post', Post);
                let conf = { settings: { number_of_shards: 3 } };
                yield el.registerClass('test', SmallTestClass, conf);
            });
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
        it('should NOT validate an object', function () {
            let testclass = el.getClassInstance('post');
            testclass.text = 'huhu';
            let errors = testclass.validate();
            assert(errors.length > 0);
        });
        it('should validate an object', function () {
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
                yield testclass.save(true).then((res) => {
                    (res.length).should.be.above(0);
                    assert.equal(res[0].result.ok, 1);
                    assert.equal(res[0].result.n, 1);
                    return res;
                }).catch((err) => {
                    console.log(err);
                    should.not.exist(err);
                    return err;
                });
            });
        });
        it('should validate an array of Element-objects and save them into their respective MongoDB collection(s)', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testClasses = [];
                for (let i = 0; i < 4; i++) {
                    testClasses.push(el.getClassInstance('post'));
                    testClasses[i]._id = (i + 1);
                    testClasses[i].text = ('earth' + (i + 1));
                }
                for (let i = 4; i < 6; i++) {
                    testClasses.push(el.getClassInstance('test'));
                    testClasses[i]._id = (i + 1);
                    testClasses[i].prop = ('hello' + i);
                }
                yield el.saveInstances(testClasses, true).then((res) => {
                    if (typeof res === 'object') {
                        _.each(res, (colRes) => {
                            for (let resProps in colRes) {
                                assert.equal(colRes[resProps].ok, 1);
                                (colRes[resProps].nUpserted + colRes[resProps].nModified).should.be.above(1);
                            }
                        });
                    }
                    return res;
                }).catch((err) => {
                    should.not.exist(err);
                    return err;
                });
            });
        });
        it('should get documents based off an Element-object/-model as query from the respective collection', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let testmodel = el.getClass('post');
                yield el.findByQuery(testmodel, {}).then((res) => {
                    (res.length).should.be.above(0);
                    return res;
                });
            });
        });
        it('should deserialize an array of DbObjects, selection based off an Element-object/-model as query from the respective collection', function () {
            return __awaiter(this, void 0, void 0, function* () {
                let result = [];
                let testmodel = el.getClass('post');
                yield el.findByQuery(testmodel, {}).then((res) => {
                    for (let doc of res) {
                        result.push(doc);
                        doc.should.be.instanceOf(Element_1.Element);
                    }
                    (result.length).should.be.above(0);
                    return res;
                });
            });
        });
        after(function (done) {
            el.getMongoConnection().dropDatabase(function (error) {
                should.not.exists(error);
                el.getElasticConnection().indices.delete({ index: '*' }, function (error) {
                    should.not.exists(error);
                    done();
                });
            });
        });
    });
});
