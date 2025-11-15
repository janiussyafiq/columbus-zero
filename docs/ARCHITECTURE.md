# Columbus Zero - Architecture Documentation

## Overview

Columbus Zero is a cloud-native, serverless application built on AWS using modern best practices. The architecture is designed for scalability, security, and cost-effectiveness.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         End Users                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                              │
│  - Global edge locations                                         │
│  - HTTPS enforcement                                             │
│  - Compression & caching                                         │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ▼                                ▼
┌───────────────────────┐      ┌─────────────────────────────────┐
│   S3 (Frontend)       │      │   API Gateway (REST)             │
│  - React SPA          │      │  - CORS configuration            │
│  - Static assets      │      │  - Request validation            │
│  - OAC security       │      │  - Rate limiting                 │
└───────────────────────┘      │  - Cognito authorizer            │
                               └────────┬────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │  Lambda Function │ │  Lambda Function │ │  Lambda Function │
        │  (Generate)      │ │  (Chat)          │ │  (User Prefs)    │
        └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
                 │                    │                     │
                 └────────────────────┼─────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌──────────────────┐ ┌──────────────┐ ┌─────────────────┐
        │  RDS PostgreSQL  │ │  DynamoDB    │ │ Secrets Manager │
        │  (Aurora v2)     │ │  (Sessions)  │ │ (API Keys)      │
        │  - Serverless    │ │  - NoSQL     │ │ - Encrypted     │
        │  - Auto-scaling  │ │  - PAY/REQ   │ │                 │
        └──────────────────┘ └──────────────┘ └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                External Services                                 │
│  - Cognito (Authentication)                                      │
│  - Anthropic Claude API (AI)                                     │
│  - Google Maps API (Transportation)                              │
│  - CloudWatch (Monitoring & Logging)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Patterns

### 1. Multi-Stack CDK Architecture

The infrastructure is organized into separate, focused stacks:

```typescript
- DataStack        // Databases (RDS, DynamoDB)
- AuthStack        // Cognito User Pools
- ComputeStack     // Lambda functions
- ApiStack         // API Gateway
- FrontendStack    // S3, CloudFront
- MonitoringStack  // CloudWatch dashboards, alarms
```

**Benefits:**
- Independent deployment cycles
- Clear separation of concerns
- Easier troubleshooting
- Granular IAM permissions

### 2. Environment-Based Configuration

```typescript
const config = getConfig(environment); // dev, staging, prod

// Environment-specific settings
if (environment === 'prod') {
  config.lambdaTimeout = 60;
  config.rdsMinCapacity = 2;
  config.enableMFA = true;
}
```

**Configuration precedence:**
1. CDK context (`--context environment=prod`)
2. Environment variables (`.env`)
3. Default values in `config.ts`

### 3. Secure Static Hosting with OAC

Modern CloudFront Origin Access Control (replaces deprecated OAI):

```typescript
// Create OAC
const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
  originAccessControlConfig: {
    name: 'columbus-zero-oac',
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
  },
});

// S3 bucket policy allows only CloudFront
bucket.addToResourcePolicy(new iam.PolicyStatement({
  principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
  actions: ['s3:GetObject'],
  resources: [bucket.arnForObjects('*')],
  conditions: {
    StringEquals: {
      'AWS:SourceArn': `arn:aws:cloudfront::${account}:distribution/${distributionId}`
    }
  }
}));
```

### 4. Database Strategy: Polyglot Persistence

**PostgreSQL (RDS Aurora Serverless v2)** - Structured Data
- User accounts and profiles
- Itineraries (with JSONB for flexibility)
- Destinations catalog
- Feedback and ratings

**DynamoDB** - Session and Real-Time Data
- Chat sessions with TTL
- Temporary user sessions
- Real-time itinerary updates
- High-throughput operations

**Why both?**
- RDS: Complex queries, ACID transactions, relational data
- DynamoDB: Low latency, infinite scale, pay-per-request

### 5. Lambda Best Practices

**Shared Layer Pattern:**
```
backend/
├── shared/          # Deployed as Lambda Layer
│   └── utils/
│       ├── database.py
│       ├── auth.py
│       └── response.py
└── functions/       # Individual functions
    ├── itinerary/
    └── chat/
```

