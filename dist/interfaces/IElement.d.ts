export interface IElement {
    _id: any;
    elements: any;
    setFactory(elements: any): any;
    validate(): any;
    toDbObject(): any;
    save(): any;
}
