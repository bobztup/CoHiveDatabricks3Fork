# Shared Knowledge Base - Organization-Wide Data Access

## Overview

CoHive's Knowledge Base is a **shared organizational resource** stored in Databricks Unity Catalog. All files in the Knowledge Base are accessible to **all users** in the Databricks workspace, not just the user who uploaded them.

---

## Key Concepts

### 🏢 Organization-Wide, Not User-Specific

**Traditional Approach (User-Specific):**
```
User A uploads file → Only User A can access
User B uploads file → Only User B can access
❌ No knowledge sharing
❌ Duplicated efforts
❌ Fragmented insights
```

**CoHive Approach (Shared Knowledge Base):**
```
User A uploads file → Available to ALL users
User B uploads file → Available to ALL users
User C contributes wisdom → Available to ALL users
✅ Collective organizational knowledge
✅ Leverages everyone's contributions
✅ Single source of truth
```

---

## How It Works

### For First-Time Users

**On First Launch:**
1. User opens CoHive for the first time
2. App checks: "Any files cached locally?" → No
3. App checks: "Is user authenticated?" → Yes (Databricks OAuth)
4. App queries: "What's in the shared Knowledge Base?"
5. Databricks returns: All approved files from the workspace
6. App downloads & caches files locally
7. User sees: **All organizational research files immediately**

**Result:**
- New users don't start from scratch
- Immediate access to organizational knowledge
- No need to re-upload files that already exist

### For Returning Users

**On Subsequent Launches:**
1. User opens CoHive
2. App checks: "Any files cached locally?" → Yes
3. App loads: Files from localStorage (instant)
4. User sees: Previously cached files (offline-capable)

**Manual Refresh:**
- User can click "Import from Databricks" to sync latest files
- Gets any new files added by other users since last sync

---

## What's in the Knowledge Base?

### File Types

**Research Files:**
- Market research reports
- Consumer studies
- Competitive analysis
- Category insights

**Findings Files:**
- Research findings summaries
- Key insights extracted
- Data analysis results

**Synthesis Files:**
- Synthesized insights from multiple sources
- Cross-research patterns
- Meta-analyses

**Wisdom Files:**
- Crowdsourced insights (from Wisdom hex)
- Expert opinions
- Organizational learnings
- Field observations

**Persona Files:**
- Persona definitions
- Target audience profiles
- Consumer segments

### File Scopes

**General Scope:**
- Available to all users
- Not brand or category specific
- Organizational best practices
- Universal insights

**Category Scope:**
- Specific to product categories
- Beer, Cider, RTD, Footwear, etc.
- Available to users working in that category

**Brand Scope:**
- Specific to brands within categories
- Nike, Adidas, Heineken, etc.
- Available to users working on that brand

### Approval Status

**Approved Files:**
- ✅ Quality-checked
- ✅ Ready for general use
- ✅ Auto-loaded for all users
- ✅ Appears in Knowledge Base by default

**Pending Files:**
- ⏳ Awaiting approval
- ⏳ Visible to researchers/approvers
- ⏳ Not auto-loaded for general users
- ⏳ Available in ReviewView for approval

---

## Benefits of Shared Knowledge Base

### 🚀 Faster Onboarding
- New team members have immediate access to organizational knowledge
- No need to request files from colleagues
- Self-service access to all research

### 🤝 Collaboration
- Everyone benefits from everyone's contributions
- Reduces duplicated research efforts
- Encourages knowledge sharing culture

### 📊 Single Source of Truth
- One centralized location for all research
- No version control issues
- Always up-to-date insights

### 🔍 Discoverability
- All research is searchable
- Filter by brand, project, category
- Find relevant insights across projects

### 💾 Offline Access
- Files cached locally after first sync
- Work offline after initial load
- Manual refresh when needed

---

## Contributing to Knowledge Base

### Method 1: Wisdom Hex (All Users)
1. Navigate to Wisdom hex in workflow
2. Select insight type (Brand/Category/General)
3. Choose input method (Text/Voice/Photo/Video/File)
4. Submit content
5. File saved to Knowledge Base (pending approval)
6. After approval → Available to all users

### Method 2: Upload Research Files (All Users)
1. Navigate to any research hex
2. Click "Upload New Research File"
3. Select file from computer
4. File uploaded to Knowledge Base (pending approval)
5. After approval → Available to all users

### Method 3: Researcher Modes (Researchers Only)
1. Navigate to Researcher Modes
2. Bulk upload capabilities
3. Direct approval options
4. Advanced metadata management
5. Files immediately available (if auto-approved)

---

## Accessing Knowledge Base Files

### Automatic Access

**First-time users:**
```typescript
// Happens automatically in ProcessWireframe.tsx
const loadKnowledgeBaseFiles = async () => {
  const kbFiles = await listKnowledgeBaseFiles({
    isApproved: true,  // Only approved files
    sortBy: 'upload_date',
    sortOrder: 'DESC',
    limit: 500,
  });
  
  // Cache locally
  setResearchFiles(kbFiles);
  localStorage.setItem('cohive_research_files', JSON.stringify(kbFiles));
};
```

### Manual Access

**Import from Databricks:**
1. Click "Import from Databricks" button (in ResearchView)
2. Browse Knowledge Base files
3. Filter by brand, project, category, file type
4. Select specific files or import all
5. Files downloaded and cached locally

**Browse via ReviewView:**
1. Navigate to ReviewView component
2. See all Knowledge Base files with metadata
3. Filter, search, sort files
4. Download specific files
5. View approval status and details

---

## File Metadata

Each Knowledge Base file includes:

