declare class Elements {
    static loaderversion: number;
    private mongoClient;
    private mongoConnection;
    private elasticClient;
    private elasticConnection;
    constructor(mlcl?: any, config?: any);
    protected mongoConnectWrapper(): Promise<any>;
    protected connectMongo(): Promise<void>;
    protected elasticConnectWrapper(): PromiseLike<any>;
    protected connectElastic(): Promise<void>;
    connect(): Promise<void>;
}
export = Elements;
