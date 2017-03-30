"use strict";
import { injectable } from "@molecuel/di";
import * as TSV from "@molecuel/tsvalidate";
import "reflect-metadata";
import { IElement } from "../interfaces/IElement";
import { MlclElements } from "./MlclElements";

@injectable
export class Element implements IElement {
  @TSV.ValidateType()
  public id: any;
  public version: number;
  constructor(private elements: MlclElements) {}
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
    const population = await this.elements.populate(this, properties);
    if (population) {
      for (const prop in population) {
        if (population[prop]) {
          this[prop] = population[prop];
        }
      }
    }
  }

}
