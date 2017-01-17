export declare class Decorators {
    static readonly NOT_FOR_POPULATION: string;
    static readonly INDEX_MAPPING: string;
    static readonly USE_PERSISTANCE_TABLE: string;
    static readonly USE_ELASTIC_TYPE: string;
}
export declare const METADATAKEY = "mlcl_elements:validators";
export declare function Mapping(): (target: Object, propertyName: string) => void;
export declare function NotForPopulation(): (target: Object, propertyName: string) => void;
export declare function UsePersistanceTable(collection: string): (target: Object) => void;
export declare function UseElasticType(type: string): (target: Object) => void;
