# Planning Center MCP - Deployment Guide

This guide covers various deployment options for the Planning Center MCP server.

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Planning Center OAuth application (for production)

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `JWT_SECRET` - Secret for JWT token signing (32+ characters)
- `COOKIE_SECRET` - Secret for cookie signing (32+ characters)
- `ENCRYPTION_KEY` - AES-256 encryption key (32 characters exactly)

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Log level (debug/info/warn/error)
- `PCO_CLIENT_ID` - Planning Center OAuth client ID
- `PCO_CLIENT_SECRET` - Planning Center OAuth client secret
- `PCO_REDIRECT_URI` - OAuth redirect URI
- `FRONTEND_URL` - Frontend application URL
- `MCP_SERVER_NAME` - MCP server name (default: planning-center-mcp)
- `MCP_SERVER_VERSION` - MCP server version (default: 1.0.0)

## Local Development

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd planning-center-mcp
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this
COOKIE_SECRET=your-cookie-secret-32-chars-minimum
ENCRYPTION_KEY=12345678901234567890123456789012
PCO_CLIENT_ID=your-pco-client-id
PCO_CLIENT_SECRET=your-pco-client-secret
```

4. Start services:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npm run db:migrate:prod
```

6. Seed database (optional):
```bash
npm run db:seed
```

The server will be available at `http://localhost:3001`.

### Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Setup PostgreSQL and Redis locally

3. Copy and configure environment:
```bash
cp .env.example .env
# Edit .env with your database and Redis URLs
```

4. Generate Prisma client and run migrations:
```bash
npm run db:generate
npm run db:migrate
```

5. Build and start:
```bash
npm run build
npm start
```

## Testing

### Run Tests

```bash
# Setup test database
createdb planning_center_test

# Run tests
npm test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test:watch
```

### Test Environment

Create `.env.test`:
```env
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/planning_center_test
TEST_REDIS_URL=redis://localhost:6379/1
# ... other test vars
```

## Production Deployment

### Render.com (Recommended)

1. Fork this repository to your GitHub account

2. Connect your GitHub repo to Render

3. Use the provided `render.yaml` configuration

4. Set environment variables in Render dashboard:
   - `PCO_CLIENT_ID`
   - `PCO_CLIENT_SECRET`
   - Other production secrets

5. Deploy! Render will automatically:
   - Build the application
   - Run database migrations
   - Start the server

### Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Configure environment variables in Vercel dashboard

**Note**: Vercel has limitations with WebSocket and background jobs. Consider using Render for full features.

### Docker

#### Build Image

```bash
docker build -t planning-center-mcp .
```

#### Run Container

```bash
docker run -d \
  --name planning-center-mcp \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=your-jwt-secret \
  -e COOKIE_SECRET=your-cookie-secret \
  -e ENCRYPTION_KEY=your-encryption-key \
  planning-center-mcp
```

#### Docker Compose Production

```bash
# Set production environment variables
export JWT_SECRET=your-production-jwt-secret
export COOKIE_SECRET=your-production-cookie-secret
export ENCRYPTION_KEY=your-production-encryption-key
export PCO_CLIENT_ID=your-pco-client-id
export PCO_CLIENT_SECRET=your-pco-client-secret

# Deploy
docker-compose up -d
```

### Kubernetes

1. Create namespace:
```bash
kubectl create namespace planning-center-mcp
```

2. Create secrets:
```bash
kubectl create secret generic planning-center-secrets \
  --from-literal=database-url=postgresql://... \
  --from-literal=redis-url=redis://... \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=cookie-secret=your-cookie-secret \
  --from-literal=encryption-key=your-encryption-key \
  --from-literal=pco-client-id=your-pco-client-id \
  --from-literal=pco-client-secret=your-pco-client-secret \
  -n planning-center-mcp
```

3. Deploy:
```bash
kubectl apply -f kubernetes/deployment.yaml -n planning-center-mcp
```

### Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Deploy:
```bash
railway up
```

4. Add environment variables in Railway dashboard

## CI/CD

### GitHub Actions

The repository includes a complete CI/CD pipeline in `.github/workflows/ci.yml`:

- **Test**: Runs tests with PostgreSQL and Redis
- **Build**: Creates production build
- **Docker**: Builds and pushes Docker image
- **Deploy**: Deploys to production (customize for your platform)

### Required Secrets

Add these to your GitHub repository secrets:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- Any deployment-specific secrets

## Database Migrations

### Development
```bash
npm run db:migrate
```

### Production
```bash
npm run db:migrate:prod
```

### Reset (Development Only)
```bash
npx prisma migrate reset
```

## Monitoring

### Health Checks

The server provides health check endpoints:
- `GET /health` - Basic health status
- Includes database and Redis connectivity checks

### Logging

Uses structured logging with Pino:
- Development: Pretty-printed logs
- Production: JSON logs for log aggregation

### Metrics

Consider adding:
- Application metrics (Prometheus)
- Error tracking (Sentry)
- APM (New Relic, DataDog)

## Security Considerations

### Production Checklist

- [ ] Use strong, unique secrets for all environment variables
- [ ] Enable HTTPS/TLS in production
- [ ] Use secure cookie settings
- [ ] Configure CORS properly for your frontend domain
- [ ] Set up proper firewall rules
- [ ] Use non-root user in containers
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities

### Environment Variables Security

- Never commit secrets to git
- Use secret management systems (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets for each environment

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database is accessible
   - Check firewall rules

2. **Redis Connection Errors**
   - Check REDIS_URL format
   - Verify Redis is running
   - Check memory limits

3. **Build Errors**
   - Run `npm run typecheck`
   - Check for missing dependencies
   - Verify Node.js version

4. **WebSocket Issues**
   - Check proxy configuration
   - Verify WebSocket support
   - Check CORS settings

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

### Logs

Check application logs:
```bash
# Docker
docker logs planning-center-mcp

# Kubernetes
kubectl logs deployment/planning-center-mcp -n planning-center-mcp

# Local
npm run dev
```

## Performance

### Scaling

- Use multiple instances behind load balancer
- Configure Redis for session sharing
- Use read replicas for database
- Consider Redis clustering for high load

### Optimization

- Enable gzip compression
- Use CDN for static assets
- Configure database connection pooling
- Monitor and tune garbage collection

## Backup

### Database
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Redis
```bash
redis-cli --rdb backup.rdb
```

### Automated Backups

Set up automated backups for:
- PostgreSQL database
- Redis snapshots
- Application logs
- Configuration files

## Support

For deployment issues:
1. Check the logs first
2. Review this deployment guide
3. Check the GitHub issues
4. Open a new issue with deployment details