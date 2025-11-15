# Getting Started with Columbus Zero

This guide will help you set up and deploy Columbus Zero quickly.

## Quick Start (5 minutes)

### 1. Initial Setup

```bash
# Run the setup script
./scripts/setup.sh

# This will:
# ✓ Check prerequisites (Node.js, Python, AWS CLI)
# ✓ Install all dependencies
# ✓ Create .env files from examples
```

### 2. Configure Environment

Edit `.env` file with your AWS credentials:

```bash
# Required
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1

# Optional (will use defaults)
STACK_PREFIX=columbus-zero
DB_NAME=columbus_travel
```

Edit `frontend/.env` file:

```bash
# These will be auto-populated after first deployment
VITE_API_URL=https://your-api-url.com
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxx
```

### 3. Bootstrap AWS CDK (First Time Only)

```bash
cd infrastructure
npx cdk bootstrap
cd ..
```

### 4. Store API Keys in Secrets Manager

**Anthropic API Key:**
```bash
aws secretsmanager create-secret \
  --name ANTHROPIC_API_KEY \
  --secret-string '{"api_key":"sk-ant-your-key-here"}' \
  --region us-east-1
```

**Google Maps API Key:**
```bash
aws secretsmanager create-secret \
  --name GOOGLE_MAPS_API_KEY \
  --secret-string '{"api_key":"AIzaSy-your-key-here"}' \
  --region us-east-1
```

### 5. Deploy to Development

```bash
# Deploy everything
./scripts/deploy.sh dev

# Or use npm script
npm run deploy:dev
```

The deployment script will:
1. ✓ Build frontend
2. ✓ Deploy infrastructure (CDK stacks)
3. ✓ Upload frontend to S3
4. ✓ Invalidate CloudFront cache
5. ✓ Display deployment URLs

### 6. Get Deployment Outputs

After deployment, you'll see:

```
═══════════════════════════════════════════════════════════
  ✅ Deployment to dev completed successfully!
═══════════════════════════════════════════════════════════

📊 Deployment Information:
  Environment:    dev
  API URL:        https://abc123.execute-api.us-east-1.amazonaws.com/dev
  Frontend URL:   https://d111111abcdef8.cloudfront.net

🔗 Useful Commands:
  View logs:      aws logs tail /aws/lambda/columbus-zero-generate-itinerary-dev --follow
  CloudWatch:     https://console.aws.amazon.com/cloudwatch/
  API Gateway:    https://console.aws.amazon.com/apigateway/
```

### 7. Update Frontend Configuration

Copy the outputs and update `frontend/.env`:

```bash
VITE_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev
VITE_USER_POOL_ID=us-east-1_ABC123XYZ
VITE_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
```

Get Cognito details:
```bash
aws cloudformation describe-stacks \
  --stack-name columbus-zero-auth-dev \
  --query 'Stacks[0].Outputs'
```

### 8. Run Database Migrations

Connect to your RDS instance and run migrations:

```bash
# Get RDS endpoint
aws cloudformation describe-stacks \
  --stack-name columbus-zero-data-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text

# Get database password
aws secretsmanager get-secret-value \
  --secret-id columbus-zero-db-credentials-dev \
  --query SecretString --output text

# Run migration
psql -h <rds-endpoint> -U admin -d columbus_travel -f database/migrations/001_initial_schema.sql

# (Optional) Load sample data
psql -h <rds-endpoint> -U admin -d columbus_travel -f database/seeds/001_sample_destinations.sql
```

### 9. Test the Application

Open the Frontend URL in your browser:

1. Click "Create account" to sign up
2. Verify your email
3. Log in
4. Click "Plan a New Trip"
5. Fill in destination details
6. Generate your first AI itinerary!

## Development Workflow

### Local Development

```bash
# Terminal 1: Run frontend dev server
cd frontend
npm run dev

# Access at http://localhost:5173
```

**Note:** Frontend will connect to deployed backend API (no local backend needed).

### Making Changes

**Infrastructure Changes:**
```bash
cd infrastructure

# See what will change
npx cdk diff --context environment=dev

# Deploy changes
npx cdk deploy --all --context environment=dev
```

