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
const di_1 = require("@molecuel/di");
let ElasticOptions = class ElasticOptions {
    constructor(url, timeout, loglevel, prefix) {
        this.url = url;
        this.timeout = timeout;
        this.loglevel = loglevel;
        this.prefix = prefix;
    }
};
ElasticOptions = __decorate([
    di_1.injectable,
    __metadata("design:paramtypes", [String, Number, String, String])
], ElasticOptions);
exports.ElasticOptions = ElasticOptions;

//# sourceMappingURL=ElasticOptions.js.map
