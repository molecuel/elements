import { Elements } from '../index';
export interface IElement {
  _id: any;
  elements: Elements;
  setFactory(elements);
  validate();
  toDbObject();
}