**Connection Pooling:**
```python
# Global connection (reused across invocations)
_pg_connection = None

def get_db_connection():
    global _pg_connection
    if _pg_connection and is_connection_alive(_pg_connection):
        return _pg_connection
    _pg_connection = create_connection()
    return _pg_connection
```

### 6. API Design Patterns

**RESTful Resource Naming:**
```
POST   /itinerary/generate     # Create new itinerary
GET    /itinerary/{id}         # Retrieve itinerary
PUT    /itinerary/{id}         # Update itinerary
DELETE /itinerary/{id}         # Delete itinerary (future)

POST   /chat                   # Send chat message
GET    /user/preferences       # Get user preferences
```

**Standardized Response Format:**
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

**Error Handling:**
```python
try:
    result = process_request()
    return success_response(result)
except ValidationError as e:
    return bad_request_response(str(e))
except Exception as e:
    logger.error(f"Error: {str(e)}", exc_info=True)
    return server_error_response("An error occurred")
```

## Security Architecture

### 1. Authentication & Authorization

**Cognito User Pools:**
- Email/username authentication
- Password requirements enforced
- MFA optional (required in production)
- Custom attributes for travel preferences

**API Gateway Authorizer:**
```typescript
const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
  cognitoUserPools: [userPool],
  identitySource: 'method.request.header.Authorization',
});

resource.addMethod('POST', integration, {
  authorizer: authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
});
```

### 2. Secret Management

**AWS Secrets Manager:**
- Anthropic API key
- Google Maps API key
- Database credentials (auto-rotated)

**Lambda Access:**
```python
def get_secret(secret_name: str):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])
```

### 3. Network Security

**VPC Configuration:**
- RDS in private subnets
- Lambda with VPC access for database
- NAT Gateway for outbound internet (Secrets Manager, external APIs)

**Security Groups:**
- RDS: Allow traffic only from Lambda security group
- Lambda: Outbound to RDS and internet

### 4. Data Encryption

- **At Rest:**
  - S3: SSE-S3 encryption
  - RDS: Storage encryption enabled
  - DynamoDB: AWS managed encryption
  - Secrets Manager: KMS encryption

- **In Transit:**
  - HTTPS enforced (CloudFront, API Gateway)
  - TLS 1.2+ required
  - Database connections encrypted

## Scalability Design

### Horizontal Scaling

**Auto-scaling Components:**
- Lambda: Automatic (1000 concurrent executions default)
- RDS Aurora: Serverless v2 ACUs (0.5-16 ACUs)
- DynamoDB: On-demand scaling
- CloudFront: Global edge network

### Vertical Scaling

**Configuration-based:**
```typescript
// Scale Lambda memory and timeout
lambdaMemorySize: environment === 'prod' ? 1024 : 512
lambdaTimeout: environment === 'prod' ? 60 : 30

// Scale database capacity
rdsMinCapacity: environment === 'prod' ? 2 : 0.5
rdsMaxCapacity: environment === 'prod' ? 8 : 2
```

### Caching Strategy

**Multi-layer caching:**
1. **CloudFront:** Static assets (frontend)
2. **API Gateway:** API responses (5-60 minutes)
3. **Application:** In-memory caching for secrets, connections
4. **Database:** Query result caching, connection pooling

## Monitoring & Observability

### 1. Logging

**Structured Logging:**
```python
logger.info("Itinerary generated", extra={
    "user_id": user_id,
    "destination": destination,
    "duration_days": duration_days,
    "generation_time_ms": elapsed_ms
})
```

**Log Aggregation:**
- CloudWatch Logs for all Lambda functions
- Log retention based on environment (7-30 days)
- CloudWatch Insights for querying

### 2. Metrics

**Custom CloudWatch Metrics:**
```python
cloudwatch.put_metric_data(
    Namespace='ColumbusZero',
    MetricData=[{
        'MetricName': 'ItinerariesGenerated',
        'Value': 1,
        'Unit': 'Count'
    }]
)
```

