# 🚀 Quick Deploy to Production

## TL;DR - Get Auto-Deploy Working in 5 Minutes

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Add GitHub Secrets
Go to your repo → Settings → Secrets and Variables → Actions

**Add these secrets:**
```
JWT_SECRET=your-jwt-secret-32-chars-minimum
COOKIE_SECRET=your-cookie-secret-32-chars-minimum
ENCRYPTION_KEY=12345678901234567890123456789012
PCO_CLIENT_ID=your-planning-center-client-id
PCO_CLIENT_SECRET=your-planning-center-client-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Step 3: Choose Your Platform

#### Option A: Render.com (Recommended - Free Tier)

1. **Create Render Account**: [render.com](https://render.com)
2. **Connect GitHub**: Link your repository
3. **Create Web Service** with these settings:
   ```
   Build Command: npm install && npm run build && npx prisma generate && npx prisma migrate deploy
   Start Command: npm start
   ```
4. **Add PostgreSQL**: Create database service
5. **Add Redis**: Create Redis service
6. **Get Deploy Hook**: Settings → Deploy Hook → Copy URL
7. **Add to GitHub Secrets**:
   ```
   RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxxx?key=xxxxx
   RENDER_APP_URL=https://your-app.onrender.com
   ```

#### Option B: Railway (Simple Alternative)

1. **Create Railway Account**: [railway.app](https://railway.app)
2. **Connect GitHub**: Link repository
3. **Add PostgreSQL + Redis** services
4. **Get API Token**: Account Settings → Tokens
5. **Add to GitHub Secrets**:
   ```
   RAILWAY_TOKEN=your-railway-token
   RAILWAY_SERVICE_ID=your-service-id
   RAILWAY_APP_URL=https://your-app.railway.app
   ```
6. **Enable Railway Deploy**: Add repository variable:
   ```
   ENABLE_RAILWAY_DEPLOY=true
   ```

### Step 4: Deploy!

```bash
git add .
git commit -m "Setup auto-deployment"
git push origin main
```

**That's it!** GitHub Actions will automatically:
- ✅ Run tests
- ✅ Build the app
- ✅ Deploy to your platform
- ✅ Verify health checks

## 📱 Monitor Your Deployment

1. **GitHub Actions**: Repo → Actions tab
2. **Platform Dashboard**: Check Render/Railway dashboard
3. **Health Check**: Visit `https://your-app.com/health`

## 🛠 Troubleshooting

### Deployment Failed?

1. **Check GitHub Actions logs**: Repository → Actions → Latest run
2. **Verify secrets**: Settings → Secrets and Variables → Actions
3. **Check platform status**: Visit platform status page

### Common Issues:

**Secret not found**: Add missing secret to GitHub
**Build failed**: Check TypeScript errors locally
**Database error**: Verify DATABASE_URL is correct
**Health check failed**: Check app logs in platform dashboard

## 🎉 Success!

Your app auto-deploys every time you push to main! 

**Next Steps:**
- Set up custom domain
- Configure Planning Center OAuth
- Deploy the frontend
- Add monitoring

## 🔧 Advanced Options

See [GITHUB_DEPLOYMENT_SETUP.md](./GITHUB_DEPLOYMENT_SETUP.md) for:
- Multiple platforms (Vercel, Docker, etc.)
- Staging environments
- Frontend deployment
- Discord notifications
- Custom deployment scripts

---

**Need help?** Check the deployment logs first, then open a GitHub issue!