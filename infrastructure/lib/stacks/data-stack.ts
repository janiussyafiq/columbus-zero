import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

interface DataStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DataStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly database: rds.IDatabaseCluster;
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly sessionsTable: dynamodb.Table;
  public readonly itinerariesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { config } = props;

    // VPC for RDS (use default VPC or create new one)
    this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true,
    });

    // Database credentials secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: `${config.stackPrefix}-db-credentials-${config.environment}`,
      description: 'Columbus Zero RDS PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: config.databaseUsername,
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // RDS Aurora Serverless v2 PostgreSQL cluster
    this.database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      defaultDatabaseName: config.databaseName,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serverlessV2MinCapacity: config.rdsMinCapacity,
      serverlessV2MaxCapacity: config.rdsMaxCapacity,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      readers: config.environment === 'prod'
        ? [rds.ClusterInstance.serverlessV2('Reader', { scaleWithWriter: true })]
        : [],
      backup: {
        retention: config.environment === 'prod'
          ? cdk.Duration.days(7)
          : cdk.Duration.days(1),
        preferredWindow: '03:00-04:00',
      },
      storageEncrypted: true,
      deletionProtection: config.environment === 'prod',
      removalPolicy: config.environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB table for sessions and real-time data
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: `${config.stackPrefix}-sessions-${config.environment}`,
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      removalPolicy: config.environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for user lookup
    this.sessionsTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // DynamoDB table for itineraries (for quick access)
    this.itinerariesTable = new dynamodb.Table(this, 'ItinerariesTable', {
      tableName: `${config.stackPrefix}-itineraries-${config.environment}`,
      partitionKey: {
        name: 'itineraryId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'version',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: config.environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for user's itineraries
    this.itinerariesTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'RDS cluster endpoint',
      exportName: `${config.stackPrefix}-db-endpoint-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'RDS credentials secret ARN',
      exportName: `${config.stackPrefix}-db-secret-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: this.sessionsTable.tableName,
      description: 'DynamoDB sessions table name',
      exportName: `${config.stackPrefix}-sessions-table-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'ItinerariesTableName', {
      value: this.itinerariesTable.tableName,
      description: 'DynamoDB itineraries table name',
      exportName: `${config.stackPrefix}-itineraries-table-${config.environment}`,
    });
  }
}
