export interface IDatabaseAdapter {
    name: string;
    type: string;
    idPattern: string;
    register(model: object): any;
    save(instance: object): any;
    update(instance: object): any;
    find(id?: string | number, query?: any): any;
    delete(id?: string | number): any;
}
