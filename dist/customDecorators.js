"use strict";
class Decorators {
    static get NOT_FOR_ELASTIC() { return 'NotForElastic'; }
    static get USE_MONGO_COLLECTION() { return 'UseMongoCollection'; }
    static get USE_ELASTIC_TYPE() { return 'UseElasticType'; }
}
exports.Decorators = Decorators;
exports.METADATAKEY = 'mlcl_elements:validators';
function NotForElastic() {
    return function (target, propertyName) {
        let metadata = Reflect.getMetadata(exports.METADATAKEY, target);
        if (!metadata) {
            metadata = [];
        }
        metadata.push({
            type: Decorators.NOT_FOR_ELASTIC,
            property: propertyName
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.NotForElastic = NotForElastic;
function UseMongoCollection(collection) {
    return function (target) {
        let input = target;
        let className;
        if ('prototype' in input) {
            className = input.prototype.constructor.name;
        }
        else {
            className = input.constructor.name;
        }
        let metadata = Reflect.getMetadata(exports.METADATAKEY, target);
        if (!metadata) {
            metadata = [];
        }
        metadata.push({
            type: Decorators.USE_MONGO_COLLECTION,
            property: className,
            value: collection
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.UseMongoCollection = UseMongoCollection;
function UseElasticType(type) {
    return function (target) {
        let input = target;
        let className;
        if ('prototype' in input) {
            className = input.prototype.constructor.name;
        }
        else {
            className = input.constructor.name;
        }
        let metadata = Reflect.getMetadata(exports.METADATAKEY, target);
        if (!metadata) {
            metadata = [];
        }
        metadata.push({
            type: Decorators.USE_ELASTIC_TYPE,
            property: className,
            value: type
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.UseElasticType = UseElasticType;

//# sourceMappingURL=customDecorators.js.map
