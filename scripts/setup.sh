#!/bin/bash

# Columbus Zero Initial Setup Script
# This script helps set up the development environment

set -e

echo "🔧 Setting up Columbus Zero development environment..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
print_status "Node.js $(node --version) installed"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
print_status "npm $(npm --version) installed"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi
print_status "Python $(python3 --version) installed"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI is not installed. Please install it for deployment."
else
    print_status "AWS CLI $(aws --version) installed"
fi

# Check CDK
if ! command -v cdk &> /dev/null; then
    print_warning "AWS CDK is not installed. Installing now..."
    npm install -g aws-cdk
fi
print_status "AWS CDK $(cdk --version) installed"

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from .env.example..."
    cp .env.example .env
    print_warning "Please update .env file with your configuration"
else
    print_status ".env file already exists"
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Install infrastructure dependencies
print_status "Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create frontend .env
if [ ! -f "frontend/.env" ]; then
    print_status "Creating frontend/.env from example..."
    cp frontend/.env.example frontend/.env
    print_warning "Please update frontend/.env with your configuration"
fi

# Make scripts executable
chmod +x scripts/*.sh
print_status "Made scripts executable"

# Done
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Setup completed successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Next Steps:"
echo "  1. Configure .env file with your AWS credentials"
echo "  2. Configure frontend/.env with your environment"
echo "  3. Bootstrap CDK: cd infrastructure && cdk bootstrap"
echo "  4. Deploy to dev: npm run deploy:dev"
echo "  5. Start frontend dev server: cd frontend && npm run dev"
echo ""
echo "📚 Documentation:"
echo "  See README.md for detailed setup instructions"
echo ""
