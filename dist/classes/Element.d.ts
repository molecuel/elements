import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { IValidatorError } from 'tsvalidate';
export declare class Element implements IElement {
    _id: any;
    elements: Elements;
    static elements: Elements;
    getElements(): Elements;
    setFactory(elements: any): void;
    validate(): IValidatorError[];
    save(): Promise<any>;
    toDbObject(subElement?: any): any;
}
