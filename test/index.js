'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const should = require('should');
const elements = require('../dist');
describe('mlcl', function () {
    let el;
    describe('module', function () {
        it('should connect the databases', function () {
            return __awaiter(this, void 0, void 0, function* () {
                this.timeout(15000);
                el = new elements();
                try {
                    yield el.connect();
                }
                catch (e) {
                    should.not.exist(e);
                }
            });
        });
    });
});
