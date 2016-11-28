import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import { IElement } from './interfaces/IElement';
import { IIndexSettings } from './interfaces/IIndexSettings';
export { Element as Element } from './classes/Element';
export declare class Elements {
    static loaderversion: number;
    private elementStore;
    constructor(mlcl?: any, config?: any);
    registerClass(name: string, definition: any, indexSettings?: IIndexSettings): Promise<void>;
    getClass(name: string): IElement;
    getClassInstance(name: string): any;
    validate(instance: Object): TSV.IValidatorError[];
    toDbObject(element: IElement): any;
    protected toDbObjRecursive(obj: Object, nested: boolean): any;
    protected containsIDocuments(obj: any): boolean;
    protected validateAndSort(instances: IElement[]): Promise<any>;
    saveInstances(instances: IElement[], upsert?: boolean): Promise<any>;
    protected getMappingProperties(model: any): Object;
    protected getPropertyType(model: any, property: string, decorators: any): Object;
}
