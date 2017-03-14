export class Decorators {
  public static get NOT_FOR_POPULATION(): string { return 'NotForPopulation'; }
  public static get INDEX_MAPPING(): string { return 'Mapping'; }
  public static get USE_PERSISTANCE_COLLECTION_OR_TABLE(): string { return 'UsePersistanceCollectionOrTable'; }
  public static get USE_ELASTIC_TYPE(): string { return 'UseElasticType'; }
  public static get IS_REF_TO(): string { return 'IsReferenceTo'; }
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
    metadata = metadata.concat({
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
    metadata = metadata.concat({
      type: Decorators.NOT_FOR_POPULATION,
      property: propertyName
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}

export function UsePersistenceCollectionOrTable(collectionOrTable: string) {
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
    metadata = metadata.concat({
      type: Decorators.USE_PERSISTANCE_COLLECTION_OR_TABLE,
      property: className,
      value: collectionOrTable
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}

export function IsReferenceTo(...models: string[]|any[]) {
  return function(target: Object, propertyName: string) {
    let references: string|string[] = [];
    for (let model of models) {
      let modelName: string;
      if (model) {
        if (typeof model === 'string') {
          modelName = model;
        }
        else {
          if ('prototype' in model) {
            modelName = model.prototype.constructor.name;
          }
          else {
            modelName = model.constructor.name;
          }
        }
      }
      references = references.concat(modelName);
    }
    if (!(references.length > 1)) {
      references = references.pop();
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      type: Decorators.IS_REF_TO,
      property: propertyName,
      value: references
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
    metadata = metadata.concat({
      type: Decorators.USE_ELASTIC_TYPE,
      property: className,
      value: type
    });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
  };
}
