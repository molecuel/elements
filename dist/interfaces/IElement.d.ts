import { Elements } from '../index';
export interface IElement {
    _id: any;
    elements: Elements;
    setFactory(elements: any): any;
    validate(): any;
    toDbObject(): any;
    save(): any;
}
