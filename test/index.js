'use strict';
require("reflect-metadata");
const should = require("should");
const assert = require("assert");
const di_1 = require("@molecuel/di");
const dist_1 = require("../dist");
should();
describe('elements', () => {
    let el;
    before(() => {
        di_1.di.bootstrap(dist_1.MlclElements, dist_1.Element);
    });
    describe('init', () => {
        it('should start Elements', function () {
            this.timeout(1500);
            el = di_1.di.getInstance('MlclElements', []);
            assert(el);
        });
    });
    describe('validation', () => {
        it('should NOT validate erroneous Element instances', () => {
            assert(false);
        });
    });
});
