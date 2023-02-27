import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB, Lambda } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';
import * as console from 'console';

import { ProductEvent, ProductEventType } from '/opt/nodejs/productEventsLayer';
import { Product, ProductRepository } from '/opt/nodejs/productsLayer';

AWSXRay.captureAWS(require('aws-sdk'));

const productsDdb = process.env.PRODUCTS_DDB!;
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;
const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();

const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const {
    resource,
    httpMethod,
    requestContext: { requestId: apiRequestId },
    pathParameters,
  } = event;

  console.log(
    `%cAPI Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`,
    'color: black; background: gray;',
  );

  const product = JSON.parse(event.body!) as Product;

  if (resource === '/products') {
    const productCreated = await productRepository.createProduct(product);

    const response = await sendProductEvent(
      productCreated,
      ProductEventType.CREATED,
      'evodev@evodev.com.br',
      lambdaRequestId,
    );
    console.log(response);

    return {
      statusCode: 201,
      body: JSON.stringify(productCreated),
    };
  } else if (resource === '/products/{id}') {
    const productId = pathParameters!.id as string;

    if (httpMethod === 'PUT') {
      try {
        const productUpdated = await productRepository.updateProduct(
          productId,
          product,
        );

        const response = await sendProductEvent(
          productUpdated,
          ProductEventType.UPDATED,
          'evodev2@evodev.com.br',
          lambdaRequestId,
        );
        console.log(response);

        return {
          statusCode: 200,
          body: JSON.stringify(productUpdated),
        };
      } catch (ConditionalCheckFailedException) {
        console.log(ConditionalCheckFailedException);
        return {
          statusCode: 404,
          body: 'Product not found',
        };
      }
    } else if (httpMethod === 'DELETE') {
      try {
        const products = await productRepository.deleteProduct(productId);

        const response = await sendProductEvent(
          products,
          ProductEventType.DELETED,
          'evodev3@evodev.com.br',
          lambdaRequestId,
        );
        console.log(response);
        return {
          statusCode: 200,
          body: JSON.stringify(products),
        };
      } catch (err) {
        const errorMessage = (<Error>err).message;
        console.log(errorMessage);
        return {
          statusCode: 404,
          body: errorMessage,
        };
      }
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'BadRequest',
    }),
  };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string,
) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  return lambdaClient
    .invoke({
      FunctionName: productEventsFunctionName,
      Payload: JSON.stringify(event),
      InvocationType: 'RequestResponse',
    })
    .promise();
}
