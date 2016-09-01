export class Decorators {
  public static get NOT_FOR_ELASTIC(): string { return 'NotForElastic'; }
  public static get INDEX_MAPPING(): string { return 'Mapping'; }
  public static get USE_MONGO_COLLECTION(): string { return 'UseMongoCollection'; }
  public static get USE_ELASTIC_TYPE(): string { return 'UseElasticType'; }
}

export const METADATAKEY = 'mlcl_elements:validators';

export function Mapping() {
  return function(target: Object, propertyName: string) {
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      type: Decorators.INDEX_MAPPING,
      property: propertyName
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}


export function NotForElastic() {
  return function(target: Object, propertyName: string) {
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      type: Decorators.NOT_FOR_ELASTIC,
      property: propertyName
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}

export function UseMongoCollection(collection: string) {
  return function(target: Object) {
    let input: any = target;
    let className: string;
    if ('prototype' in input) {
      className = input.prototype.constructor.name;
    }
    else {
      className = input.constructor.name;
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      type: Decorators.USE_MONGO_COLLECTION,
      property: className,
      value: collection
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}

export function UseElasticType(type: string) {
  return function(target: Object) {
    let input: any = target;
    let className: string;
    if ('prototype' in input) {
      className = input.prototype.constructor.name;
    }
    else {
      className = input.constructor.name;
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      type: Decorators.USE_ELASTIC_TYPE,
      property: className,
      value: type
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}
