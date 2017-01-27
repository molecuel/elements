'use strict';
import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as _ from 'lodash';
// import * as ELD from './ElementDecorators';
import * as Interfaces from '../interfaces';
import {di, injectable} from '@molecuel/di';

@injectable
export class MlclElements {
  private databases: Interfaces.IDatabaseAdapter[];
  constructor(databases: Interfaces.IDatabaseAdapter[]) {
    this.databases = databases || [];
  }

  public get loaderversion(): number { return 2; }

  public getInstance(name: string, ...params): any {
    if (_.includes(this.getClasses(), name)) {
      return di.getInstance(name, ...(params.concat(this)));
    }
    else {
      return undefined;
    }
  }

  /**
   * Validator function for the instances
   * @param  {Object}        instance [description]
   * @return {Promise<void>}          [description]
   */
  public validate(instance: Object): TSV.IValidatorError[] {
      return (new TSV.Validator()).validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {Element}     element [description]
   * @return {any}                 [description]
   */
  public toDbObject(element: Element): any {
    return this.toDbObjRecursive(element);
  }

  /**
   * Return string array of injectable Element extending classes
   * @return {string[]}                 [description]
   */
  public getClasses(): string[] {
    let result: string[] = [];
    for (let [name, injectable] of di.injectables) {
      if (injectable.injectable && new injectable.injectable() instanceof Element && name !== Element.name) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj     [description]
   * @param  {boolean} nested  [description]
   * @return any               [description]
   */
  protected toDbObjRecursive(obj: Object): any {
    let that = obj;
    let result: any = {};
    let objectValidatorDecorators = Reflect.getMetadata(TSV.METADATAKEY, that);
    let propertiesValidatorDecorators = _.keyBy(objectValidatorDecorators, function(o: any) {
      return o.property;
    });
    for (let key in that) {
      // check for non-prototype, validator-decorated property
      if (Object.hasOwnProperty.call(that, key)
        && that[key] !== undefined
        && propertiesValidatorDecorators[key]) {
        // @todo: use key from IDatabaseAdapter
        // check for _id
        if (key === '_id'
          || key === 'id') {

          result[key] = that[key];
        }
        // check if the property is an object
        else if (typeof that[key] === 'object') {

          result[key] = this.toDbObjRecursive(that[key]);
        }
        else if (typeof that[key] !== 'function') {

          result[key] = that[key];
        }
      }
    }
    return result;
  }

  /**
   * Wrapper for instance save
   * @param  {Element[]}                           instances [description]
   * @param  {boolean}                             upsert    [description]
   * @return {Promise<any>}                                  [description]
   */
  public async saveInstances(instances: Element[], upsert: boolean = false): Promise<any> {
    return Promise.reject(instances);
  }

  /**
   * Wrapper for instance get
   * @param  {any}                                     query [description]
   * @return {Promise<any>}                                  [description]
   */
  public async findInstances(query: any): Promise<any> {
    return Promise.reject(query);
  }

  /**
   * Wrapper for instance get by id
   * @param  {any}                                        id [description]
   * @return {Promise<any>}                                  [description]
   */
  public async findInstanceById(id: any): Promise<any> {
    return await this.findInstances(id);
  }
}

import {Element} from './Element';
