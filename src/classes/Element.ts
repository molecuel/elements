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
  /**
   * Validate this instance based on relevant decorators
   *
   * @returns {IValidatorError[]} Array of errors
   *
   * @memberOf Element
   */
  public validate(): TSV.IValidatorError[] {
    return this.elements.validate(this);
  }
  /**
   * Save this instane to all configured and connected databases
   *
   * @param {boolean} [upsert=true]    wether to upsert during save; defaults to true
   * @returns {Promise<any>}      info object with successes (&count) and errors (&count)
   *
   * @memberOf Element
   */
  public save(upsert: boolean = true): Promise<any> {
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
