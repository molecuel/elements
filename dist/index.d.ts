import 'reflect-metadata';
import * as TSV from 'tsvalidate';
import * as Interfaces from './Interfaces';
export { Element as Element } from './classes/Element';
export declare class Elements {
    static loaderversion: number;
    private elementStore;
    private databases;
    constructor(mlcl?: any, config?: any);
    registerDatabase(key: string, database: any): Promise<void>;
    registerClass(name: string, definition: any, registerAsModel?: boolean): Promise<void>;
    getClass(name: string): Interfaces.IElement;
    getClassInstance(name: string): any;
    validate(instance: Object): TSV.IValidatorError[];
    toDbObject(element: Interfaces.IElement): any;
    protected toDbObjRecursive(obj: Object, nested: boolean): any;
    protected containsIDocuments(obj: any): boolean;
    protected validateAndSort(instances: Interfaces.IElement[]): Promise<any>;
    saveInstances(instances: Interfaces.IElement[], upsert?: boolean): Promise<any>;
    protected getMappingProperties(model: any): Object;
    protected getPropertyType(model: any, property: string, decorators: any): Object;
}
