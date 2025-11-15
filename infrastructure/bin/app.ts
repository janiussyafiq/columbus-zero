#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig, getStackName } from '../lib/config';
import { DataStack } from '../lib/stacks/data-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const config = getConfig(environment);

console.log(`Deploying Columbus Zero to environment: ${config.environment}`);
console.log(`Region: ${config.awsRegion}, Account: ${config.awsAccount || 'default'}`);

// Environment configuration for stacks
const env = {
  account: config.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.awsRegion || process.env.CDK_DEFAULT_REGION,
};

// 1. Data Stack - Database infrastructure (RDS + DynamoDB)
const dataStack = new DataStack(app, getStackName(config, 'data'), {
  env,
  description: 'Columbus Zero - Data layer (RDS PostgreSQL + DynamoDB)',
  config,
});

// 2. Auth Stack - Cognito User Pools
const authStack = new AuthStack(app, getStackName(config, 'auth'), {
  env,
  description: 'Columbus Zero - Authentication (Cognito)',
  config,
});

// 3. Compute Stack - Lambda functions
const computeStack = new ComputeStack(app, getStackName(config, 'compute'), {
  env,
  description: 'Columbus Zero - Lambda functions and business logic',
  config,
  database: dataStack.database,
  databaseSecret: dataStack.databaseSecret,
  sessionsTable: dataStack.sessionsTable,
  userPool: authStack.userPool,
  vpc: dataStack.vpc,
  lambdaSecurityGroup: dataStack.lambdaSecurityGroup,
});

// 4. API Stack - API Gateway
const apiStack = new ApiStack(app, getStackName(config, 'api'), {
  env,
  description: 'Columbus Zero - API Gateway',
  config,
  lambdaFunctions: computeStack.functions,
  userPool: authStack.userPool,
});

// 5. Frontend Stack - S3 + CloudFront
const frontendStack = new FrontendStack(app, getStackName(config, 'frontend'), {
  env,
  description: 'Columbus Zero - Frontend hosting (S3 + CloudFront)',
  config,
  apiUrl: apiStack.apiUrl,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

// 6. Monitoring Stack - CloudWatch dashboards and alarms
if (config.enableCloudWatchDashboards) {
  new MonitoringStack(app, getStackName(config, 'monitoring'), {
    env,
    description: 'Columbus Zero - Monitoring and alerting',
    config,
    api: apiStack.api,
    lambdaFunctions: computeStack.functions,
    database: dataStack.database,
  });
}

// Add dependencies
authStack.addDependency(dataStack);
computeStack.addDependency(dataStack);
computeStack.addDependency(authStack);
apiStack.addDependency(computeStack);
frontendStack.addDependency(apiStack);

// Tag all stacks
Object.entries(config.tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

app.synth();
