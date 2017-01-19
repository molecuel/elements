'use strict';
import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as _ from 'lodash';
// import * as ELD from './ElementDecorators';
import * as Interfaces from '../interfaces';
import {Element} from './Element';
import {injectable} from '@molecuel/di';

@injectable
export class MlclElements {
  constructor(private databases?: Interfaces.IDatabaseAdapter[]) {

  }

  public static get loaderversion(): number { return 2; }

  /**
   * Validator function for the instances
   * @param  {Object}        instance [description]
   * @return {Promise<void>}          [description]
   */
  public validate(instance: Object): TSV.IValidatorError[] {
      return new TSV.Validator().validate(instance);
  }

  /**
   * Convert object which can be saved in database
   * @param  {Element}     element [description]
   * @return {any}                 [description]
   */
  public toDbObject(element: Element): any {
    return this.toDbObjRecursive(element, false);
  }

  /**
   * Protected recursive object serialization
   * @param  {Object}  obj     [description]
   * @param  {boolean} nested  [description]
   * @return any               [description]
   */
  protected toDbObjRecursive(obj: Object, nested: boolean): any {
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
        if ((key === '_id'
          || key === 'id')
          && !nested) {

          result[key] = that[key];
        }
        // check if the property is an object
        else if (typeof that[key] === 'object') {

          result[key] = this.toDbObjRecursive(that[key], true);
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
}