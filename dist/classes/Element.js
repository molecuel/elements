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
require("reflect-metadata");
const MlclElements_1 = require("./MlclElements");
const TSV = require("tsvalidate");
const di_1 = require("@molecuel/di");
let Element = class Element {
    constructor(elements) {
        this.elements = elements;
    }
    getFactory() {
        return this.elements;
    }
    setFactory(elements) {
        this.elements = elements;
    }
    validate() {
        return this.elements.validate(this);
    }
    save(upsert) {
        if (!upsert) {
            upsert = false;
        }
        return this.elements.saveInstances([this], upsert);
    }
    toDbObject() {
        return this.elements.toDbObject(this);
    }
};
__decorate([
    TSV.IsDefined(),
    __metadata("design:type", Object)
], Element.prototype, "id", void 0);
Element = __decorate([
    di_1.injectable,
    __metadata("design:paramtypes", [MlclElements_1.MlclElements])
], Element);
exports.Element = Element;

//# sourceMappingURL=Element.js.map
