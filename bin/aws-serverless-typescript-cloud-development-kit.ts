#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { EcommerceApiStack } from '../lib/ecommerceApi-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { OrdersAppStack } from '../lib/ordersApp-stack';
import { OrdersAppLayersStack } from '../lib/ordersAppLayers-stack';
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

const ordersAppLayersStack = new OrdersAppLayersStack(
  app,
  'OrdersAppLayersStack',
  { tags, env },
);
const ordersAppStack = new OrdersAppStack(app, 'OrdersApp', {
  productsDdb: productsAppStack.productsDdb,
  tags,
  env,
});
ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(ordersAppLayersStack);

const eCommerceApiStack = new EcommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  tags,
  env,
});
eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(ordersAppStack);
