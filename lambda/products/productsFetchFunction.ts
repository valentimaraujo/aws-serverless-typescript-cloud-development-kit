import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    const lambdaRequestId = context.awsRequestId;
    const { resource, httpMethod, requestContext: { requestId: apiRequestId }, pathParameters } = event;

    console.log(`%cAPI Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`, 'color: black; background: gray;');

    if (resource === '/products') {
        if (httpMethod === 'GET') {
            console.log(`%c========>> ${httpMethod}`, 'color: black; background: gray;');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'GET Products - OK'
                })
            }
        }
    } else if (resource === '/products/{id}') {
        const productId = pathParameters!.id as string;
        const resourceId = resource.replace('{id}', productId);
        console.log(`%c========>> ${httpMethod} ${resourceId}`, 'color: black; background: gray;');
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `GET Product by ID - ${resourceId}`
            })
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: 'BadRequest'
        })
    }
}