**AWS Service Metrics:**
- Lambda: Invocations, Duration, Errors, Throttles
- API Gateway: Latency, 4XX/5XX errors, Cache hits
- RDS: CPU, Connections, Queries
- DynamoDB: Consumed capacity, Throttles

### 3. Alarms

**Critical Alarms:**
- API 5XX error rate > 10 (5 min)
- Lambda error rate > 5% (5 min)
- Lambda throttles > 10 (5 min)
- RDS CPU > 80% (15 min)

**SNS Notifications:**
```typescript
const alarmAction = new cloudwatchActions.SnsAction(alarmTopic);
alarm.addAlarmAction(alarmAction);
```

### 4. Distributed Tracing

**AWS X-Ray:**
- Enabled on Lambda functions
- Track request flow through services
- Identify bottlenecks

## Disaster Recovery

### RTO & RPO Targets

| Environment | RTO (Recovery Time) | RPO (Data Loss) |
|-------------|--------------------|--------------------|
| Development | 24 hours | 24 hours |
| Staging | 4 hours | 1 hour |
| Production | 1 hour | 5 minutes |

### Backup Strategy

**RDS Aurora:**
- Automated backups: 7 days (prod), 1 day (dev)
- Automated snapshots every 5 minutes
- Point-in-time recovery enabled

**DynamoDB:**
- Point-in-time recovery (PITR) enabled for production
- On-demand backups for major changes

**S3:**
- Versioning enabled for production
- Cross-region replication (optional)

### Multi-Region Considerations

**Future Enhancement:**
```typescript
// Deploy to multiple regions
const primaryRegion = 'us-east-1';
const drRegion = 'eu-west-1';

// Route53 health checks
// Aurora Global Database
// DynamoDB Global Tables
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
Trigger: Push to main/staging/develop
│
├─> Test Stage
│   ├─> Lint frontend
│   ├─> Build frontend
│   ├─> Synthesize CDK
│   └─> Run unit tests
│
├─> Deploy Infrastructure (CDK)
│   ├─> Deploy all stacks
│   └─> Capture outputs
│
├─> Deploy Frontend
│   ├─> Build with environment vars
│   ├─> Upload to S3
│   └─> Invalidate CloudFront
│
└─> Post-Deployment
    ├─> Run smoke tests
    ├─> Send notifications
    └─> Update documentation
```

## Performance Optimization

### Frontend

- Code splitting (React lazy loading)
- Asset optimization (minification, compression)
- CloudFront caching
- Service Worker for offline support

### Backend

- Connection pooling
- Query optimization (indexed columns)
- Lambda layer for shared dependencies
- Efficient data serialization (JSON vs MessagePack)

### Database

- Proper indexing strategy
- Query result caching
- Read replicas for production
- Partitioning for large tables (future)

## Cost Optimization

See [COST.md](COST.md) for detailed cost analysis.

**Key Strategies:**
1. Aurora Serverless v2 with auto-pause
2. DynamoDB on-demand pricing
3. Lambda right-sizing (memory/timeout)
4. CloudWatch log retention policies
5. AI response caching

## Future Enhancements

### Phase 2: Advanced Features

- [ ] Real-time collaboration on itineraries
- [ ] Mobile apps (React Native)
- [ ] Offline support with local storage
- [ ] Multi-language support (i18n)
- [ ] Social features (share itineraries)
- [ ] Payment integration for bookings

### Phase 3: Scale Optimizations

- [ ] Multi-region deployment
- [ ] GraphQL API (AppSync)
- [ ] ElastiCache for caching layer
- [ ] Event-driven architecture (EventBridge)
- [ ] Machine learning for personalization
- [ ] Containerized services (ECS/Fargate)

## Conclusion

The Columbus Zero architecture is designed to be:

✅ **Scalable** - Serverless components scale automatically
✅ **Secure** - Multiple layers of security (Cognito, VPC, encryption)
✅ **Cost-Effective** - Pay-per-use pricing model
✅ **Maintainable** - Clear separation of concerns, Infrastructure as Code
✅ **Observable** - Comprehensive logging and monitoring
✅ **Resilient** - Automated backups, multi-AZ deployment

The architecture follows AWS Well-Architected Framework principles and industry best practices for cloud-native applications.
