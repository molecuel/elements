'use strict';
import 'reflect-metadata';
import { MlclElements } from './MlclElements';
import * as TSV from 'tsvalidate';
// import * as Interfaces from '../Interfaces';
import { injectable } from '@molecuel/di';

@injectable
export class Element {
  constructor(private elements: MlclElements) {}
  @TSV.ValidateType()
  public id: any;
  public getFactory(): MlclElements {
    return this.elements;
  }
  public setFactory(elements: MlclElements) {
    this.elements = elements;
  }
  public validate(): TSV.IValidatorError[] {
    return this.elements.validate(this);
  }
  public save(upsert?: boolean): Promise<any> {
    if (!upsert) {
      upsert = false;
    }
    return this.elements.saveInstances([this], upsert);
  }
  public toDbObject(): any {
    return this.elements.toDbObject(this);
  }
}