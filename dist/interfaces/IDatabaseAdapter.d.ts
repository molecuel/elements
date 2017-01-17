import { IDatabaseLayerType, IElement } from '.';
export interface IDatabaseAdapter {
    type: IDatabaseLayerType;
    register(model: IElement): any;
    save(instance: IElement): any;
    find(id?: string | IElement): any;
    delete(id?: string | IElement): any;
}
