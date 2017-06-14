import * as TSV from "@molecuel/tsvalidate";
import "reflect-metadata";
import { IElement } from "../interfaces/IElement";
import { MlclElements } from "./MlclElements";
export declare class Element implements IElement {
    private elements;
    id: any;
    version: number;
    static readonly collection: string;
    constructor(elements: MlclElements);
    applyDecorators(propertyName?: string, ...decorators: Array<(...args: any[]) => any>): void;
    validate(): TSV.IValidatorError[];
    save(upsert?: boolean): Promise<any>;
    toDbObject(forPopulationLayer?: boolean): any;
    populate(properties?: string): Promise<void>;
}
