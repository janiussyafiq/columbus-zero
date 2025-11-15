# Cost Estimation and Optimization Guide

This document provides estimated AWS costs for running Columbus Zero and optimization strategies.

## Monthly Cost Estimates

### Development Environment

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| RDS Aurora Serverless v2 | 0.5-1 ACU, minimal usage | $30-50 |
| Lambda | 1M requests, 512MB, 30s avg | $5-10 |
| DynamoDB | 25 GB storage, PAY_PER_REQUEST | $5-10 |
| API Gateway | 1M requests | $3-5 |
| CloudFront | 10 GB data transfer | $1-2 |
| S3 | 5 GB storage | $0.50 |
| CloudWatch Logs | 5 GB ingestion | $2-3 |
| Secrets Manager | 2 secrets | $1 |
| Cognito | 1,000 MAU | Free |
| **TOTAL** | | **~$48-82/month** |

### Staging Environment

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| RDS Aurora Serverless v2 | 1-2 ACU | $70-100 |
| Lambda | 5M requests, 768MB, 30s avg | $20-30 |
| DynamoDB | 50 GB storage, PAY_PER_REQUEST | $10-15 |
| API Gateway | 5M requests | $15-20 |
| CloudFront | 50 GB data transfer | $5-8 |
| S3 | 10 GB storage | $1 |
| CloudWatch | 10 GB logs | $5 |
| Other (Secrets, Cognito) | | $1-2 |
| **TOTAL** | | **~$127-181/month** |

### Production Environment

**Light Traffic (10K users/month):**

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| RDS Aurora Serverless v2 | 2-4 ACU | $150-250 |
| Lambda | 50M requests, 1GB, 30s avg | $100-150 |
| DynamoDB | 100 GB storage | $30-40 |
| API Gateway | 50M requests | $175 |
| CloudFront | 500 GB data transfer | $40-50 |
| S3 | 50 GB storage | $2 |
| CloudWatch | 50 GB logs | $25 |
| WAF (optional) | Web ACL + rules | $10-20 |
| Backup & DR | RDS snapshots, S3 versioning | $10-15 |
| Other services | | $5-10 |
| **TOTAL** | | **~$547-737/month** |

**Medium Traffic (100K users/month):**

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| RDS Aurora Serverless v2 | 4-8 ACU with reader | $400-600 |
| Lambda | 500M requests | $800-1000 |
| DynamoDB | 500 GB storage | $125-150 |
| API Gateway | 500M requests | $1,750 |
| CloudFront | 5 TB data transfer | $425 |
| S3 | 200 GB storage | $5 |
| CloudWatch | 200 GB logs | $100 |
| WAF | | $20-30 |
| Backup & DR | | $30-50 |
| Other | | $10-20 |
| **TOTAL** | | **~$3,665-4,150/month** |

## External API Costs

### Anthropic Claude API

Based on Claude 3 Sonnet pricing:

- Input: $3 per million tokens
- Output: $15 per million tokens

**Estimated costs per itinerary generation:**
- Average prompt: ~1,500 tokens input
- Average response: ~3,000 tokens output
- Cost per itinerary: ~$0.05

**Monthly estimates:**
- 1,000 itineraries: $50
- 10,000 itineraries: $500
- 100,000 itineraries: $5,000

### Google Maps API

Google Maps Platform pricing (as of 2024):

- Directions API: $5 per 1,000 requests
- Places API: $17 per 1,000 requests
- Maps JavaScript API: $7 per 1,000 loads

**Monthly estimates:**
- 10,000 requests: $50-170
- 100,000 requests: $500-1,700

## Cost Optimization Strategies

### 1. Database Optimization

**RDS Aurora Serverless v2**
- ✅ Use Aurora Serverless v2 for automatic scaling
- ✅ Set appropriate min/max ACU based on usage
- ✅ Enable auto-pause for development environments
- ✅ Use query caching to reduce database hits
- ✅ Implement connection pooling in Lambda

**Recommendations:**
```typescript
// Development
rdsMinCapacity: 0.5  // Can pause when not in use
rdsMaxCapacity: 1

// Production
rdsMinCapacity: 2    // Always available
rdsMaxCapacity: 4    // Scale up for high traffic
```

**DynamoDB**
- ✅ Use PAY_PER_REQUEST billing (better for unpredictable traffic)
- ✅ Enable TTL for temporary data (sessions)
- ✅ Use DynamoDB Accelerator (DAX) for read-heavy workloads
- ✅ Implement efficient partition key design

### 2. Lambda Optimization

**Memory and Timeout Tuning**
```typescript
// Test different memory sizes to find optimal cost/performance
lambdaMemorySize: 512   // Start here
lambdaTimeout: 30       // Adjust based on actual needs
```

**Best Practices:**
- Keep Lambda functions warm (provisioned concurrency for critical functions)
- Minimize cold starts:
  - Use Lambda layers for shared dependencies
  - Keep deployment packages small
  - Initialize connections outside handler
- Enable X-Ray only in production
- Set appropriate log retention (7 days dev, 30 days prod)

