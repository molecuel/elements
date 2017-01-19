import 'reflect-metadata';
import { MlclElements } from './MlclElements';
import * as TSV from 'tsvalidate';
export declare class Element {
    private elements;
    constructor(elements: MlclElements);
    id: any;
    getFactory(): MlclElements;
    setFactory(elements: MlclElements): void;
    validate(): TSV.IValidatorError[];
    save(upsert?: boolean): Promise<any>;
    toDbObject(): any;
}
