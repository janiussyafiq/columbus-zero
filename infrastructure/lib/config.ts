import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvironmentConfig {
  environment: string;
  awsAccount: string;
  awsRegion: string;
  stackPrefix: string;

  // Database
  databaseName: string;
  databaseUsername: string;
  databasePort: number;
  rdsMinCapacity: number;
  rdsMaxCapacity: number;

  // Lambda
  lambdaTimeout: number;
  lambdaMemorySize: number;

  // Domain & Frontend
  domainName?: string;
  frontendUrl: string;
  corsAllowedOrigins: string[];

  // Feature Flags
  enableCloudWatchDashboards: boolean;
  logLevel: string;

  // Tags
  tags: {
    [key: string]: string;
  };
}

export function getConfig(environment?: string): EnvironmentConfig {
  const env = environment || process.env.ENVIRONMENT || 'dev';

  const config: EnvironmentConfig = {
    environment: env,
    awsAccount: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT || '',
    awsRegion: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1',
    stackPrefix: process.env.STACK_PREFIX || 'columbus-zero',

    // Database Configuration
    databaseName: process.env.DB_NAME || 'columbus_travel',
    databaseUsername: process.env.DB_USERNAME || 'admin',
    databasePort: parseInt(process.env.DB_PORT || '5432'),
    rdsMinCapacity: parseFloat(process.env.RDS_MIN_CAPACITY || '0.5'),
    rdsMaxCapacity: parseFloat(process.env.RDS_MAX_CAPACITY || '2'),

    // Lambda Configuration
    lambdaTimeout: parseInt(process.env.LAMBDA_TIMEOUT || '30'),
    lambdaMemorySize: parseInt(process.env.LAMBDA_MEMORY_SIZE || '512'),

    // Frontend & CORS
    domainName: process.env.DOMAIN_NAME,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsAllowedOrigins: (process.env.API_CORS_ALLOWED_ORIGINS || 'http://localhost:5173').split(','),

    // Feature Flags
    enableCloudWatchDashboards: process.env.ENABLE_CLOUDWATCH_DASHBOARDS === 'true',
    logLevel: process.env.LOG_LEVEL || 'INFO',

    // Tags
    tags: {
      Environment: env,
      Project: 'columbus-zero',
      ManagedBy: 'CDK',
    },
  };

  // Environment-specific overrides
  if (env === 'prod') {
    config.lambdaTimeout = 60;
    config.lambdaMemorySize = 1024;
    config.rdsMinCapacity = 1;
    config.rdsMaxCapacity = 4;
    config.logLevel = 'WARN';
  } else if (env === 'staging') {
    config.lambdaMemorySize = 768;
    config.rdsMaxCapacity = 2;
  }

  return config;
}

export function getStackName(config: EnvironmentConfig, stackType: string): string {
  return `${config.stackPrefix}-${stackType}-${config.environment}`;
}
