#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';

const app = new cdk.App();
const env: cdk.Environment = {
  account: '406510022408',
  region: 'us-east-1',
};

const tags = {
  cost: 'ECommerce',
  team: 'EvoDev',
};

const productsAppLayersStack = new ProductsAppLayersStack(
  app,
  'ProductsAppLayers',
  { tags, env },
);

const eventsDdbStack = new EventsDdbStack(app, 'EventsDdb', { tags, env });

const productsAppStack = new ProductsAppStack(app, 'ProductApp', {
  eventsDdb: eventsDdbStack.table,
  tags,
  env,
});
productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDdbStack);

const eCommerceApiStack = new EcommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags,
  env,
});
eCommerceApiStack.addDependency(productsAppStack);
