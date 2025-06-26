#!/bin/bash

# Railway Backend Deployment Script
echo "🚀 Deploying Backend to Railway..."

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo "❌ Please run this script from the backend directory"
    echo "   cd backend && ./deploy-to-railway.sh"
    exit 1
fi

echo "📦 Checking dependencies..."
npm install

echo "🔧 Testing server locally..."
timeout 5s npm start &
sleep 3

echo "🚀 Deploying to Railway..."
echo "   Make sure you have Railway CLI installed:"
echo "   npm install -g @railway/cli"
echo ""
echo "   Run these commands:"
echo "   railway login"
echo "   railway link (select your project)"
echo "   railway up"
echo ""
echo "🔑 Don't forget to set environment variables in Railway Dashboard:"
echo "   GEMINI_API_KEY=your_gemini_api_key"
echo "   PORT=8080"
echo "   NODE_ENV=production" 
echo "   FRONTEND_URL=https://your-vercel-app.vercel.app"
echo ""
echo "✅ Files ready for deployment:"
echo "   - package.json (updated with Railway scripts)"
echo "   - railway.json (Railway configuration)"
echo "   - nixpacks.toml (Build optimization)"
echo "   - server.js (Your main app)"

# If Railway CLI is available, attempt deployment
if command -v railway &> /dev/null; then
    echo ""
    read -p "🚀 Deploy now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway up
    fi
else
    echo ""
    echo "📥 Install Railway CLI first:"
    echo "   npm install -g @railway/cli"
fi
