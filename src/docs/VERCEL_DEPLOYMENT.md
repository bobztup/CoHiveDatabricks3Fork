# Vercel Deployment Guide for CoHive

Complete guide for deploying CoHive to Vercel with Databricks integration.

## Prerequisites

- Vercel account (free tier works)
- GitHub account (recommended)
- Databricks workspace with OAuth app configured
- Node.js 18+ installed locally

---

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

This method provides automatic deployments when you push to GitHub.

#### Step 1: Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/cohive.git

# Push to GitHub
git push -u origin main
```

#### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the framework (Vite)

#### Step 3: Configure Project

**Framework Preset:** Vite  
**Root Directory:** ./  
**Build Command:** `npm run build`  
**Output Directory:** `dist`

#### Step 4: Set Environment Variables

In Vercel project settings, add:

```env
VITE_DATABRICKS_CLIENT_ID=your_databricks_client_id
VITE_DATABRICKS_REDIRECT_URI=https://your-project.vercel.app/oauth/callback
```

**Important:** Replace `your-project.vercel.app` with your actual Vercel domain.

#### Step 5: Deploy

Click "Deploy" - Vercel will build and deploy automatically.

---

### Method 2: Vercel CLI

Deploy directly from your local machine using the Vercel CLI.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

#### Step 3: Deploy

```bash
# First deployment (configure project)
vercel

# Production deployment
vercel --prod
```

#### Step 4: Set Environment Variables

```bash
# Add environment variables
vercel env add VITE_DATABRICKS_CLIENT_ID
# Enter your client ID when prompted

vercel env add VITE_DATABRICKS_REDIRECT_URI
# Enter https://your-domain.vercel.app/oauth/callback
```

---

## Post-Deployment Configuration

### 1. Update Databricks OAuth App

After deployment, update your Databricks OAuth app:

1. Go to Databricks Workspace
2. Settings → Developer → OAuth Apps
3. Edit your OAuth app
4. Add Vercel redirect URI: `https://your-domain.vercel.app/oauth/callback`
5. Save changes

### 2. Test Deployment

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Click "Get Started" or "Login"
3. Enter your Databricks workspace URL
4. Complete OAuth flow
5. Verify file browsing works

---

## Vercel Configuration

Your project includes `vercel.json` with the following configuration:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures:
- API routes work correctly
- Single-page application routing works
- Static assets are served properly

---

## API Routes

Vercel automatically deploys serverless functions from `/api`:

- `GET /api/health` - Health check
- `GET /api/databricks-list-files` - List Databricks files
- `POST /api/databricks-read-file` - Read file content
- `POST /api/databricks-execute` - Execute AI requests

These run as serverless functions with:
- **Memory:** 1024 MB
- **Timeout:** 30 seconds
- **Region:** Auto (closest to user)

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_DATABRICKS_CLIENT_ID` | Databricks OAuth client ID | `abc123xyz` |
| `VITE_DATABRICKS_REDIRECT_URI` | OAuth callback URL | `https://your-app.vercel.app/oauth/callback` |

### Setting Variables

**Via Vercel Dashboard:**
1. Project Settings → Environment Variables
2. Add each variable with value
3. Select environments (Production, Preview, Development)

**Via Vercel CLI:**
```bash
vercel env add VARIABLE_NAME
```

---

## Automatic Deployments

With GitHub integration, Vercel automatically deploys:

- **Production:** When you push to `main` branch
- **Preview:** When you create a pull request
- **Development:** When you push to feature branches

### Deployment Status

Check deployment status:
1. Vercel Dashboard → Your Project → Deployments
2. Or visit: `https://vercel.com/YOUR_USERNAME/cohive`

---

## Custom Domain (Optional)

### Add Custom Domain

1. Vercel Dashboard → Project Settings → Domains
2. Add your domain (e.g., `cohive.yourdomain.com`)
3. Configure DNS records as shown by Vercel
4. Wait for DNS propagation (5-60 minutes)

### Update Environment Variables

After adding custom domain:

```bash
# Update redirect URI
vercel env add VITE_DATABRICKS_REDIRECT_URI
# Enter: https://cohive.yourdomain.com/oauth/callback
```

Also update in Databricks OAuth app settings.

---

## Troubleshooting

### Build Fails

**Error:** "Module not found"
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check build logs in Vercel dashboard

**Error:** "TypeScript errors"
- Fix TypeScript errors locally first
- Run `npm run build` to test
- Push fixes to GitHub

### API Routes Not Working

**Error:** "404 on /api/* endpoints"
- Check `vercel.json` configuration
- Verify `/api` directory exists with `.ts` files
- Ensure `@vercel/node` is in `devDependencies`

**Error:** "Function timeout"
- Databricks requests take too long
- Increase timeout in `vercel.json` (max 60s for Pro plan)
- Optimize API calls

### OAuth Redirect Issues

**Error:** "Redirect URI mismatch"
- Verify `VITE_DATABRICKS_REDIRECT_URI` matches Vercel domain
- Check Databricks OAuth app has correct redirect URI
- Ensure no trailing slashes

**Error:** "OAuth state mismatch"
- Clear browser sessionStorage
- Try OAuth flow again
- Check for browser extensions blocking cookies

---

## Performance Optimization

### Enable Caching

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Optimize Build

```bash
# Analyze bundle size
npm run build -- --mode production

# Check dist/ folder size
du -sh dist/
```

---

## Monitoring

### View Logs

**Via Dashboard:**
1. Vercel Dashboard → Project → Functions
2. Click on a function to see logs

**Via CLI:**
```bash
vercel logs
```

### Analytics

Enable Vercel Analytics:
1. Project Settings → Analytics
2. Enable Web Analytics
3. Add `<Analytics />` component to your app

---

## Scaling

Vercel automatically scales your application:

- **Free Plan:** Unlimited deployments, 100 GB bandwidth
- **Pro Plan:** More resources, longer function timeouts
- **Enterprise Plan:** Custom limits, dedicated support

No server management required!

---

## Rollback

If deployment fails or has issues:

```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote [deployment-url]
```

Or in Vercel Dashboard:
1. Deployments tab
2. Find working deployment
3. Click "Promote to Production"

---

## CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/vercel.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## Support

### Vercel Support

- [Documentation](https://vercel.com/docs)
- [Community](https://github.com/vercel/vercel/discussions)
- [Status](https://vercel-status.com)

### CoHive Issues

- Check [INSTALLATION.md](./INSTALLATION.md)
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Review Vercel deployment logs
- Check Databricks OAuth configuration

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Status:** ✅ Production Ready for Vercel
