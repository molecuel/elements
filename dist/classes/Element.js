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
const tsvalidate_1 = require('tsvalidate');
class Element {
    getElements() {
        return Element.elements;
    }
    setFactory(elements) {
        this.elements = elements;
    }
    validate() {
        return this.elements.validate(this);
    }
    save() {
        return this.elements.saveInstances([this]);
    }
    toDbObject(subElement) {
        let that = subElement || this;
        let result = Object.create(that);
        for (let key in that) {
            let hasValidatorDecorator = Reflect.getMetadata('tsvalidate:validators', that, key);
            if (({}).hasOwnProperty.call(that, key)
                && that[key] !== undefined
                && typeof hasValidatorDecorator !== 'undefined') {
                if (key === '_id'
                    && typeof subElement === 'undefined') {
                    result[that.constructor.name] = that[key];
                }
                else if (typeof that[key] === 'object') {
                    result[key] = Element.prototype.toDbObject(that[key]);
                }
                else if (typeof that[key] !== 'function') {
                    result[key] = that[key];
                }
            }
        }
        return result;
    }
}
__decorate([
    tsvalidate_1.ValidateType(),
    tsvalidate_1.MongoID(), 
    __metadata('design:type', Object)
], Element.prototype, "_id", void 0);
exports.Element = Element;

//# sourceMappingURL=Element.js.map
