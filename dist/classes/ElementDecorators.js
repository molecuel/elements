"use strict";
class Decorators {
    static get NOT_FOR_POPULATION() { return 'NotForPopulation'; }
    static get INDEX_MAPPING() { return 'Mapping'; }
    static get USE_PERSISTANCE_TABLE() { return 'UsePersistanceTable'; }
    static get USE_ELASTIC_TYPE() { return 'UseElasticType'; }
}
exports.Decorators = Decorators;
exports.METADATAKEY = 'mlcl_elements:validators';
function Mapping() {
    return function (target, propertyName) {
        let metadata = Reflect.getMetadata(exports.METADATAKEY, target);
        if (!metadata) {
            metadata = [];
        }
        metadata.push({
            type: Decorators.INDEX_MAPPING,
            property: propertyName
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.Mapping = Mapping;
function NotForPopulation() {
    return function (target, propertyName) {
        let metadata = Reflect.getMetadata(exports.METADATAKEY, target);
        if (!metadata) {
            metadata = [];
        }
        metadata.push({
            type: Decorators.NOT_FOR_POPULATION,
            property: propertyName
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.NotForPopulation = NotForPopulation;
function UsePersistanceTable(collection) {
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
            type: Decorators.USE_PERSISTANCE_TABLE,
            property: className,
            value: collection
        });
        Reflect.defineMetadata(exports.METADATAKEY, metadata, target);
    };
}
exports.UsePersistanceTable = UsePersistanceTable;
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

//# sourceMappingURL=ElementDecorators.js.map
