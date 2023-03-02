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
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface OrdersAppStackProps extends StackProps {
  productsDdb: Table;
}

export class OrdersAppStack extends Stack {
  readonly ordersHandler: lambdaNodeJS.NodejsFunction;
  readonly ordersDdb: Table;

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    this.ordersDdb = new Table(this, 'OrdersDdb', {
      tableName: 'orders',
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // ORDERS LAYER
    const ordersLayerVersionArn = 'OrdersLayerVersionArn';
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      ordersLayerVersionArn,
    );
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      ordersLayerVersionArn,
      ordersLayerArn,
    );

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

    this.ordersHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'OrdersFunction',
      {
        functionName: 'OrdersFunction',
        entry: 'lambda/orders/ordersFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: props.productsDdb.tableName,
          ORDERS_DDB: this.ordersDdb.tableName,
        },
        layers: [ordersLayer, productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_143_0,
      },
    );
    this.ordersDdb.grantReadWriteData(this.ordersHandler);
    props.productsDdb.grantReadData(this.ordersHandler);
    const resourceFetchHandler = this.ordersHandler.node
      .defaultChild as CfnResource;
    resourceFetchHandler.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