**Example optimization:**
```python
# Initialize outside handler (connection reuse)
_db_connection = None

def handler(event, context):
    global _db_connection
    if _db_connection is None:
        _db_connection = get_db_connection()
    # Use connection
```

### 3. API Gateway Optimization

- Use caching for frequently accessed endpoints
- Implement request validation to reduce Lambda invocations
- Use usage plans for rate limiting
- Consider HTTP API instead of REST API for simpler use cases (60% cheaper)

**Enable caching:**
```typescript
const method = resource.addMethod('GET', integration, {
  methodResponses: [{ statusCode: '200' }],
  requestParameters: {
    'method.request.querystring.id': true,
  },
});

// Enable caching (production only)
const stage = api.deploymentStage;
stage.addMethodThrottling('/itinerary/{id}', {
  throttle: {
    burstLimit: 500,
    rateLimit: 100,
  },
  cacheTtl: Duration.minutes(5), // Cache for 5 minutes
});
```

### 4. CloudFront & S3 Optimization

- Enable CloudFront compression
- Use appropriate cache behaviors
- Leverage S3 Intelligent-Tiering for cost optimization
- Implement lifecycle policies for old assets

```typescript
// CloudFront optimizations
distribution: {
  defaultCacheBehavior: {
    compress: true,  // Enable compression
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
}

// S3 lifecycle policy
bucket.addLifecycleRule({
  id: 'MoveToInfrequentAccess',
  transitions: [
    {
      storageClass: s3.StorageClass.INFREQUENT_ACCESS,
      transitionAfter: Duration.days(90),
    },
  ],
});
```

### 5. Monitoring Cost Optimization

**CloudWatch Logs**
- Set appropriate retention periods
- Use log filtering to reduce ingestion
- Consider CloudWatch Logs Insights for queries (more cost-effective than storing everything)

```typescript
logRetention: config.environment === 'prod'
  ? logs.RetentionDays.ONE_MONTH
  : logs.RetentionDays.ONE_WEEK,
```

### 6. AI API Cost Reduction

**Anthropic Claude**
- Implement response caching for common queries
- Use shorter system prompts
- Consider Claude Haiku for simpler queries ($0.25/$1.25 per million tokens)
- Batch similar requests when possible

**Caching Strategy:**
```python
# Cache common destinations/travel styles
cache_key = f"{destination}:{duration}:{travel_style}"
cached_response = check_cache(cache_key)
if cached_response:
    return customize_cached_response(cached_response, user_preferences)
else:
    response = generate_with_claude(...)
    save_to_cache(cache_key, response)
    return response
```

### 7. Development Environment Cost Reduction

**Auto-shutdown Development Resources**
```bash
# Lambda to stop dev resources at night
# Saves ~60% on dev costs
aws lambda create-function \
  --function-name stop-dev-resources \
  --runtime python3.11 \
  --handler index.handler \
  --schedule "cron(0 20 * * ? *)"  # 8 PM UTC
```

**Use LocalStack for local development**
```bash
# Run AWS services locally for development
docker run -d -p 4566:4566 localstack/localstack
```

## Cost Monitoring

### Set Up Billing Alerts

1. **Budget Alarms**
```bash
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

2. **CloudWatch Cost Anomaly Detection**
   - Enable AWS Cost Anomaly Detection in AWS Cost Explorer
   - Set up SNS notifications for anomalies

### Cost Allocation Tags

Add tags to all resources for cost tracking:

```typescript
Tags.of(app).add('Project', 'columbus-zero');
Tags.of(app).add('Environment', config.environment);
Tags.of(app).add('CostCenter', 'travel-platform');
```

### Regular Cost Reviews

**Weekly:**
- Review AWS Cost Explorer for unexpected spikes
- Check Lambda CloudWatch metrics for inefficiencies

**Monthly:**
- Analyze API usage patterns
- Review and optimize database queries
- Check CloudFront cache hit ratios

## Cost Reduction Checklist

- [ ] Enable Aurora Serverless v2 auto-pause (dev)
- [ ] Implement Lambda connection pooling
- [ ] Set appropriate CloudWatch log retention
- [ ] Enable CloudFront compression
- [ ] Implement API response caching
- [ ] Use DynamoDB TTL for temporary data
- [ ] Set up billing alerts and budgets
- [ ] Review and optimize slow Lambda functions
- [ ] Implement AI response caching
- [ ] Use Intelligent-Tiering for S3
- [ ] Remove unused resources regularly
- [ ] Consider Reserved Instances for predictable workloads

## Estimated Savings

Following these optimizations:

- **Development:** Save 30-40% (~$15-30/month)
- **Production:** Save 25-35% (~$150-1,400/month depending on scale)

## Conclusion

With proper optimization, Columbus Zero can be run cost-effectively:

- **Development:** <$50/month
- **Small scale (10K users):** ~$400-500/month
- **Medium scale (100K users):** ~$2,500-3,000/month

The main cost drivers are:
1. AI API calls (scales with usage)
2. RDS Aurora (can be optimized with caching)
3. API Gateway (consider HTTP API for 60% savings)
4. Lambda invocations (optimize with caching and efficient code)
