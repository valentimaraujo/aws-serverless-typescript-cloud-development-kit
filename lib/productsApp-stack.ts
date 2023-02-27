import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  CfnResource,
} from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface ProductsAppStackProps extends StackProps {
  eventsDdb: Table;
}

export class ProductsAppStack extends Stack {
  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction;
  readonly productsAdminHandler: lambdaNodeJS.NodejsFunction;
  readonly productsDdb: Table;

  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props);

    this.productsDdb = new Table(this, 'ProductsDdb', {
      tableName: 'products',
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // PRODUCTS LAYER
    const productsLayerVersionArn = 'ProductsLayerVersionArn';
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      productsLayerVersionArn,
    );
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      productsLayerVersionArn,
      productsLayerArn,
    );

    // PRODUCTS EVENT LAYER
    const productEventsLayerVersionArn = 'ProductEventsLayerVersionArn';
    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      productEventsLayerVersionArn,
    );
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      productEventsLayerVersionArn,
      productEventsLayerArn,
    );

    const productEventsHandler = new NodejsFunction(
      this,
      'ProductsEventsFunction',
      {
        functionName: 'ProductsEventsFunction',
        entry: 'lambda/products/productsEventsFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          EVENTS_DDB: props.eventsDdb.tableName,
        },
        layers: [productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_143_0,
      },
    );
    props.eventsDdb.grantWriteData(productEventsHandler);

    this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'ProductsFetchFunction',
      {
        functionName: 'ProductsFetchFunction',
        entry: 'lambda/products/productsFetchFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers: [productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_143_0,
      },
    );
    this.productsDdb.grantReadData(this.productsFetchHandler);
    const resourceFetchHandler = this.productsFetchHandler.node
      .defaultChild as CfnResource;
    resourceFetchHandler.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // this.productsFetchHandler.logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'ProductsAdminFunction',
      {
        functionName: 'ProductsAdminFunction',
        entry: 'lambda/products/productsAdminFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
          PRODUCT_EVENTS_FUNCTION_NAME: productEventsHandler.functionName,
        },
        layers: [productsLayer, productEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_143_0,
      },
    );
    this.productsDdb.grantWriteData(this.productsAdminHandler);
    productEventsHandler.grantInvoke(this.productsAdminHandler);
    const resourceAdminHandler = this.productsAdminHandler.node
      .defaultChild as CfnResource;
    resourceAdminHandler.applyRemovalPolicy(RemovalPolicy.DESTROY);
    // this.productsFetchHandler.logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
