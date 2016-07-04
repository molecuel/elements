import 'reflect-metadata';
import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
import { ValidationError } from 'class-validator';
export declare class Element implements IElement {
    _id: any;
    elements: Elements;
    static elements: Elements;
    getElements(): Elements;
    setFactory(elements: any): void;
    validate(): Promise<ValidationError[]>;
    toDbObject(): any;
}
