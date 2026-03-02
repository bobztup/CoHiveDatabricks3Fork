# CoHive Installation Guide

Complete setup instructions for CoHive with Databricks integration via Vercel.

## Prerequisites

- Node.js 18+ and npm
- Databricks workspace access
- Vercel account (free tier works)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

The following key packages will be installed:
- `react` & `react-dom` - React framework
- `lucide-react` - Icons
- `@vercel/node` - Vercel serverless functions
- Other UI and utility libraries

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials:

```env
# Databricks OAuth (Required for file browsing)
VITE_DATABRICKS_CLIENT_ID=your_client_id_here
VITE_DATABRICKS_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### 3. Set Up Databricks OAuth

See [DATABRICKS_SETUP.md](./DATABRICKS_SETUP.md) for detailed instructions.

**Quick Steps:**
1. Register OAuth app in Databricks
2. Get Client ID
3. Add to `.env` file

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Production Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables in Vercel
4. Deploy automatically on push

### Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

```env
VITE_DATABRICKS_CLIENT_ID=production_client_id
VITE_DATABRICKS_REDIRECT_URI=https://your-vercel-domain.vercel.app/oauth/callback
```

**Important:** The redirect URI must match your Vercel deployment URL.

### Vercel Deployment Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   CoHive    │─────▶│ Vercel Serverless│─────▶│ Databricks  │
│  Frontend   │      │   Functions      │      │   Backend   │
└─────────────┘      └──────────────────┘      └─────────────┘
```

The `/api` directory contains TypeScript serverless functions that proxy requests to Databricks.

## Verify Installation

### Check Databricks Connection

1. Open the app
2. Try to browse Databricks files
3. You should be prompted to sign in
4. After OAuth, you should see your files

## Troubleshooting

### "VITE_DATABRICKS_CLIENT_ID is not set"

1. Check your `.env` file exists
2. Verify the variable name is correct
3. Restart your development server

### OAuth redirect not working

1. Check `VITE_DATABRICKS_REDIRECT_URI` matches Databricks OAuth app
2. Verify no trailing slashes
3. Ensure protocol matches (http vs https)

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Make changes**: Edit files in `/components`, `/utils`, etc.
3. **Test locally**: Use localhost:3000
4. **Build**: `npm run build` when ready
5. **Deploy**: Push to Vercel

## File Structure

```
/
├── api/                 # Vercel serverless functions
│   ├── health.ts
│   ├── databricks-list-files.ts
│   ├── databricks-read-file.ts
│   └── databricks-execute.ts
├── components/          # React components
│   ├── DatabricksFileBrowser.tsx
│   ├── DatabricksOAuthLogin.tsx
│   └── ui/             # UI components (shadcn)
├── utils/              # Utility functions
│   ├── databricksAuth.ts
│   ├── databricksClient.ts
│   └── safeFetch.ts
├── styles/             # CSS and theme
│   ├── globals.css
│   └── cohive-theme.ts
├── vercel.json         # Vercel configuration
├── .env.example        # Example environment variables
├── App.tsx             # Main app component
└── package.json        # Dependencies
```

## Next Steps

- ✅ Install dependencies
- ✅ Configure environment variables
- ✅ Set up Databricks OAuth
- ✅ Start development server
- ✅ Test connections
- ✅ Deploy to Vercel
- 📚 Read [Guidelines.md](./guidelines/Guidelines.md) for development standards
- 📚 Read [DATABRICKS_SETUP.md](./DATABRICKS_SETUP.md) for Databricks details
- 📚 Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- 📚 Read [IDEAS_FILE_DOCUMENTATION.md](./IDEAS_FILE_DOCUMENTATION.md) for ideas file feature

## Support

For issues:
1. Check the troubleshooting sections in this guide
2. Review [DATABRICKS_SETUP.md](./DATABRICKS_SETUP.md)
3. Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. Review [IDEAS_FILE_DOCUMENTATION.md](./IDEAS_FILE_DOCUMENTATION.md)
5. Check browser console for error messages
6. Verify all environment variables are set correctly

---

**Version**: 1.0.0  
**Last Updated**: February 2026
