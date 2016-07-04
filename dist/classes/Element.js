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
require('reflect-metadata');
const class_validator_1 = require('class-validator');
const _ = require('lodash');
function val() {
    console.log('koko');
    return function (target) {
        console.log('gere');
    };
}
let Element_1;
let Element = Element_1 = class Element {
    getElements() {
        return Element_1.elements;
    }
    setFactory(elements) {
        this.elements = elements;
    }
    validate() {
        return this.elements.validate(this);
    }
    toDbObject() {
        let that = _.clone(this);
        Object.keys(that).forEach((key) => {
            let isReference = Reflect.getMetadata('elements:modelref', that, key);
            if (isReference && that[key] && that[key]._id) {
                that[key] = that[key]._id;
            }
            let isDefined = Reflect.getMetadata('design:type', that, key);
            console.log(key, isDefined);
            if (!isDefined) {
                delete that[key];
            }
        });
        return that;
    }
};
__decorate([
    class_validator_1.IsDefined(), 
    __metadata('design:type', Object)
], Element.prototype, "_id", void 0);
Element = Element_1 = __decorate([
    val(), 
    __metadata('design:paramtypes', [])
], Element);
exports.Element = Element;

//# sourceMappingURL=Element.js.map