**Frontend Changes:**
```bash
cd frontend

# Development with hot reload
npm run dev

# Build for production
npm run build

# Deploy to S3
cd ..
./scripts/deploy.sh dev
```

**Backend Changes:**
```bash
# Edit Lambda function code
# Then redeploy
cd infrastructure
npx cdk deploy columbus-zero-compute-dev
```

### Viewing Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/columbus-zero-generate-itinerary-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/columbus-zero-api-dev --follow

# All logs for a time period
aws logs filter-log-events \
  --log-group-name /aws/lambda/columbus-zero-generate-itinerary-dev \
  --start-time $(date -u -d '10 minutes ago' +%s)000
```

## Deploying to Staging/Production

### Staging Deployment

```bash
# Update .env for staging
ENVIRONMENT=staging

# Deploy
./scripts/deploy.sh staging
```

### Production Deployment

```bash
# Update .env for production
ENVIRONMENT=prod

# Deploy (requires confirmation)
./scripts/deploy.sh prod

# Type "yes" to confirm
```

### Automated Deployment with GitHub Actions

**Setup:**

1. Add GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Add these secrets:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`
     - Environment-specific secrets

2. Push to trigger deployment:
   ```bash
   # Deploy to dev
   git push origin develop

   # Deploy to staging
   git push origin staging

   # Deploy to production
   git push origin main
   ```

## Common Tasks

### Add a New Lambda Function

1. Create function directory:
   ```bash
   mkdir -p backend/functions/my-function/src
   ```

2. Add to ComputeStack:
   ```typescript
   this.functions.myFunction = new lambda.Function(this, 'MyFunction', {
     ...commonLambdaProps,
     code: lambda.Code.fromAsset(path.join(__dirname, '../../../backend/functions/my-function')),
     handler: 'src.handler.handler',
   });
   ```

3. Add to API:
   ```typescript
   const myResource = api.root.addResource('my-endpoint');
   myResource.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.myFunction));
   ```

### Add a New Page to Frontend

1. Create page component:
   ```bash
   touch frontend/src/pages/MyPage.tsx
   ```

2. Add route in `App.tsx`:
   ```typescript
   <Route path="/my-page" element={<MyPage />} />
   ```

### Update Database Schema

1. Create new migration:
   ```bash
   touch database/migrations/002_add_new_table.sql
   ```

2. Connect to RDS and run:
   ```bash
   psql -h <endpoint> -U admin -d columbus_travel -f database/migrations/002_add_new_table.sql
   ```

## Troubleshooting

### "CDK bootstrap required"

```bash
cd infrastructure
cdk bootstrap
```

### "Frontend build fails"

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Lambda function timeout"

Increase timeout in `.env`:
```
LAMBDA_TIMEOUT=60
```

Then redeploy.

### "Cannot connect to database"

1. Check RDS is running:
   ```bash
   aws rds describe-db-clusters --db-cluster-identifier <cluster-id>
   ```

2. Verify Lambda has VPC access in CDK

### "API returns 401 Unauthorized"

1. Check Cognito token is being sent:
   ```javascript
   const token = await fetchAuthSession();
   console.log('Token:', token);
   ```

2. Verify API Gateway authorizer is configured

## Cost Management

### Monitor Costs

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '1 day ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Set Up Budget Alerts

See `docs/COST.md` for detailed cost optimization strategies.

### Destroy Development Environment

```bash
# Destroy all stacks
cd infrastructure
cdk destroy --all --context environment=dev
```

**Warning:** This will delete all data in dev environment!

## Next Steps

1. ✅ Read [README.md](README.md) for project overview
2. ✅ Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture details
3. ✅ Check [docs/API.md](docs/API.md) for API documentation
4. ✅ Review [docs/COST.md](docs/COST.md) for cost optimization
5. ✅ Set up CloudWatch alarms for production
6. ✅ Configure custom domain (Route53 + ACM)
7. ✅ Set up CI/CD pipeline with GitHub Actions

## Getting Help

- **Documentation:** See `docs/` directory
- **Issues:** Check existing GitHub issues
- **Logs:** Use CloudWatch Logs for debugging
- **AWS Console:** View resources in AWS Console

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [React Documentation](https://react.dev/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [AWS Amplify](https://docs.amplify.aws/)
