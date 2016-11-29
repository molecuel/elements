import { Elements } from '../index';
export interface IDatabaseAdapter {
  elements: Elements;
  register();
  save();
  find();
  delete();
}
