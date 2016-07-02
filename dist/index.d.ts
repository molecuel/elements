import 'reflect-metadata';
import { IElement } from './interfaces/IElement';
export { Element as Element } from './classes/Element';
export declare class Elements {
    static loaderversion: number;
    private mongoClient;
    private mongoConnection;
    private elasticClient;
    private elasticConnection;
    private elasticOptions;
    private elementStore;
    private validator;
    constructor(mlcl?: any, config?: any);
    protected mongoConnectWrapper(): Promise<any>;
    protected connectMongo(): Promise<void>;
    protected elasticConnectWrapper(): PromiseLike<any>;
    protected connectElastic(): Promise<void>;
    connect(): Promise<void>;
    registerClass(name: string, definition: any): void;
    getClass(name: string): IElement;
    getClassInstance(name: string): any;
    validate(instance: IElement): Promise<void>;
}
