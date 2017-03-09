'use strict';
import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as ELD from './classes/ElementDecorators';
export {MlclElements} from './classes/MlclElements';
export {Element} from './classes/Element';

let decorators: any = {};
// static get Decorators()
for (let prop of Object.getOwnPropertyNames(TSV.DecoratorTypes)) {
  let descriptor = Object.getOwnPropertyDescriptor(TSV.DecoratorTypes, prop);
  if (typeof descriptor.get === 'function') {
    let functionName = TSV.DecoratorTypes[prop];
    decorators[functionName] = TSV[functionName];
  }
}
for (let prop of Object.getOwnPropertyNames(ELD.Decorators)) {
  let descriptor = Object.getOwnPropertyDescriptor(ELD.Decorators, prop);
  if (typeof descriptor.get === 'function') {
    let functionName = ELD.Decorators[prop];
    decorators[functionName] = ELD[functionName];
  }
}
export function GetDecorators() { return decorators; };
