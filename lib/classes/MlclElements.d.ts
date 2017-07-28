import { MlclDatabase } from "@molecuel/database";
import * as TSV from "@molecuel/tsvalidate";
import "reflect-metadata";
import { DiffObject } from "./DiffObject";
export declare class MlclElements {
    private readonly METADATAKEY;
    dbHandler: MlclDatabase;
    constructor();
    init(): Promise<boolean | Error>;
    getInstance(name: string, ...params: any[]): any;
    validate(instance: object): TSV.IValidatorError[];
    toDbObject(element: object, forPopulationLayer?: boolean): any;
    getClasses(): string[];
    applyDecorators(target: object, propertyName?: string, ...decorators: Array<(...args: any[]) => any>): void;
    toInstance(className: string, data: any): any;
    diffObjects(oldObj: any, newObj: any): DiffObject[];
    revertObject(obj: any, patches: DiffObject[]): any[];
    saveInstances(instances: Element[], upsert?: boolean): Promise<any>;
    populate(obj: object, properties?: string): Promise<any>;
    find(query: any, collection: string): Promise<any>;
    findById(id: any, collection: string): Promise<any>;
    protected toDbObjRecursive(obj: any, stripFunctionsOnly?: boolean, idPattern?: string): any;
    protected addCollectionTo(target: object, model?: object): void;
}
import { Element } from "./Element";