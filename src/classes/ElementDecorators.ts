export class Decorators {
  public static get NOT_FOR_POPULATION(): string { return "NotForPopulation"; }
  public static get INDEX_MAPPING(): string { return "Mapping"; }
  public static get USE_PERSISTANCE_COLLECTION_OR_TABLE(): string { return "UsePersistanceCollectionOrTable"; }
  public static get USE_ELASTIC_TYPE(): string { return "UseElasticType"; }
  public static get IS_REF_TO(): string { return "IsReferenceTo"; }
  public static get COLLECTION(): string { return "Collection"; }
}

const METADATAKEY = "mlcl_elements:validators";

export function versionable(targetClass) {
  // sets static on class
  targetClass.versionable = true;
}

export function Mapping() {
  return (target: Object, propertyName: string) => {
    let metadata = Reflect.getMetadata(METADATAKEY, target.constructor);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      property: propertyName,
      type: Decorators.INDEX_MAPPING });
    Reflect.defineMetadata(METADATAKEY, metadata, target.constructor);
  };
}

export function NotForPopulation() {
  return (target: Object, propertyName: string) => {
    let metadata = Reflect.getMetadata(METADATAKEY, target.constructor);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      property: propertyName,
      type: Decorators.NOT_FOR_POPULATION });
    Reflect.defineMetadata(METADATAKEY, metadata, target.constructor);
  };
}

export function UsePersistenceCollectionOrTable(collectionOrTable: string) {
  return (target: Object) => {
    let input: any = target;
    let className: string;
    if ("prototype" in input) {
      className = input.prototype.constructor.name;
    } else {
      className = input.constructor.name;
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target.constructor);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      property: className,
      type: Decorators.USE_PERSISTANCE_COLLECTION_OR_TABLE,
      value: collectionOrTable });
    Reflect.defineMetadata(METADATAKEY, metadata, target.constructor);
  };
}

export function IsReferenceTo(...models: any[]) {
  return (target: Object, propertyName: string) => {
    let references: string|string[] = [];
    for (let model of models) {
      let modelName: string;
      if (model) {
        if (typeof model === "string") {
          modelName = model;
        } else {
          if ("prototype" in model) {
            modelName = model.prototype.constructor.name;
          } else {
            modelName = model.constructor.name;
          }
        }
      }
      references = references.concat(modelName);
    }
    if (!(references.length > 1)) {
      references = references.pop();
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target.constructor);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      property: propertyName,
      type: Decorators.IS_REF_TO,
      value: references });
    Reflect.defineMetadata(METADATAKEY, metadata, target.constructor);
  };
}

export function Collection(collectionName: string) {
  return (target: Object) => {
    let metadata = Reflect.getMetadata(METADATAKEY, target);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      type: Decorators.COLLECTION,
      value: collectionName });
    Reflect.defineMetadata(METADATAKEY, metadata, target);
    // Object.defineProperty(target, 'collection', {
    //     configurable: true, get: function(): string {
    //       return collectionName;
    //     }
    // });
  };
}

export function UseElasticType(type: string) {
  return (target: Object) => {
    let input: any = target;
    let className: string;
    if ("prototype" in input) {
      className = input.prototype.constructor.name;
    } else {
      className = input.constructor.name;
    }
    let metadata = Reflect.getMetadata(METADATAKEY, target.constructor);
    if (!metadata) {
      metadata = [];
    }
    metadata = metadata.concat({
      property: className,
      type: Decorators.USE_ELASTIC_TYPE,
      value: type });
    Reflect.defineMetadata(METADATAKEY, metadata, target.constructor);
  };
}
