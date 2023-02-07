import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';

import { ProductRepository } from '/opt/nodejs/productsLayer';

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

  if (resource === '/products') {
    if (httpMethod === 'GET') {
      const products = await productRepository.getAllProducts();
      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  } else if (resource === '/products/{id}') {
    const productId = pathParameters!.id as string;
    try {
      const products = await productRepository.getProductById(productId);
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

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'BadRequest',
    }),
  };
}
