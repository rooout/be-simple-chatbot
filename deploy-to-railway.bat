@echo off
REM Railway Backend Deployment Script for Windows

echo 🚀 Deploying Backend to Railway...

REM Check if we're in the backend directory
if not exist "server.js" (
    echo ❌ Please run this script from the backend directory
    echo    cd backend && deploy-to-railway.bat
    exit /b 1
)

echo 📦 Checking dependencies...
call npm install

echo 🚀 Ready for Railway deployment!
echo.
echo 🔑 Make sure to set these environment variables in Railway Dashboard:
echo    GEMINI_API_KEY=your_gemini_api_key
echo    PORT=8080
echo    NODE_ENV=production
echo    FRONTEND_URL=https://your-vercel-app.vercel.app
echo.
echo ✅ Files ready for deployment:
echo    - package.json (updated with Railway scripts)
echo    - railway.json (Railway configuration)
echo    - nixpacks.toml (Build optimization)
echo    - server.js (Your main app)
echo.
echo 📥 To deploy:
echo    1. Install Railway CLI: npm install -g @railway/cli
echo    2. Login: railway login
echo    3. Link project: railway link
echo    4. Deploy: railway up
echo.
pause
