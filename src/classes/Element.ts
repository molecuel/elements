'use strict';
import 'reflect-metadata';
import { MlclElements } from './MlclElements';
import * as TSV from 'tsvalidate';
import { injectable } from '@molecuel/di';

@injectable
export class Element {
  constructor(private elements: MlclElements) {}
  @TSV.IsDefined()
  public id: any;
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