import {Elements} from '../index';
import {IElement} from '../interfaces/IElement';
export class Element implements IElement {
  public _id: any;
  public elements: Elements;
  public static elements: Elements;
  public getElements(): Elements {
    return Element.elements;
  }
}
