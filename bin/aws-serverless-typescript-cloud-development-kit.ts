#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppStack } from '../lib/productsApp-stack';

const app = new cdk.App();
const env: cdk.Environment = {
    account: '062395534474',
    region: 'us-east-1'
}

const tags = {
    cost: 'ECommerce',
    team: 'EvoDev'
}

const productsAppStack = new ProductsAppStack(app, 'ProductApp', { tags, env });
const eCommerceApiStack = new EcommerceApiStack(app, 'ECommerceApi', {
    productsFetchHandler: productsAppStack.productsFetchHandler,
    productsAdminHandler: productsAppStack.productsAdminHandler,
    tags,
    env
});
eCommerceApiStack.addDependency(productsAppStack);
