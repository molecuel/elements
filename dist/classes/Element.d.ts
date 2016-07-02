import { Elements } from '../index';
import { IElement } from '../interfaces/IElement';
export declare class Element implements IElement {
    _id: any;
    elements: Elements;
    static elements: Elements;
    getElements(): Elements;
}
