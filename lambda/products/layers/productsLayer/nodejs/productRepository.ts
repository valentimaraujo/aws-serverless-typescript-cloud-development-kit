import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuid } from 'uuid';

export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  model: string;
  image: string;
}

export class ProductRepository {
  private ddbClient: DocumentClient;
  private productDdb: string;

  constructor(ddbClient: DocumentClient, productDdb: string) {
    this.ddbClient = ddbClient;
    this.productDdb = productDdb;
  }

  async getAllProducts(): Promise<Product[]> {
    const data = await this.ddbClient
      .scan({
        TableName: this.productDdb,
      })
      .promise();

    return data.Items as Product[];
  }

  async getProductById(productId: string): Promise<Product> {
    const data = await this.ddbClient
      .get({
        TableName: this.productDdb,
        Key: { id: productId },
      })
      .promise();

    if (data.Item) {
      return data.Item as Product;
    } else {
      throw new Error('Product not found');
    }
  }

  async createProduct(product: Product): Promise<Product> {
    product.id = uuid();
    await this.ddbClient
      .put({
        TableName: this.productDdb,
        Item: product,
      })
      .promise();
    return product;
  }

  async updateProduct(productId: string, product: Product): Promise<Product> {
    const data = await this.ddbClient
      .update({
        TableName: this.productDdb,
        Key: { id: productId },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'UPDATED_NEW',
        UpdateExpression:
          'set #name = :name, #code = :code, #price = :price, #model = :model, #image = :image',
        ExpressionAttributeNames: {
          '#name': 'name',
          '#code': 'code',
          '#price': 'price',
          '#model': 'model',
          '#image': 'image',
        },
        ExpressionAttributeValues: {
          ':name': product.name,
          ':code': product.code,
          ':price': product.price,
          ':model': product.model,
          ':image': product.image,
        },
      })
      .promise();

    data.Attributes!.id = productId;
    return data.Attributes as Product;
  }

  async deleteProduct(productId: string): Promise<Product> {
    const data = await this.ddbClient
      .delete({
        TableName: this.productDdb,
        Key: { id: productId },
        ReturnValues: 'ALL_OLD',
      })
      .promise();

    if (data.Attributes) {
      return data.Attributes as Product;
    } else {
      throw new Error('Product not found');
    }
  }
}
