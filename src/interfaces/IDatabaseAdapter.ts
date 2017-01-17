import { IDatabaseLayerType, IElement } from '.';
export interface IDatabaseAdapter {
  type: IDatabaseLayerType;
  register(model: IElement);
  save(instance: IElement);
  find(id?: string | IElement);
  delete(id?: string | IElement);
}
