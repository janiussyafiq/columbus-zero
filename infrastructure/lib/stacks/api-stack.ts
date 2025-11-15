import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  lambdaFunctions: { [key: string]: lambda.Function };
  userPool: cognito.UserPool;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, lambdaFunctions, userPool } = props;

    // CloudWatch Log Group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${config.stackPrefix}-${config.environment}`,
      retention: config.environment === 'prod'
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${config.stackPrefix}-api-${config.environment}`,
      description: 'Columbus Zero Travel AI API',
      deployOptions: {
        stageName: config.environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: config.environment !== 'prod',
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        throttlingBurstLimit: config.environment === 'prod' ? 5000 : 100,
        throttlingRateLimit: config.environment === 'prod' ? 2000 : 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: config.corsAllowedOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      cloudWatchRole: true,
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'CognitoAuthorizer',
    });

    // API Key for rate limiting (optional, for public endpoints)
    const apiKey = this.api.addApiKey('ApiKey', {
      apiKeyName: `${config.stackPrefix}-api-key-${config.environment}`,
      description: 'API Key for Columbus Zero',
    });

    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `${config.stackPrefix}-usage-plan-${config.environment}`,
      description: 'Usage plan for Columbus Zero API',
      throttle: {
        rateLimit: config.environment === 'prod' ? 1000 : 50,
        burstLimit: config.environment === 'prod' ? 2000 : 100,
      },
      quota: {
        limit: config.environment === 'prod' ? 1000000 : 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Common request validator
    const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
      restApi: this.api,
      requestValidatorName: 'RequestValidator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // Lambda integrations with error handling
    const createIntegration = (fn: lambda.Function) => {
      return new apigateway.LambdaIntegration(fn, {
        proxy: true,
        allowTestInvoke: config.environment !== 'prod',
        integrationResponses: [
          {
            statusCode: '200',
          },
          {
            statusCode: '400',
            selectionPattern: '.*"statusCode":400.*',
          },
          {
            statusCode: '401',
            selectionPattern: '.*"statusCode":401.*',
          },
          {
            statusCode: '500',
            selectionPattern: '.*"statusCode":500.*',
          },
        ],
      });
    };

    // API Resources and Endpoints

    // /itinerary
    const itineraryResource = this.api.root.addResource('itinerary');

    // POST /itinerary/generate - Generate new itinerary
    const generateResource = itineraryResource.addResource('generate');
    generateResource.addMethod('POST', createIntegration(lambdaFunctions.generateItinerary), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator,
    });

    // PUT /itinerary/{id} - Update itinerary
    const itineraryIdResource = itineraryResource.addResource('{id}');
    itineraryIdResource.addMethod('PUT', createIntegration(lambdaFunctions.updateItinerary), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // GET /itinerary/{id} - Get itinerary
    itineraryIdResource.addMethod('GET', createIntegration(lambdaFunctions.getItinerary), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // POST /chat - Chat with AI
    const chatResource = this.api.root.addResource('chat');
    chatResource.addMethod('POST', createIntegration(lambdaFunctions.chat), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator,
    });

    // GET /transportation/guidance - Transportation guidance
    const transportationResource = this.api.root.addResource('transportation');
    const guidanceResource = transportationResource.addResource('guidance');
    guidanceResource.addMethod('GET', createIntegration(lambdaFunctions.transportation), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        'method.request.querystring.origin': true,
        'method.request.querystring.destination': true,
      },
    });

    // POST /user/preferences - Save user preferences
    const userResource = this.api.root.addResource('user');
    const preferencesResource = userResource.addResource('preferences');
    preferencesResource.addMethod('POST', createIntegration(lambdaFunctions.userPreferences), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator,
    });

    // GET /user/preferences - Get user preferences
    preferencesResource.addMethod('GET', createIntegration(lambdaFunctions.userPreferences), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /destinations/suggest - Destination suggestions
    const destinationsResource = this.api.root.addResource('destinations');
    const suggestResource = destinationsResource.addResource('suggest');
    suggestResource.addMethod('GET', createIntegration(lambdaFunctions.destinationSuggest), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestParameters: {
        'method.request.querystring.budget': false,
        'method.request.querystring.travelStyle': false,
      },
    });

    // Health check endpoint (public, no auth)
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"status": "healthy", "timestamp": "$context.requestTime"}',
        },
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // Store API URL
    this.apiUrl = this.api.url;

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL',
      exportName: `${config.stackPrefix}-api-url-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${config.stackPrefix}-api-id-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
    });
  }
}
