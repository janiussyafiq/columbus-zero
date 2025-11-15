import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';
import * as path from 'path';

interface ComputeStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  database: rds.IDatabaseCluster;
  databaseSecret: secretsmanager.ISecret;
  sessionsTable: dynamodb.Table;
  userPool: cognito.UserPool;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
}

export class ComputeStack extends cdk.Stack {
  public readonly functions: { [key: string]: lambda.Function };

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { config, database, databaseSecret, sessionsTable, userPool, vpc, lambdaSecurityGroup } = props;

    // Common Lambda environment variables
    const commonEnv = {
      ENVIRONMENT: config.environment,
      LOG_LEVEL: config.logLevel,
      DB_SECRET_ARN: databaseSecret.secretArn,
      DB_NAME: config.databaseName,
      SESSIONS_TABLE: sessionsTable.tableName,
      USER_POOL_ID: userPool.userPoolId,
      REGION: config.awsRegion,
    };

    // Common Lambda properties
    const commonLambdaProps = {
      runtime: lambda.Runtime.PYTHON_3_11,
      timeout: cdk.Duration.seconds(config.lambdaTimeout),
      memorySize: config.lambdaMemorySize,
      logRetention: config.environment === 'prod'
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
    };

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/shared')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'Shared utilities and dependencies for Columbus Zero',
    });

    // Initialize functions object
    this.functions = {};

    // 1. Generate Itinerary Function
    this.functions.generateItinerary = new lambda.Function(this, 'GenerateItineraryFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-generate-itinerary-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/itinerary')),
      handler: 'src.generate.handler',
      description: 'Generate AI-powered travel itinerary',
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        ANTHROPIC_API_KEY_SECRET: 'ANTHROPIC_API_KEY', // Will be stored in Secrets Manager
      },
      timeout: cdk.Duration.seconds(60), // Longer timeout for AI generation
      memorySize: 1024,
    });

    // 2. Update Itinerary Function
    this.functions.updateItinerary = new lambda.Function(this, 'UpdateItineraryFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-update-itinerary-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/itinerary')),
      handler: 'src.update.handler',
      description: 'Update existing itinerary',
      layers: [sharedLayer],
    });

    // 3. Get Itinerary Function
    this.functions.getItinerary = new lambda.Function(this, 'GetItineraryFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-get-itinerary-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/itinerary')),
      handler: 'src.get.handler',
      description: 'Retrieve saved itinerary',
      layers: [sharedLayer],
    });

    // 4. Chat Function
    this.functions.chat = new lambda.Function(this, 'ChatFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-chat-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/chat')),
      handler: 'src.handler.handler',
      description: 'Interactive chat with AI for travel questions',
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        ANTHROPIC_API_KEY_SECRET: 'ANTHROPIC_API_KEY',
      },
      timeout: cdk.Duration.seconds(45),
    });

    // 5. Transportation Guidance Function
    this.functions.transportation = new lambda.Function(this, 'TransportationFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-transportation-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/transportation')),
      handler: 'src.handler.handler',
      description: 'Real-time transportation guidance using Google Maps',
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        GOOGLE_MAPS_API_KEY_SECRET: 'GOOGLE_MAPS_API_KEY',
      },
    });

    // 6. User Preferences Function
    this.functions.userPreferences = new lambda.Function(this, 'UserPreferencesFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-user-preferences-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/user')),
      handler: 'src.preferences.handler',
      description: 'Save and retrieve user travel preferences',
      layers: [sharedLayer],
    });

    // 7. Destination Suggestions Function
    this.functions.destinationSuggest = new lambda.Function(this, 'DestinationSuggestFunction', {
      ...commonLambdaProps,
      functionName: `${config.stackPrefix}-destination-suggest-${config.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/destinations')),
      handler: 'src.suggest.handler',
      description: 'AI-powered destination suggestions',
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        ANTHROPIC_API_KEY_SECRET: 'ANTHROPIC_API_KEY',
      },
    });

    // Grant permissions to all functions
    Object.values(this.functions).forEach((fn) => {
      // Database access
      databaseSecret.grantRead(fn);
      
      // DynamoDB access
      sessionsTable.grantReadWriteData(fn);

      // Cognito access
      fn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
        actions: [
          'cognito-idp:GetUser',
          'cognito-idp:ListUsers',
          'cognito-idp:AdminGetUser',
        ],
        resources: [userPool.userPoolArn],
      }));

      // Secrets Manager access for API keys
      fn.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${config.awsRegion}:*:secret:ANTHROPIC_API_KEY*`,
          `arn:aws:secretsmanager:${config.awsRegion}:*:secret:GOOGLE_MAPS_API_KEY*`,
        ],
      }));
    });

    // Outputs
    Object.entries(this.functions).forEach(([name, fn]) => {
      new cdk.CfnOutput(this, `${name}FunctionArn`, {
        value: fn.functionArn,
        description: `${name} Lambda function ARN`,
      });
    });
  }
}
