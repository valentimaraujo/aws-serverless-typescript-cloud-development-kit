#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';

const app = new cdk.App();
const env: cdk.Environment = {
    account: '062395534474',
    region: 'us-east-1'
}

const tags = {
    cost: 'ECommerce',
    team: 'EvoDev'
}

const productsAppLayersStack = new ProductsAppLayersStack(app, 'ProductsAppLayers', { tags, env });

const productsAppStack = new ProductsAppStack(app, 'ProductApp', { tags, env });
productsAppStack.addDependency(productsAppLayersStack);

const eCommerceApiStack = new EcommerceApiStack(app, 'ECommerceApi', {
    productsFetchHandler: productsAppStack.productsFetchHandler,
    productsAdminHandler: productsAppStack.productsAdminHandler,
    tags,
    env
});
eCommerceApiStack.addDependency(productsAppStack);
