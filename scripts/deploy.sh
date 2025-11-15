#!/bin/bash

# Columbus Zero Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh dev

set -e

ENVIRONMENT=${1:-dev}
echo "🚀 Deploying Columbus Zero to environment: $ENVIRONMENT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Valid environments: dev, staging, prod"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found"
    echo "Please create a .env file from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Confirm production deployment
if [ "$ENVIRONMENT" = "prod" ]; then
    print_warning "You are about to deploy to PRODUCTION"
    read -p "Are you sure you want to continue? (yes/no): " -n 3 -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        print_error "Production deployment cancelled"
        exit 1
    fi
fi

# Step 1: Install dependencies
print_status "Installing dependencies..."
cd infrastructure && npm install && cd ..
cd frontend && npm install && cd ..

# Step 2: Build Lambda functions (if needed)
print_status "Preparing Lambda functions..."
# Note: In production, Lambda functions would be built with poetry

# Step 3: Build frontend
print_status "Building frontend..."
cd frontend
npm run build
cd ..

# Step 4: Bootstrap CDK (if needed)
print_status "Checking CDK bootstrap..."
cd infrastructure
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    print_warning "CDK not bootstrapped. Bootstrapping now..."
    cdk bootstrap
fi

# Step 5: Synthesize CDK stacks
print_status "Synthesizing CDK stacks..."
cdk synth --context environment=$ENVIRONMENT

# Step 6: Deploy infrastructure
print_status "Deploying infrastructure stacks..."
cdk deploy --all --context environment=$ENVIRONMENT --require-approval never

# Get outputs
print_status "Retrieving deployment outputs..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name columbus-zero-api-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name columbus-zero-frontend-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name columbus-zero-frontend-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name columbus-zero-frontend-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" \
    --output text)

cd ..

# Step 7: Deploy frontend to S3
print_status "Deploying frontend to S3..."
aws s3 sync frontend/dist s3://$FRONTEND_BUCKET --delete

# Step 8: Invalidate CloudFront cache
print_status "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" > /dev/null

# Step 9: Run database migrations (if needed)
if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "staging" ]; then
    print_warning "Remember to run database migrations manually if needed"
    print_warning "See database/migrations/ directory"
fi

# Print deployment summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Deployment to $ENVIRONMENT completed successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Deployment Information:"
echo "  Environment:    $ENVIRONMENT"
echo "  API URL:        $API_URL"
echo "  Frontend URL:   $CLOUDFRONT_URL"
echo ""
echo "🔗 Useful Commands:"
echo "  View logs:      aws logs tail /aws/lambda/columbus-zero-generate-itinerary-$ENVIRONMENT --follow"
echo "  CloudWatch:     https://console.aws.amazon.com/cloudwatch/"
echo "  API Gateway:    https://console.aws.amazon.com/apigateway/"
echo ""
echo "⚙️  Next Steps:"
echo "  1. Configure API keys in Secrets Manager:"
echo "     - ANTHROPIC_API_KEY"
echo "     - GOOGLE_MAPS_API_KEY"
echo "  2. Run database migrations if needed"
echo "  3. Test the application at: $CLOUDFRONT_URL"
echo ""
echo "═══════════════════════════════════════════════════════════"
