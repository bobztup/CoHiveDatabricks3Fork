# Protected Files - DO NOT OVERWRITE

## ⚠️ CRITICAL: Read Before Exporting from Figma

These files contain custom Databricks integration code that must NOT be overwritten when Figma exports new UI code.

**For Figma Developers:** When exporting new versions, skip these files or merge changes carefully.

---

## 🔐 Protected Backend API Files

### Databricks OAuth & Authentication
```
api/databricks/auth.js
```
- Handles OAuth token exchange server-side
- Required for all Databricks API calls

### Databricks File Browser API
```
api/databricks/files.js
```
- Lists files from Databricks workspace
- Used by file browser UI

### Knowledge Base APIs
```
api/databricks/knowledge-base/upload.js
api/databricks/knowledge-base/list.js
api/databricks/knowledge-base/approve.js
api/databricks/knowledge-base/update.js
api/databricks/knowledge-base/delete.js
```
- Complete Knowledge Base CRUD operations
- Uses REST API (not SQL package)
- Connects to Unity Catalog volumes and Delta tables

### AI & Agent APIs
```
api/databricks/ai/prompt.js
api/databricks/ai/agent.js
```
- AI prompt execution using Databricks Model Serving
- Autonomous agent with function calling
- Integrates with Knowledge Base

### Health Check
```
api/health.ts
```
- Simple health check endpoint
- Useful for monitoring

---

## 🔐 Protected Frontend Utility Files

### Databricks Authentication
```
src/utils/databricksAuth.ts
```
- OAuth flow management
- Session storage and refresh
- Token expiration handling

### Databricks API Client
```
src/utils/databricksClient.ts
```
- Low-level API wrapper
- Handles auth headers and error handling

### Databricks API Functions
```
src/utils/databricksAPI.ts
```
- Knowledge Base API functions
- Upload, list, approve, update, delete
- **CRITICAL:** Uses `await getAuthData()` - don't remove await!

### Databricks AI Functions
```
src/utils/databricksAI.ts
```
- AI prompt execution
- Agent task running
- Conversation management
- Helper functions

### Safe Fetch Utility
```
src/utils/safeFetch.ts
```
- Error handling wrapper for fetch
- Retry logic

---

## 🔐 Protected React Components

### Databricks OAuth Components
```
src/components/DatabricksOAuthLogin.tsx
src/components/OAuthCallback.tsx
```
- OAuth login modal
- OAuth callback handler
- Session management

### Databricks File Browser
```
src/components/DatabricksFileBrowser.tsx
```
- Browse Databricks workspace files
- File selection and preview
- Integration with file upload

---

## 🔐 Protected Configuration Files

### Routing
```
src/App.tsx
```
- **PROTECTED SECTIONS:**
  - React Router setup (BrowserRouter)
  - OAuth callback route (`/oauth/callback`)
  - OAuthCallbackWrapper component
- **ALLOW CHANGES TO:**
  - Main app content (ProcessWireframe)
  - Login flow
  - Favicon setup

### Main Entry Point
```
src/main.tsx
```
- **PROTECTED:**
  - BrowserRouter wrapper (required for OAuth)
- **ALLOW CHANGES TO:**
  - Other imports
  - Additional providers

### Vercel Configuration
```
vercel.json
```
- Rewrites for React Router SPA support
- Required for OAuth callback routing

### Environment Variables
```
.env
.env.local
```
- OAuth credentials
- Databricks workspace config
- **NEVER commit to git**
- **NEVER overwrite without backup**

---

## ✅ Files That CAN Be Overwritten by Figma

These files are UI-only and safe to regenerate:

```
src/components/ProcessWireframe.tsx (EXCEPT Databricks integration parts)
src/components/Login.tsx
src/components/CentralHexView.tsx
src/components/ReviewView.tsx
src/components/ResearcherModes.tsx (EXCEPT Knowledge Base upload integration)
src/index.css
src/App.css
```

**Note:** Some UI files have Databricks integration mixed in. When updating:
1. Check for imports from `databricksAuth`, `databricksAPI`, `databricksAI`
2. Preserve those imports and their usage
3. Only update pure UI/styling code

---

## 🔄 How to Safely Update UI from Figma

