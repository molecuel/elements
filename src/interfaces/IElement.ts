"use strict";
export interface IElement {
  id: any;
  validate();
  toDbObject();
  save();
}
