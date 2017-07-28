import "reflect-metadata";
export declare class Decorators {
    static readonly NOT_FOR_POPULATION: string;
    static readonly IS_REF_TO: string;
    static readonly COLLECTION: string;
}
export declare function versionable(targetClass: any): void;
export declare function NotForPopulation(): (target?: object, propertyName?: string) => void;
export declare function IsReferenceTo(...models: any[]): (target: object, propertyName: string) => void;
export declare function Collection(collectionName: string): (target: object) => void;
