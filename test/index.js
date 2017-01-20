'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
        it('should return a list of Element extending classes\' names', () => {
            let classNames = el.getClasses();
            should.exist(classNames);
            classNames.length.should.be.above(0);
            classNames[0].should.be.type('string');
        });
    });
    describe('validation', () => {
        let Post = class Post extends dist_1.Element {
            constructor() {
                super(...arguments);
                this.recipient = 'me';
            }
        };
        Post = __decorate([
            di_1.injectable
        ], Post);
        it('should NOT validate erroneous Element instances', () => {
            let post = di_1.di.getInstance('Post');
            let validationResult = post.validate();
            should.exist(validationResult);
            validationResult.length.should.be.above(0);
        });
    });
});
