# GitHub Auto-Deployment Setup Guide

This guide will help you set up automatic deployment when you push to the `main` branch using GitHub Actions.

## 🚀 Quick Setup

The repository includes a comprehensive CI/CD pipeline that automatically:
- ✅ Runs tests on every push
- ✅ Builds the application 
- ✅ Creates Docker images
- ✅ Deploys to multiple platforms
- ✅ Notifies deployment status

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Deployment Platform Account**: Choose your preferred platform(s)
3. **Planning Center OAuth App**: For production Planning Center integration

## 🔐 Required Secrets

### 1. Navigate to GitHub Repository Settings

Go to your repository → Settings → Secrets and Variables → Actions

### 2. Add Repository Secrets

#### **Core Application Secrets** (Required for all deployments)
```
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
COOKIE_SECRET=your-cookie-secret-32-chars-minimum  
ENCRYPTION_KEY=12345678901234567890123456789012
PCO_CLIENT_ID=your-planning-center-client-id
PCO_CLIENT_SECRET=your-planning-center-client-secret
FRONTEND_URL=https://your-frontend-domain.com
```

#### **Docker Hub Secrets** (If using Docker deployment)
```
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password
```

#### **Render.com Secrets** (Recommended - Free tier available)
```
RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxxx?key=xxxxx
RENDER_API_KEY=your-render-api-key
RENDER_APP_URL=https://your-app.onrender.com
```

#### **Railway Secrets** (Optional)
```
RAILWAY_TOKEN=your-railway-token
RAILWAY_SERVICE_ID=your-railway-service-id
RAILWAY_APP_URL=https://your-app.railway.app
```

#### **Vercel Secrets** (Optional)
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

#### **Self-Hosted Docker Secrets** (Optional)
```
DEPLOY_HOST=your-server-ip-or-domain
DEPLOY_USER=your-server-username
DEPLOY_SSH_KEY=your-private-ssh-key
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
```

#### **Frontend Deployment Secrets**
```
FRONTEND_API_URL=https://your-backend-api.com
FRONTEND_WS_URL=wss://your-backend-api.com/ws
VERCEL_FRONTEND_PROJECT_ID=your-frontend-vercel-project
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-netlify-site-id
```

#### **Notification Secrets** (Optional)
```
DISCORD_WEBHOOK=https://discord.com/api/webhooks/xxx/xxx
```

### 3. Add Repository Variables

Go to Settings → Secrets and Variables → Actions → Variables tab:

```
ENABLE_RAILWAY_DEPLOY=true    # Enable Railway deployment
ENABLE_VERCEL_DEPLOY=true     # Enable Vercel deployment  
ENABLE_DOCKER_DEPLOY=true     # Enable Docker deployment
ENABLE_FRONTEND_VERCEL=true   # Deploy frontend to Vercel
ENABLE_FRONTEND_NETLIFY=false # Deploy frontend to Netlify
ENABLE_DISCORD_NOTIFICATIONS=true # Enable Discord notifications
```

## 🎯 Platform-Specific Setup

### Option 1: Render.com (Recommended)

**Why Render?** Free tier, automatic HTTPS, easy database setup, great for Node.js apps.

