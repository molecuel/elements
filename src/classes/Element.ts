'use strict';
import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { IValidatorError, MongoID } from 'tsvalidate';

export class Element implements IElement {
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
  public save(upsert: boolean = false): Promise<any> {
    return this.elements.instanceSaveWrapper([this], upsert);
  }
  public toDbObject(): any {
    return this.elements.toDbObject(this);
  }
}
