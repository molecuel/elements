'use strict';
import 'reflect-metadata';
import { MlclElements } from './MlclElements';
import { IElement } from '../interfaces/IElement';
import * as TSV from 'tsvalidate';
import { injectable } from '@molecuel/di';

@injectable
export class Element implements IElement {
  constructor(private elements: MlclElements) {}
  @TSV.ValidateType()
  public id: any;
  public _version: number;
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
  public async populate(properties?: string) {
    let population = await this.elements.populate(this, properties);
    if (population) {
      for (let prop in population) {
        this[prop] = population[prop];
      }
    }
  }

}
