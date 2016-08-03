'use strict';
import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { IValidatorError, ValidateType, MongoID } from 'tsvalidate';
// import _ = require('lodash');

export class Element implements IElement {
  @ValidateType()
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
  public toDbObject(subElement?: any): any {
    let that = subElement || this;
    let result: any = {};
    // try {
    //   if (Element.prototype.validate().length > 0) {
    //     return Element.prototype.validate();
    //   }
    // }
    // catch (err) {
    //   return err;
    // }

    for (let key in that) {
      if (({}).hasOwnProperty.call(that, key)) {

        // check if the property is a reference
        // let isReference = Reflect.getMetadata('elements:modelref', that, key);
        // if (isReference && that[key] && that[key]._id) {
        //   result[key] = that[key]._id;
        // }
        if (typeof that['_id'] !== 'undefined'
          && typeof subElement === 'undefined') {

          result._id = that['_id'];
        }
        // check if is defined
        if (that[key] !== undefined
          && typeof that[key] === 'object') {

          // check if the property is decorated
          let isDecorated = Reflect.getMetadata('design:type', that, key);
          if (isDecorated !== undefined) {
            result[key] = Element.prototype.toDbObject(that[key]);
          }
        }
        else if (that[key] !== undefined
          && typeof that[key] !== 'function') {
          result[key] = that[key];
        }
      }
    }

    return result;
  }
}
