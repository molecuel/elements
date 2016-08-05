'use strict';
import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { IValidatorError, ValidateType, MongoID } from 'tsvalidate';
// import _ = require('lodash');

export class Element implements IElement {
  @ValidateType()
  // @Equals(false)cd..
  @MongoID()
  public _id: any;
  public elements: Elements;
  public static elements: Elements;
  public getElements(): Elements {
    return Element.elements;
  }
  public setFactory(elements) {
    this.elements = elements;
  }
  public validate(): IValidatorError[] {
    return this.elements.validate(this);
  }
  public save(): Promise<any> {
    return this.elements.saveInstances([this]);
  }
  public toDbObject(subElement?: any): any {
    let that = subElement || this;
    let result: any = Object.create(that);

    for (let key in that) {
      let hasValidatorDecorator = Reflect.getMetadata('tsvalidate:validators', that, key);
      // check for non-prototype, validator-decorated property
      if (({}).hasOwnProperty.call(that, key)
        && that[key] !== undefined
        && typeof hasValidatorDecorator !== 'undefined') {

        // check for _id
        if (key === '_id'
          && typeof subElement === 'undefined') {

          result[that.constructor.name] = that[key];
        }
        // check if the property is an object
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
