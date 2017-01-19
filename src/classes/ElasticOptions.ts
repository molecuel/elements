'use strict';
import 'reflect-metadata';
import {injectable} from '@molecuel/di';
@injectable
export class ElasticOptions {
  constructor(
    public url: string,
    public timeout: number,
    public loglevel: string,
    public prefix: string
  ) {}
}
