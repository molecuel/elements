'use strict';
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import {di, injectable} from '@molecuel/di';
import {Subject, Observable} from '@reactivex/rxjs';
import {MlclElements, Element} from '../dist';
should();

describe('elements', () => {
  let el: MlclElements;

  before(() => {
    di.bootstrap(MlclElements, Element);
  });

  describe('init', () => {
    it('should start Elements', function() {
      this.timeout(1500);
      el = di.getInstance('MlclElements', []);
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
    @injectable
    class Post extends Element {
      public recipient: string = 'me';
    }
    it('should NOT validate erroneous Element instances', () => {
      let post: Post = di.getInstance('Post');
      let validationResult = post.validate();
      should.exist(validationResult);
      validationResult.length.should.be.above(0);
    });
  }); // category end
}); // test end