```typescript
{
  fileId: string;              // Unique identifier
  fileName: string;            // Original file name
  filePath: string;            // Path in Databricks
  
  // Scope and categorization
  scope: 'general' | 'category' | 'brand';
  category?: string;           // e.g., "Beer", "Footwear"
  brand?: string;              // e.g., "Nike", "Heineken"
  projectType?: string;        // e.g., "Product Launch"
  
  // File classification
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File';
  
  // Approval workflow
  isApproved: boolean;         // Approval status
  approverEmail?: string;      // Who approved
  approvalDate?: string;       // When approved
  approvalNotes?: string;      // Approval comments
  
  // Upload info
  uploadDate: string;          // When uploaded
  uploadedBy: string;          // Who uploaded
  fileSizeBytes: number;       // File size
  
  // Metadata
  tags: string[];              // Searchable tags
  contentSummary?: string;     // Brief description
  
  // Usage tracking
  citationCount: number;       // How many times referenced
  gemInclusionCount: number;   // Used in how many gems
}
```

---

## Filtering Knowledge Base

### By Brand and Project
```typescript
const files = await listKnowledgeBaseFiles({
  brand: 'Nike',
  projectType: 'Product Launch',
  isApproved: true,
});
```

### By File Type
```typescript
const wisdomFiles = await listKnowledgeBaseFiles({
  fileType: 'Wisdom',
  isApproved: true,
});
```

### By Scope
```typescript
const generalFiles = await listKnowledgeBaseFiles({
  scope: 'general',
  includeGeneral: true,
});

const categoryFiles = await listKnowledgeBaseFiles({
  scope: 'category',
  category: 'Beer',
});
```

### Search by Term
```typescript
const searchResults = await listKnowledgeBaseFiles({
  searchTerm: 'consumer insights',
  isApproved: true,
});
```

---

## Data Storage

### Databricks Unity Catalog
**Primary Storage:**
- All Knowledge Base files stored in Unity Catalog
- Centralized, secure, backed up
- Shared across workspace
- Accessible via API

### localStorage (CoHive App)
**Local Cache:**
- Files cached after first sync
- Enables offline access
- Faster subsequent loads
- User-specific cache (not shared between browser profiles)

**Cache Key:**
```typescript
localStorage.setItem('cohive_research_files', JSON.stringify(files));
```

---

## Security and Permissions

### Who Can View?
**All authenticated users** in the Databricks workspace can view:
- All approved Knowledge Base files
- Files scoped as "general"
- Files in categories/brands they have access to

### Who Can Upload?
**All authenticated users** can:
- Upload files to Knowledge Base (pending approval)
- Contribute via Wisdom hex
- Submit research files

### Who Can Approve?
**Researchers and Admins** can:
- Approve/reject pending files
- Manage file metadata
- Delete inappropriate files
- Bulk approve files

### Who Can Delete?
**Researchers and Admins** can:
- Delete files from Knowledge Base
- Archive outdated files
- Manage file lifecycle

---

## Refresh Strategy

### When to Refresh

**Automatic Refresh:**
- On first app launch (no cached files)
- After localStorage cleared
- After explicit user refresh action

**Manual Refresh Recommended:**
- Weekly: To get latest organizational insights
- Before major project kickoff: Get most recent research
- After team uploads: Sync new team contributions
- When searching for specific files: Ensure latest data

### How to Refresh

**Option 1: Clear Cache + Reload**
```javascript
localStorage.removeItem('cohive_research_files');
window.location.reload();
```

**Option 2: Import from Databricks**
1. Click "Import from Databricks"
2. Select "All Files"
3. Import (overwrites cache)

**Option 3: Dedicated Refresh Button** (Future)
Add a "Sync Knowledge Base" button that calls `loadKnowledgeBaseFiles()`.

---

## Best Practices

### For Users

**✅ DO:**
- Refresh weekly to get latest files
- Use descriptive file names when uploading
- Add relevant tags for discoverability
- Contribute insights via Wisdom hex
- Approve quality files promptly (if researcher)

**❌ DON'T:**
- Upload duplicate files already in KB
- Upload personal/non-work files
- Delete files without checking usage
- Ignore pending approval queue

### For Researchers

**✅ DO:**
- Review pending files regularly
- Add meaningful approval notes
- Tag files appropriately
- Keep metadata up-to-date
- Archive outdated files

**❌ DON'T:**
- Auto-approve without review
- Delete files that are still relevant
- Let approval queue build up
- Ignore file quality issues

---

## Troubleshooting

### "No files loading"
**Cause:** Not authenticated or API error  
**Fix:**
1. Check Databricks authentication
2. Sign in via OAuth
3. Refresh app

### "Old files showing"
**Cause:** Stale localStorage cache  
**Fix:**
1. Click "Import from Databricks"
2. Reimport all files
3. Cache will update

### "Specific file missing"
**Cause:** File may not be approved  
**Fix:**
1. Check ReviewView for pending files
2. Ask researcher to approve
3. Verify file was uploaded successfully

### "Files not syncing"
**Cause:** Network or API issue  
**Fix:**
1. Check internet connection
2. Verify Databricks workspace access
3. Check browser console for errors

---

## Summary

**CoHive's Knowledge Base is a shared organizational asset:**

✅ All files accessible to all users in workspace  
✅ Automatic sync on first launch  
✅ Offline-capable with local caching  
✅ Contribution from any user benefits everyone  
✅ Single source of truth for organizational knowledge  
✅ Searchable, filterable, discoverable  
✅ Approval workflow ensures quality  

**Think of it like a company wiki for research files** - everyone contributes, everyone benefits!

---

**See Also:**
- `/docs/MOCK_DATA_REMOVED.md` - Technical implementation details
- `/docs/DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md` - API documentation
- `/docs/Guidelines.md` - Development guidelines
