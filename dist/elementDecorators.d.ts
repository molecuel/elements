/// <reference types="should" />
export declare class Decorators {
    static readonly NOT_FOR_ELASTIC: string;
    static readonly INDEX_MAPPING: string;
    static readonly USE_MONGO_COLLECTION: string;
    static readonly USE_ELASTIC_TYPE: string;
}
export declare const METADATAKEY: string;
export declare function Mapping(): (target: Object, propertyName: string) => void;
export declare function NotForElastic(): (target: Object, propertyName: string) => void;
export declare function UseMongoCollection(collection: string): (target: Object) => void;
export declare function UseElasticType(type: string): (target: Object) => void;
