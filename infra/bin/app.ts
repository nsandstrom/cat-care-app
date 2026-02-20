#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CatCareStack } from '../lib/cat-care-stack';

const app = new cdk.App();

new CatCareStack(app, 'CatCareStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-west-1',
  },
  description: 'Cat Care shared checklist app',
});
