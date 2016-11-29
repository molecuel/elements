'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
require('reflect-metadata');
const _ = require('lodash');
const TSV = require('tsvalidate');
const ELD = require('./elementDecorators');
var Element_1 = require('./classes/Element');
exports.Element = Element_1.Element;
class Elements {
    constructor(mlcl, config) {
        this.elementStore = new Map();
    }
    registerClass(name, definition, indexSettings) {
        return __awaiter(this, void 0, void 0, function* () {
            definition.elements = this;
            this.elementStore.set(name, definition);
        });
    }
    getClass(name) {
        return this.elementStore.get(name);
    }
    getClassInstance(name) {
        let elementClass = this.elementStore.get(name);
        let classInstance = new elementClass();
        classInstance.setFactory(this);
        return classInstance;
    }
    validate(instance) {
        let validator = new TSV.Validator();
        return validator.validate(instance);
    }
    toDbObject(element) {
        return this.toDbObjRecursive(element, false);
    }
    toDbObjRecursive(obj, nested) {
        let that = obj;
        let result = {};
        let objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, that);
        let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function (o) {
            return o.property;
        });
        for (let key in that) {
            if (Object.hasOwnProperty.call(that, key)
                && that[key] !== undefined
                && propertiesValidatorDecorators[key]) {
                if (key === '_id'
                    && !nested) {
                    result[key] = that[key];
                }
                else if (typeof that[key] === 'object') {
                    result[key] = this.toDbObjRecursive(that[key], true);
                }
                else if (typeof that[key] !== 'function') {
                    result[key] = that[key];
                }
            }
        }
        return result;
    }
    containsIDocuments(obj) {
        let template = {
            collection: 'collectionName',
            documents: []
        };
        for (let prop in template) {
            if (!(prop in obj)) {
                return false;
            }
        }
        return true;
    }
    validateAndSort(instances) {
        let errors = [];
        let collections = {};
        for (let instance of instances) {
            let metadata = Reflect.getMetadata(ELD.METADATAKEY, instance.constructor);
            let collectionName = instance.constructor.name;
            _.each(metadata, (entry) => {
                if ('type' in entry
                    && entry.type === ELD.Decorators.USE_MONGO_COLLECTION
                    && 'value' in entry
                    && 'property' in entry
                    && entry.property === instance.constructor.name) {
                    collectionName = entry.value;
                }
            });
            if (instance.validate().length === 0) {
                if (!collections[collectionName]) {
                    collections[collectionName] = [instance.toDbObject()];
                }
                else {
                    collections[collectionName].push(instance.toDbObject());
                }
            }
            else {
                errors = errors.concat(instance.validate());
            }
        }
        if (errors.length > 0) {
            return Promise.reject(errors);
        }
        else {
            return Promise.resolve(collections);
        }
    }
    saveInstances(instances, upsert = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (instances.length === 1) {
                if (instances[0].validate().length > 0) {
                    return Promise.reject(instances[0].validate());
                }
                else {
                    let metadata = Reflect.getMetadata(ELD.METADATAKEY, instances[0].constructor);
                    let collectionName = instances[0].constructor.name;
                    _.each(metadata, (entry) => {
                        if ('type' in entry
                            && entry.type === ELD.Decorators.USE_MONGO_COLLECTION
                            && 'value' in entry
                            && 'property' in entry
                            && entry.property === instances[0].constructor.name) {
                            collectionName = entry.value;
                            console.log(collectionName);
                        }
                    });
                }
            }
            else {
            }
        });
    }
    getMappingProperties(model) {
        let result = {};
        let propertyDecorators = _.concat(Reflect.getMetadata(TSV.METADATAKEY, new model()), Reflect.getMetadata(ELD.METADATAKEY, new model()));
        _.each(propertyDecorators, (decorator) => {
            if (decorator && _.find(propertyDecorators, function (checkedDecorator) {
                return (checkedDecorator
                    && checkedDecorator.property === decorator.property
                    && checkedDecorator.type === ELD.Decorators.INDEX_MAPPING
                    && checkedDecorator.property !== model.name
                    && checkedDecorator.property !== '_id');
            }) && !_.find(propertyDecorators, function (checkedDecorator) {
                return (checkedDecorator
                    && checkedDecorator.property === decorator.property
                    && checkedDecorator.type === ELD.Decorators.NOT_FOR_ELASTIC
                    && checkedDecorator.property !== model.name
                    && checkedDecorator.property !== '_id');
            })) {
                if (!result['properties']) {
                    result = { properties: {} };
                }
                if (_.find(propertyDecorators, (checkedDecorator) => {
                    return (checkedDecorator
                        && checkedDecorator.property === decorator.property
                        && checkedDecorator.type === TSV.DecoratorTypes.NESTED);
                })) {
                    result['properties'][decorator.property] = this.getMappingProperties(Reflect.getMetadata('design:type', new model(), decorator.property));
                }
                else if (!result['properties'][decorator.property]) {
                    result['properties'][decorator.property] = { type: _.get(this.getPropertyType(model, decorator.property, propertyDecorators), decorator.property) };
                }
            }
        });
        return result;
    }
    getPropertyType(model, property, decorators) {
        let result = {};
        _.each(decorators, (decorator) => {
            if (decorator && !result[property]
                && decorator.property === property) {
                switch (decorator.type) {
                    case TSV.DecoratorTypes.IS_INT:
                        result[property] = 'integer';
                        break;
                    case TSV.DecoratorTypes.IS_FLOAT:
                    case TSV.DecoratorTypes.IS_DECIMAL:
                        result[property] = 'float';
                        break;
                    case TSV.DecoratorTypes.IP_ADDRESS:
                    case TSV.DecoratorTypes.MAC_ADDRESS:
                    case TSV.DecoratorTypes.EMAIL:
                    case TSV.DecoratorTypes.ALPHA:
                        result[property] = 'string';
                        break;
                    case TSV.DecoratorTypes.DATE:
                    case TSV.DecoratorTypes.DATE_AFTER:
                    case TSV.DecoratorTypes.DATE_BEFORE:
                    case TSV.DecoratorTypes.DATE_ISO8601:
                        result[property] = 'date';
                        break;
                }
            }
        });
        if (!result[property]) {
            switch (Reflect.getMetadata('design:type', new model(), property).name) {
                case 'String':
                    result[property] = 'string';
                    break;
                case 'Number':
                    result[property] = 'integer';
                    break;
                case 'Boolean':
                    result[property] = 'boolean';
                    break;
                case 'Object':
                default:
                    result[property] = 'object';
                    break;
            }
        }
        return result;
    }
}
Elements.loaderversion = 2;
exports.Elements = Elements;

//# sourceMappingURL=index.js.map
