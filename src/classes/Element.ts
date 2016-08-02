'use strict';
import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { IValidatorError, IsDefined } from 'tsvalidate';
import _ = require('lodash');

function val() {
  console.log('koko');
  return function(target: any) {
    console.log('gere');
  };
}

@val()
export class Element implements IElement {
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
    let that = _.clone(subElement) || _.clone(this);

    // Object.keys(that).forEach((key) => {
    for (let key in that) {
      // check if the property is a reference
      let isReference = Reflect.getMetadata('elements:modelref', that, key);
      if (isReference && that[key] && that[key]._id) {
        that[key] = that[key]._id;
      }
      // check if is defined
      let isDefined = Reflect.getMetadata('design:type', that, key);
      // console.log(key, isDefined);
      if (that[key] !== undefined &&
        typeof that[key] === 'object') {
        that[key] = this.toDbObject(that[key]);
      }
      else if (!that[key] || typeof that[key] === 'function') {
        delete that[key];
      }
    }

    // });
    return that;
  }
}
