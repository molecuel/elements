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
   * Applies specified decorator functions to given property of this instance or to this instance itself
   *
   * @param {string} [propertyName]
   * @param {...Array<(...args: any[]) => any>} decorators
   *
   * @memberOf Element
   */
  public applyDecorators(propertyName?: string, ...decorators: Array<(...args: any[]) => any>) {
    return this.elements.applyDecorators(this, propertyName, ...decorators);
  }
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
  /**
   * Return an object that satisfies JSON-like structure to be used in database interactions
   *
   * @param {boolean} [forPopulationLayer=false]
   * @returns {*}
   *
   * @memberOf Element
   */
  public toDbObject(forPopulationLayer: boolean = false): any {
    return this.elements.toDbObject(this, forPopulationLayer);
  }
  /**
   * Transforms the calling instance according to the population request
   *
   * @param {string} [properties]
   *
   * @memberOf Element
   */
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
