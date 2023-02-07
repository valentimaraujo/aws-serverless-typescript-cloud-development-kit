import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';

import { Product, ProductRepository } from '/opt/nodejs/productsLayer';

AWSXRay.captureAWS(require('aws-sdk'));

const productDdb = process.env.PRODUCTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

const productRepository = new ProductRepository(ddbClient, productDdb);

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
