export class Decorators {
  public static get NOT_FOR_POPULATION(): string { return 'NotForPopulation'; }
  public static get INDEX_MAPPING(): string { return 'Mapping'; }
  public static get USE_PERSISTANCE_TABLE(): string { return 'UsePersistanceTable'; }
  public static get USE_ELASTIC_TYPE(): string { return 'UseElasticType'; }
}

export const METADATAKEY = 'mlcl_elements:validators';

export function versionable(targetClass) {
  // sets static on class
  targetClass.versionable = true;
}

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


export function NotForPopulation() {
  return function(target: Object, propertyName: string) {
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata.push({
      type: Decorators.NOT_FOR_POPULATION,
      property: propertyName
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}

export function UsePersistanceTable(collection: string) {
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
      type: Decorators.USE_PERSISTANCE_TABLE,
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