1. **Create Render Account**: [render.com](https://render.com)

2. **Create New Web Service**:
   - Connect your GitHub repository
   - Use these settings:
     ```
     Build Command: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
     Start Command: npm start
     ```

3. **Add Environment Variables** in Render dashboard:
   ```
   NODE_ENV=production
   DATABASE_URL=<from your Render PostgreSQL>
   REDIS_URL=<from your Render Redis>
   JWT_SECRET=<generate secure value>
   COOKIE_SECRET=<generate secure value>
   ENCRYPTION_KEY=<generate 32-character value>
   PCO_CLIENT_ID=<your Planning Center client ID>
   PCO_CLIENT_SECRET=<your Planning Center client secret>
   FRONTEND_URL=<your frontend URL>
   ```

4. **Create Database**: Add PostgreSQL service in Render

5. **Create Redis**: Add Redis service in Render

6. **Get Deploy Hook**: 
   - Go to Settings → Deploy Hook
   - Copy the webhook URL
   - Add as `RENDER_DEPLOY_HOOK_URL` secret in GitHub

7. **Get API Key**:
   - Go to Account Settings → API Keys
   - Create new key
   - Add as `RENDER_API_KEY` secret in GitHub

### Option 2: Railway

1. **Create Railway Account**: [railway.app](https://railway.app)

2. **Create New Project**: Connect GitHub repository

3. **Add Database**: Add PostgreSQL and Redis services

4. **Get API Token**:
   - Go to Account Settings → Tokens
   - Create new token
   - Add as `RAILWAY_TOKEN` secret in GitHub

5. **Get Service ID**: Copy from Railway dashboard URL

### Option 3: Docker Self-Hosted

1. **Prepare Server**: 
   ```bash
   # Install Docker
   sudo apt update
   sudo apt install docker.io docker-compose
   
   # Setup PostgreSQL and Redis
   # (Use managed databases or Docker containers)
   ```

2. **Setup SSH Access**:
   ```bash
   # Generate SSH key pair
   ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"
   
   # Add public key to server
   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
   
   # Add private key to GitHub secrets as DEPLOY_SSH_KEY
   ```

3. **Configure Server**: Ensure Docker and database access

### Option 4: Vercel (Serverless)

⚠️ **Note**: Vercel has limitations with WebSockets and background jobs.

1. **Create Vercel Account**: [vercel.com](https://vercel.com)

2. **Install Vercel CLI**: 
   ```bash
   npm i -g vercel
   vercel login
   ```

3. **Link Project**: 
   ```bash
   vercel link
   ```

4. **Get Tokens**: From Vercel dashboard → Settings → Tokens

## 🔧 Environment Setup

### Development Environment
```bash
# .env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/planning_center_dev
REDIS_URL=redis://localhost:6379
# ... other vars
```

### Production Environment
All production secrets should be stored in:
- GitHub Secrets (for CI/CD)
- Platform environment variables (Render, Railway, etc.)
- Server environment files (for self-hosted)

## 🚀 Deployment Process

### Automatic Deployment (Push to Main)

1. **Push to Main Branch**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

2. **Watch GitHub Actions**:
   - Go to your repository → Actions tab
   - Monitor the deployment progress
   - See real-time logs for each step

3. **Verification**:
   - Pipeline automatically tests health endpoints
   - Discord notifications (if enabled)
   - Manual verification at your deployed URL

### Manual Deployment

You can also trigger deployments manually:

1. **GitHub Actions**: Go to Actions → CI/CD Pipeline → Run workflow

2. **Platform-Specific**:
   ```bash
   # Render
   curl -X POST "$RENDER_DEPLOY_HOOK_URL"
   
   # Railway
   railway up
   
   # Vercel
   vercel --prod
   ```

## 🧪 Testing Before Deployment

The pipeline runs comprehensive tests before deploying:
- Unit tests
- Integration tests  
- Type checking
- Linting
- Build verification

## 🔍 Monitoring Deployments

### GitHub Actions Logs
- Real-time deployment progress
- Error logs and debugging info
- Deployment status and timing

### Health Checks
All deployments verify the `/health` endpoint:
```bash
curl https://your-app.com/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}
```

### Discord Notifications (Optional)
Get real-time deployment notifications:
1. Create Discord webhook in your server
2. Add webhook URL as `DISCORD_WEBHOOK` secret
3. Set `ENABLE_DISCORD_NOTIFICATIONS=true`

## 🛠 Troubleshooting

### Common Issues

1. **Secrets Not Set**:
   ```
   Error: Secret "JWT_SECRET" not found
   ```
   **Solution**: Add missing secrets in GitHub repository settings

2. **Database Connection Failed**:
   ```
   Error: Connection refused at localhost:5432
   ```
   **Solution**: Check `DATABASE_URL` secret and database status

3. **Build Failures**:
   ```
   Error: TypeScript compilation failed
   ```
   **Solution**: Fix TypeScript errors and push again

4. **Deployment Timeouts**:
   ```
   Error: Deployment timed out
   ```
   **Solution**: Check platform status and resource limits

### Debug Steps

1. **Check GitHub Actions Logs**: Repository → Actions → Latest run

2. **Verify Secrets**: Settings → Secrets and Variables → Actions

3. **Test Locally**: 
   ```bash
   npm run build
   npm start
   curl http://localhost:3001/health
   ```

4. **Check Platform Status**: 
   - Render: [status.render.com](https://status.render.com)
   - Railway: [status.railway.app](https://status.railway.app)
   - Vercel: [status.vercel.com](https://status.vercel.com)

## 🔐 Security Best Practices

1. **Never commit secrets** to the repository
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** (every 90 days)
4. **Monitor access logs** for unauthorized access
5. **Use least privilege** for service accounts
6. **Enable 2FA** on all platform accounts

## 📈 Advanced Configuration

### Multiple Environments

Create separate environments for staging:

1. **Create `develop` branch** for staging deployments
2. **Modify workflow** to deploy `develop` to staging
3. **Use different secrets** for staging environment

### Custom Deployment Hooks

Add custom steps to the workflow:
```yaml
- name: Custom deployment step
  run: |
    # Your custom deployment logic
    echo "Running custom deployment tasks..."
```

### Rollback Strategy

In case of deployment issues:
```bash
# Render: Redeploy previous version
curl -X POST "$RENDER_DEPLOY_HOOK_URL" -d '{"clearCache": true}'

# Docker: Rollback to previous image
docker run -d --name planning-center-mcp $DOCKER_USERNAME/planning-center-mcp:previous-tag
```

## 🎉 Success!

Once configured, your deployment flow will be:

1. 🔧 **Code** → Write features locally
2. 🧪 **Test** → Run tests locally  
3. 📤 **Push** → `git push origin main`
4. 🤖 **Automate** → GitHub Actions takes over
5. ✅ **Deploy** → Live in production!
6. 📱 **Notify** → Discord notification (optional)

**Your app will be automatically deployed every time you push to main!** 🚀