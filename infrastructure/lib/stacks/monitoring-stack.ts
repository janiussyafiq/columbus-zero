import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

interface MonitoringStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  api: apigateway.RestApi;
  lambdaFunctions: { [key: string]: lambda.Function };
  database: rds.IDatabaseCluster;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, api, lambdaFunctions, database } = props;

    // SNS Topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${config.stackPrefix}-alarms-${config.environment}`,
      displayName: 'Columbus Zero Monitoring Alarms',
    });

    // Email subscription for alarms (configure via environment variable)
    if (process.env.ALARM_EMAIL) {
      alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(process.env.ALARM_EMAIL)
      );
    }

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${config.stackPrefix}-${config.environment}`,
    });

    // API Gateway Metrics
    const apiWidget = new cloudwatch.GraphWidget({
      title: 'API Gateway Metrics',
      left: [
        api.metricCount({ statistic: 'sum', label: 'Request Count' }),
        api.metricClientError({ statistic: 'sum', label: '4XX Errors' }),
        api.metricServerError({ statistic: 'sum', label: '5XX Errors' }),
      ],
      right: [
        api.metricLatency({ statistic: 'avg', label: 'Avg Latency' }),
        api.metricLatency({ statistic: 'p99', label: 'P99 Latency' }),
      ],
    });

    dashboard.addWidgets(apiWidget);

    // API Gateway Alarms
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      alarmName: `${config.stackPrefix}-api-errors-${config.environment}`,
      metric: api.metricServerError({ statistic: 'sum', period: cdk.Duration.minutes(5) }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when API has too many 5XX errors',
    });
    apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    // Lambda Functions Metrics
    const lambdaMetrics: cloudwatch.IMetric[] = [];
    const lambdaErrorMetrics: cloudwatch.IMetric[] = [];

    Object.entries(lambdaFunctions).forEach(([name, fn]) => {
      // Duration metrics
      lambdaMetrics.push(
        fn.metricDuration({ statistic: 'avg', label: `${name} Avg Duration` })
      );

      // Error metrics
      lambdaErrorMetrics.push(
        fn.metricErrors({ statistic: 'sum', label: `${name} Errors` })
      );

      // Individual Lambda alarms
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `${config.stackPrefix}-${name}-errors-${config.environment}`,
        metric: fn.metricErrors({ statistic: 'sum', period: cdk.Duration.minutes(5) }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Alert when ${name} function has too many errors`,
      });
      errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

      // Throttle alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `${config.stackPrefix}-${name}-throttles-${config.environment}`,
        metric: fn.metricThrottles({ statistic: 'sum', period: cdk.Duration.minutes(5) }),
        threshold: 10,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Alert when ${name} function is being throttled`,
      });
      throttleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Duration',
      left: lambdaMetrics,
    });

    const lambdaErrorWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Errors',
      left: lambdaErrorMetrics,
    });

    dashboard.addWidgets(lambdaDurationWidget, lambdaErrorWidget);

    // Database Metrics
    const dbCpuWidget = new cloudwatch.GraphWidget({
      title: 'Database CPU Utilization',
      left: [
        database.metricCPUUtilization({ statistic: 'avg', label: 'CPU %' }),
      ],
    });

    const dbConnectionsWidget = new cloudwatch.GraphWidget({
      title: 'Database Connections',
      left: [
        database.metricDatabaseConnections({ statistic: 'sum', label: 'Connections' }),
      ],
    });

    dashboard.addWidgets(dbCpuWidget, dbConnectionsWidget);

    // Database CPU Alarm
    const dbCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseCpuAlarm', {
      alarmName: `${config.stackPrefix}-db-cpu-${config.environment}`,
      metric: database.metricCPUUtilization({ statistic: 'avg', period: cdk.Duration.minutes(5) }),
      threshold: 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when database CPU is high',
    });
    dbCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    // Cost Estimation Widget (using CloudWatch Metrics)
    const costEstimationWidget = new cloudwatch.SingleValueWidget({
      title: 'Estimated Monthly Costs',
      metrics: [
        api.metricCount({ statistic: 'sum', period: cdk.Duration.days(1) }),
      ],
      setPeriodToTimeRange: true,
      width: 6,
    });

    dashboard.addWidgets(costEstimationWidget);

    // Custom metrics for business KPIs
    const businessMetricsWidget = new cloudwatch.GraphWidget({
      title: 'Business Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'ColumbusZero',
          metricName: 'ItinerariesGenerated',
          statistic: 'sum',
          label: 'Itineraries Generated',
        }),
        new cloudwatch.Metric({
          namespace: 'ColumbusZero',
          metricName: 'ChatInteractions',
          statistic: 'sum',
          label: 'Chat Interactions',
        }),
      ],
    });

    dashboard.addWidgets(businessMetricsWidget);

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${config.awsRegion}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
      exportName: `${config.stackPrefix}-alarm-topic-${config.environment}`,
    });
  }
}
