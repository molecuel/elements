'use strict';
export interface IElement {
  _id: any;
  elements;
  setFactory(elements);
  validate();
  toDbObject();
  save();
}
