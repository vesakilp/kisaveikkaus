#!/bin/bash

# Kisaveikkaus Setup Script
# This script helps set up the project for local development

set -e

echo "🚀 Kisaveikkaus Setup"
echo "===================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env setup"
        ENV_EXISTS=true
    fi
fi

# Create .env from example if needed
if [ "$ENV_EXISTS" != true ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your database credentials!${NC}"
    echo "   Get them from: https://console.prisma.io/"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Check if DATABASE_URL is set
if grep -q "YOUR_ACCELERATE_API_KEY" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Database credentials not configured${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Go to https://console.prisma.io/"
    echo "   2. Get your database credentials"
    echo "   3. Edit .env and replace placeholder values"
    echo "   4. Run: npm run prisma:push"
    echo "   5. Run: npm run dev"
    echo ""
else
    # Try to push database schema
    echo "🗄️  Pushing database schema..."
    if npm run prisma:push; then
        echo -e "${GREEN}✓ Database schema pushed${NC}"
        echo ""
        echo -e "${GREEN}🎉 Setup complete!${NC}"
        echo ""
        echo "Start development server with:"
        echo "   npm run dev"
        echo ""
    else
        echo -e "${RED}✗ Failed to push database schema${NC}"
        echo ""
        echo "Please check your database credentials in .env"
        echo "Then run: npm run prisma:push"
        echo ""
    fi
fi
