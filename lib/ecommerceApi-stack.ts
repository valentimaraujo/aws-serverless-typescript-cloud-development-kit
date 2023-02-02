import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cwLogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
}

export class EcommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwLogs.LogGroup(this, 'ECommerceApiLogs');
    logGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    const api = new apiGateway.RestApi(this, 'ECommerceApi', {
      restApiName: 'ECommerceApi',
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apiGateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
          httpMethod: true,
        }),
      },
    });

    const productsFetchIntegration = new apiGateway.LambdaIntegration(
      props.productsFetchHandler,
    );
    const productsAdminIntegration = new apiGateway.LambdaIntegration(
      props.productsAdminHandler,
    );

    const productsResource = api.root.addResource('products');
    const productIdResource = productsResource.addResource('{id}');

    // PRODUCTS ADMIN INTEGRATION
    productsResource.addMethod('POST', productsAdminIntegration);
    productIdResource.addMethod('PUT', productsAdminIntegration);
    productIdResource.addMethod('DELETE', productsAdminIntegration);

    // PRODUCTS FETCH INTEGRATION
    productsResource.addMethod('GET', productsFetchIntegration);
    productIdResource.addMethod('GET', productsFetchIntegration);
  }
}