### Step 1: Backup Protected Files
```bash
# Create backup directory
mkdir -p .backups/$(date +%Y%m%d)

# Backup all protected files
cp -r api/databricks .backups/$(date +%Y%m%d)/
cp -r src/utils/databricks* .backups/$(date +%Y%m%d)/
cp -r src/components/Databricks* .backups/$(date +%Y%m%d)/
cp -r src/components/OAuthCallback.tsx .backups/$(date +%Y%m%d)/
cp src/App.tsx .backups/$(date +%Y%m%d)/
cp src/main.tsx .backups/$(date +%Y%m%d)/
cp vercel.json .backups/$(date +%Y%m%d)/
```

### Step 2: Export from Figma
- Export new UI components
- **Skip** all files listed in "Protected Backend API Files" section
- **Skip** all files listed in "Protected Frontend Utility Files" section
- **Skip** all files listed in "Protected React Components" section

### Step 3: Merge Changes Carefully
For files like `ProcessWireframe.tsx` that have both UI and Databricks code:

1. Compare old and new versions
2. Keep Databricks imports:
   ```typescript
   import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
   import { uploadToKnowledgeBase } from '../utils/databricksAPI';
   import { isAuthenticated } from '../utils/databricksAuth';
   ```
3. Keep Databricks state management
4. Keep Databricks authentication checks
5. Only update pure UI elements

### Step 4: Test After Merge
```bash
# Test locally
npm run dev

# Test OAuth login
# Test Knowledge Base upload
# Test file browsing

# If all works, deploy
git push origin main
```

---

## 📝 Integration Points to Preserve

When updating UI components, preserve these integration points:

### In ResearcherModes.tsx
```typescript
// Databricks authentication check
useEffect(() => {
  checkAuth();
}, []);

// Upload to Knowledge Base function
const handleUploadToKnowledgeBase = async () => {
  const result = await uploadToKnowledgeBase({
    file: selectedFile,
    scope: 'brand',
    brand: selectedBrand,
    category: selectedProjectType,
    fileType: 'Synthesis',
    userEmail: 'user@company.com',
    userRole: 'research-analyst',
  });
};
```

### In ProcessWireframe.tsx
```typescript
// Databricks connection status display
{isCheckingAuth && (
  <div className="flex items-center gap-2 text-blue-600">
    <Database className="animate-pulse" />
    Checking Databricks authentication...
  </div>
)}

{!isAuthenticated && !isCheckingAuth && (
  <button onClick={() => setShowLoginModal(true)}>
    Sign In to Databricks
  </button>
)}
```

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T
- Remove `await` from `getAuthData()` calls
- Change OAuth redirect URI from `/oauth/callback`
- Remove `BrowserRouter` from main.tsx
- Change API endpoint paths
- Remove warehouse ID: `52742af9db71826d`
- Overwrite environment variables

### ✅ DO
- Back up before making changes
- Test OAuth flow after updates
- Test Knowledge Base upload after updates
- Check Vercel logs for errors
- Ask developer if unsure

---

## 🆘 If Something Breaks After Update

### Quick Restore
```bash
# Restore from backup
cp -r .backups/YYYYMMDD/databricks api/
cp -r .backups/YYYYMMDD/databricks* src/utils/
cp -r .backups/YYYYMMDD/Databricks* src/components/
cp .backups/YYYYMMDD/App.tsx src/
cp .backups/YYYYMMDD/main.tsx src/

# Commit and deploy
git add .
git commit -m "Restore Databricks integration files"
git push origin main
```

### Or Revert Git Commit
```bash
# Find the last working commit
git log --oneline -10

# Revert to that commit
git revert <commit-hash>
git push origin main
```

---

## 📞 Contact

If you need to modify Databricks integration:
- **Developer:** [Your contact]
- **Documentation:** See installation guides in project root
- **Troubleshooting Guide:** DATABRICKS-KB-TROUBLESHOOTING.md

---

## 📚 Related Documentation

- `DATABRICKS_SETUP.md` - Initial setup instructions
- `DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md` - Knowledge Base architecture
- `KB-API-DEPLOYMENT-GUIDE.md` - Knowledge Base API usage
- `AI-AGENT-DEPLOYMENT-GUIDE.md` - AI & Agent API usage
- `DATABRICKS-KB-TROUBLESHOOTING.md` - Common issues and fixes

---

## 🎯 Summary

**Protected files = 20+ files containing Databricks integration**

**Key message for Figma:** 
> "When exporting new UI, only update pure visual/styling components. Never overwrite anything in `api/databricks/`, `src/utils/databricks*`, or Databricks-related React components. When in doubt, ask first!"

---

**Last updated:** February 13, 2026
**Version:** 1.0
**Status:** ✅ All integrations working in production
