# Columbus Zero - AI-Powered Travel Planning Platform

Columbus Zero is a production-ready, full-stack AWS application that uses AI to generate personalized travel itineraries. Built with modern cloud-native technologies, it provides travelers with intelligent trip planning, real-time transportation guidance, and interactive chat assistance.

## Features

- **AI-Powered Itinerary Generation**: Create detailed day-by-day travel plans using Anthropic's Claude AI
- **Personalized Recommendations**: Tailored suggestions based on travel style, budget, and preferences
- **Real-Time Transportation Guidance**: Google Maps integration for navigation and local transport
- **Interactive Chat Assistant**: Ask travel questions and refine itineraries through conversation
- **User Authentication**: Secure sign-up and login with AWS Cognito
- **Multi-Device Support**: Responsive design for mobile and desktop use
- **Multi-Environment Deployments**: Separate dev, staging, and production environments

## Architecture

### Tech Stack

**Infrastructure**
- AWS CDK (TypeScript) - Infrastructure as Code
- Multi-stack architecture (Data, Auth, Compute, API, Frontend, Monitoring)

**Backend**
- Python 3.11 Lambda functions
- Poetry for dependency management
- PostgreSQL RDS (Aurora Serverless v2) for structured data
- DynamoDB for sessions and real-time data
- AWS Secrets Manager for API keys

**Frontend**
- React 18 with TypeScript
- Vite for fast builds
- TailwindCSS for styling
- AWS Amplify for authentication
- React Router for navigation
- TanStack Query for data fetching

**AI & APIs**
- Anthropic Claude API for travel planning
- Google Maps API for transportation

**Hosting & CDN**
- S3 + CloudFront with Origin Access Control (OAC)
- API Gateway REST API

**Monitoring**
- CloudWatch Logs, Metrics, and Dashboards
- CloudWatch Alarms with SNS notifications

## Project Structure

```
columbus-zero/
├── infrastructure/          # AWS CDK infrastructure code
│   ├── bin/                # CDK app entry point
│   ├── lib/
│   │   ├── stacks/        # Individual CDK stacks
│   │   │   ├── data-stack.ts
│   │   │   ├── auth-stack.ts
│   │   │   ├── compute-stack.ts
│   │   │   ├── api-stack.ts
│   │   │   ├── frontend-stack.ts
│   │   │   └── monitoring-stack.ts
│   │   └── config.ts      # Environment configuration
│   ├── package.json
│   └── tsconfig.json
├── backend/                # Lambda functions
│   ├── functions/
│   │   ├── itinerary/     # Itinerary management
│   │   ├── chat/          # Chat with AI
│   │   ├── user/          # User preferences
│   │   ├── transportation/ # Transport guidance
│   │   └── destinations/  # Destination suggestions
│   └── shared/            # Shared utilities
│       └── utils/         # Database, auth, response helpers
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript types
│   │   └── config/       # AWS Amplify config
│   ├── package.json
│   └── vite.config.ts
├── database/             # Database schemas and migrations
│   ├── migrations/       # SQL migration scripts
│   └── seeds/           # Sample data
├── scripts/             # Deployment scripts
│   ├── deploy.sh       # Main deployment script
│   └── setup.sh        # Initial setup script
├── docs/               # Documentation
│   ├── API.md         # API documentation
│   ├── ARCHITECTURE.md # Architecture details
│   └── COST.md        # Cost estimation
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
│       └── deploy.yml
├── .env.example        # Environment variables template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- Anthropic API key
- Google Maps API key

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/columbus-zero.git
   cd columbus-zero
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment variables**

   Update `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Update `frontend/.env`:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit frontend/.env
   cd ..
   ```

4. **Bootstrap AWS CDK** (first time only)
   ```bash
   cd infrastructure
   cdk bootstrap
   cd ..
   ```

5. **Store API keys in AWS Secrets Manager**
   ```bash
   aws secretsmanager create-secret \
     --name ANTHROPIC_API_KEY \
     --secret-string '{"api_key":"your-anthropic-api-key"}'

   aws secretsmanager create-secret \
     --name GOOGLE_MAPS_API_KEY \
     --secret-string '{"api_key":"your-google-maps-api-key"}'
   ```

### Development

1. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will be available at `http://localhost:5173`

2. **Deploy to development environment**
   ```bash
   npm run deploy:dev
   ```

3. **View logs**
   ```bash
   aws logs tail /aws/lambda/columbus-zero-generate-itinerary-dev --follow
   ```

### Deployment

#### Manual Deployment

```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh prod
```

#### Automated Deployment (GitHub Actions)

The project includes CI/CD pipelines that automatically deploy on push:

- `develop` branch → Development environment
- `staging` branch → Staging environment
- `main` branch → Production environment

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `DEV_USER_POOL_ID`, `DEV_USER_POOL_CLIENT_ID`
- `STAGING_USER_POOL_ID`, `STAGING_USER_POOL_CLIENT_ID`
- `PROD_USER_POOL_ID`, `PROD_USER_POOL_CLIENT_ID`

## Database Setup

### Running Migrations

1. Connect to your RDS instance
2. Run migration scripts in order:
   ```bash
   psql -h <rds-endpoint> -U admin -d columbus_travel -f database/migrations/001_initial_schema.sql
   ```

3. (Optional) Load sample data:
   ```bash
   psql -h <rds-endpoint> -U admin -d columbus_travel -f database/seeds/001_sample_destinations.sql
   ```

## API Documentation

See [docs/API.md](docs/API.md) for complete API documentation.

### Key Endpoints

- `POST /itinerary/generate` - Generate new itinerary
- `GET /itinerary/{id}` - Get itinerary details
- `PUT /itinerary/{id}` - Update itinerary
- `POST /chat` - Chat with AI assistant
- `GET /transportation/guidance` - Get transport recommendations
- `POST /user/preferences` - Save user preferences
- `GET /destinations/suggest` - Get destination suggestions

## Monitoring

### CloudWatch Dashboards

Access the monitoring dashboard:
```bash
aws cloudwatch get-dashboard --dashboard-name columbus-zero-dev
```

### Alarms

Alarms are configured for:
- API Gateway 5XX errors
- Lambda function errors
- Lambda throttles
- Database CPU utilization

### Cost Monitoring

See [docs/COST.md](docs/COST.md) for cost estimation and optimization tips.

**Estimated Monthly Costs (Development):**
- RDS Aurora Serverless v2: $30-50
- Lambda: $5-10
- DynamoDB: $5-10
- API Gateway: $3-5
- CloudFront: $1-5
- S3: $1-2
- **Total: ~$45-82/month**

## Security

- API authentication via Cognito JWT tokens
- API keys stored in AWS Secrets Manager
- S3 buckets with restricted access via CloudFront OAC
- VPC for database isolation
- HTTPS enforced on CloudFront
- Security headers configured
- Rate limiting on API Gateway

## Testing

```bash
# Frontend tests
cd frontend
npm test

# Infrastructure tests
cd infrastructure
npm test
```

## Troubleshooting

### Common Issues

1. **CDK bootstrap error**
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

2. **Frontend build fails**
   - Check that all environment variables are set in `frontend/.env`

3. **Lambda function timeout**
   - Increase timeout in `.env` file (`LAMBDA_TIMEOUT`)

4. **Database connection issues**
   - Verify security group allows Lambda access
   - Check RDS instance is running

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/columbus-zero/issues)
- Documentation: [docs/](docs/)

## Acknowledgments

- Built with [AWS CDK](https://aws.amazon.com/cdk/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/)
- Maps by [Google Maps API](https://developers.google.com/maps)
