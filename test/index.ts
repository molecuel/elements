'use strict';
import 'reflect-metadata';
import should = require('should');
import assert = require('assert');
import {di} from '@molecuel/di';
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
            el  = di.getInstance('MlclElements', []);
            assert(el);
        });
    }); // category end
    describe('validation', () => {
        it('should NOT validate erroneous Element instances', () => {
            assert(false);
        });
    }); // category end
}); // test end
