'use strict'
let BSON = require('bson');
import 'reflect-metadata';
import mongodb = require('mongodb');
import should = require('should');
import assert = require('assert');
import _ = require('lodash');
import { Elements } from '../dist';
import { Element } from '../dist/classes/Element';
import { IElement } from '../dist/interfaces/IElement';
import * as V from 'tsvalidate';

class Post extends Element {
  @V.ValidateType()
  @V.ClearValidators()
  _id: number;
  @V.InArray(['hello', 'world', 'earth1', 'earth2', 'earth3', 'earth4', 'earth5'])
  text: string;
}

class SmallTestClass extends Element {
  constructor(value?: any, obj?: Object) {
    super();
    this.prop = value || true;
    this.obj = obj || {};
  }
  @V.Contains('hello')
  prop: any;
  obj: Object;
  func: any = function() { };
  public meth() {

  }
}

describe('mlcl', function() {
  let el: Elements;
  let bson = new BSON.BSONPure.BSON();

  describe('module', function() {
    it('should connect the databases', async function() {
      this.timeout(15000);
      el = new Elements();
      console.log(el);
      try {
        await el.connect();
      } catch (e) {
        should.not.exist(e);
      }

    });

    it('should register a new data model', function() {
      el.registerClass('post', Post);
      el.registerClass('test', SmallTestClass);

    });

    it('should get a class for a model name', function() {
      let myclass: any = el.getClass('post');
      let mymodel = new myclass();
      assert(mymodel instanceof Post);

    });

    it('should get a instance of a class', function() {
      let mymodel = el.getClassInstance('post');
      assert(mymodel instanceof Post);

    });

    it('should have a instance of Elements as static', function() {
      let mymodel: any = el.getClass('test');
      assert(mymodel.elements instanceof Elements);

    });

    it('should NOT validate the object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'huhu';
      let errors = testclass.validate();
      assert(errors.length > 0);

    });

    it('should validate the object', function() {
      let testclass: any = el.getClassInstance('post');
      testclass.text = 'hello';
      let errors = testclass.validate();
      assert(errors.length === 0);

    });

    it('should serialize an Element-object', function() {
      let secondarytestclass: any = { _id: 1, text: 'hello' };
      let testclass: any = el.getClassInstance('post');
      testclass._id = 1;
      testclass.text = 'hello';

      try {
        // // factory-generated instance
        // console.log((testclass).toDbObject());
        // console.log(bson.serialize(testclass.toDbObject()));
        //
        // // locally defined instance
        // console.log(secondarytestclass);
        // console.log(bson.serialize(secondarytestclass));

        assert(_.isEqual(testclass.toDbObject(), secondarytestclass));
        assert(_.isEqual(bson.serialize(testclass.toDbObject()), bson.serialize(secondarytestclass)));
      }
      catch (err) {
        console.log(err);
        should.not.exist(err);
      }

    });

    it('should NOT validate an Element-object, thus not saving it into its respective MongoDB collection',
      async function() {
        let testclass: any = el.getClassInstance('post');
        testclass.text = 'hello';
        testclass._id = 'invalidId';

        try {
          await el.getMongoConnection().dropCollection('Post');
        }
        catch (err) {
          if (!(err instanceof mongodb.MongoError)) {
            throw err;
          }
        }

        await testclass.save().then((res) => {
          should.not.exist(res);
          return res;
        }).catch((err) => {
          should.exist(err);
          (err.length).should.be.above(0);
          return err;
        });

      });

    it('should validate an Element-object and save it into its respective MongoDB collection',
      async function() {
        let testclass: any = el.getClassInstance('post');
        testclass.text = 'hello';
        testclass._id = 1;

        try {
          await el.getMongoConnection().dropCollection('Post');
        }
        catch (err) {
          if (!(err instanceof mongodb.MongoError)) {
            throw err;
          }
        }
        // console.log(testclass.toDbObject());
        await testclass.save(true).then((res) => {
          (res.length).should.be.above(0);
          assert.equal(res[0].result.ok, 1);
          assert.equal(res[0].result.n, 1);
          return res;
        }).catch((err) => {
          console.log(err);
          should.not.exist(err);
          return err;
        });
        // let doc = await el.getMongoConnection().collection('Post').findOne({ _id: testclass._id });
        // console.log(doc);

      });

    it('should validate an array of Element-objects and save them into their respective MongoDB collection(s)',
      async function() {
        let testClasses: any[] = [];
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
        let testclass1: any = el.getClassInstance('post');
        let testclass2: any = el.getClassInstance('post');
        testclass1.text = 'hello';
        testclass2.text = 'world';
        testclass2._id = 1;
        testclass1._id = 2;

        // try {
        //   await el.getMongoConnection().dropCollection('Post');
        // }
        // catch (err) {
        //   if (!(err instanceof mongodb.MongoError)) {
        //     throw err;
        //   }
        // }

        // let docs = await el.getMongoConnection().collection('Post').find({}).toArray()
        // console.log(docs);
        // console.log([testclass1.toDbObject(), testclass2.toDbObject()]);

        // await el.saveInstances([testclass1, testclass2], true).then((res) => {
        await el.saveInstances(testClasses, true).then((res) => {
          if (typeof res === 'object') {
            // for (let prop in res[0]) {
            //   if (typeof res[0][prop] !== 'function')
            //     console.log(prop + ': ' + res[0][prop]);
            // }
            console.log(res);
            assert.equal(res[0].ok, 1);
            (res[0].nUpserted + res[0].nModified).should.be.above(1);
          }
          return res;
        }).catch((err) => {
          should.not.exist(err);
          return err;
        });

        // docs = await el.getMongoConnection().collection('Post').find({}).toArray()
        // console.log(docs);

      });

    it('should get documents based off an Element-object/-model as query from the respective collection', async function() {
      let testmodel: any = el.getClass('post');

      await el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
        (res).should.be.above(0);
      })
      await el.findByQuery(testmodel, {}).then((res) => {
        // console.log(res);
        (res.length).should.be.above(0);
        return res;
      });

    });

    it('should deserialize an array of DbObjects, selection based off an Element-object/-model as query from the respective collection', async function() {
      let result: IElement[] = [];
      let testmodel: any = el.getClass('post');

      await el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
        (res).should.be.above(0);
      })
      await el.findByQuery(testmodel, {}).then((res) => {
        for (let doc of res) {
          result.push(doc);
          doc.should.be.instanceOf(Element);
        }
        (result.length).should.be.above(0);
        return res;
      });

    });
    /*
    it('should deserialize an IDocuments-based object', async function() {
      let result: IElement[] = [];
      let testmodel: any = el.getClass('post');

      await el.getMongoConnection().collection(testmodel.prototype.constructor.name).count().then((res) => {
        (res).should.be.above(0);
      })
      await el.getMongoDocuments(testmodel, {}).then((res) => {
        result = el.toElementArray(res);
        for (let doc of result) {
          (doc).should.be.instanceOf(testmodel);
        }
        (result.length).should.be.above(0);
        return res;
      });

    });
    */
    after(function(done) {
      el.getMongoConnection().dropDatabase(function(error) {
        should.not.exists(error);
        // elements.elastic.deleteIndex('*', function(error) {
        //   should.not.exists(error);
        // });
        done();
      });
    });
  })
});
