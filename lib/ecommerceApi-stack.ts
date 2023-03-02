import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cwLogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
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

    this.createProductsService(props, api);
    this.createOrderrsService(props, api);
  }

  private createOrderrsService(
    props: ECommerceApiStackProps,
    api: apiGateway.RestApi,
  ) {
    const ordersIntegration = new apiGateway.LambdaIntegration(
      props.ordersHandler,
    );
    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('GET', ordersIntegration);

    const orderDeletionValidator = new apiGateway.RequestValidator(
      this,
      'OrderDeletionValidator',
      {
        restApi: api,
        requestValidatorName: 'OrderDeletionValidator',
        validateRequestParameters: true,
      },
    );
    ordersResource.addMethod('DELETE', ordersIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.order': true,
      },
      requestValidator: orderDeletionValidator,
    });

    ordersResource.addMethod('POST', ordersIntegration);
  }

  private createProductsService(
    props: ECommerceApiStackProps,
    api: apiGateway.RestApi,
  ) {
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
