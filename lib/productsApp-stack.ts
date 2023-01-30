import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration, RemovalPolicy, Stack, StackProps, CfnResource } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class ProductsAppStack extends Stack{
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction;
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction;
    readonly productsDdb: Table;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.productsDdb = new Table(this, 'ProductsDdb', {
            tableName: 'products',
            removalPolicy: RemovalPolicy.DESTROY,
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        });

        // PRODUCTS LAYER
        const productsLayerVersionArn = 'ProductsLayerVersionArn';
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, productsLayerVersionArn);
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, productsLayerVersionArn, productsLayerArn)

        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, 'ProductsFetchFunction', {
            functionName: 'ProductsFetchFunction',
            entry: 'lambda/products/productsFetchFunction.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer]
        });
        this.productsDdb.grantReadData(this.productsFetchHandler);
        const resourceFetchHandler = this.productsFetchHandler.node.defaultChild as CfnResource;
        resourceFetchHandler.applyRemovalPolicy(RemovalPolicy.DESTROY);
        // this.productsFetchHandler.logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this, 'ProductsAdminFunction', {
            functionName: 'ProductsAdminFunction',
            entry: 'lambda/products/productsAdminFunction.ts',
            handler: 'handler',
            memorySize: 128,
            timeout: Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer]
        });
        this.productsDdb.grantWriteData(this.productsAdminHandler);
        const resourceAdminHandler = this.productsAdminHandler.node.defaultChild as CfnResource;
        resourceAdminHandler.applyRemovalPolicy(RemovalPolicy.DESTROY);
        // this.productsFetchHandler.logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
}
