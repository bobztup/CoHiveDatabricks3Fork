# Uncleaned Data Implementation Summary

## Overview
Added support for saving "uncleaned" knowledge to the Knowledge Base - data that doesn't have brand or project type information yet, which can be processed and categorized by AI later.

---

## Changes Made

### 1. **Updated Type Definitions** (`/utils/databricksAPI.ts`)

#### KnowledgeBaseFile Interface
Added cleaning status tracking:
```typescript
cleaningStatus?: 'uncleaned' | 'cleaned' | 'in_progress';
cleanedAt?: string;       // When AI cleaned the data
cleanedBy?: string;       // Who/what cleaned it
```

#### UploadFileParams Interface
Added uncleaned support:
```typescript
cleaningStatus?: 'uncleaned' | 'cleaned';  // Mark as uncleaned
allowUncleaned?: boolean;                   // Skip validation
```

#### Updated inputMethod
```typescript
inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
```

---

### 2. **New API Function** (`/utils/databricksAPI.ts`)

Created `uploadUncleanedToKnowledgeBase()` helper:

```typescript
export async function uploadUncleanedToKnowledgeBase(params: {
  file: File;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  tags?: string[];
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  userEmail: string;
  userRole: string;
  scope?: 'general' | 'category' | 'brand';
}): Promise<{ 
  success: boolean; 
  fileId?: string;
  filePath?: string;
  error?: string;
}>
```

**Features:**
- No brand/project required
- Automatically adds 'Uncleaned' and 'Needs-AI-Processing' tags
- Defaults to 'general' scope
- Stores in `/uncleaned/` folder

---

### 3. **Backend API Updates** (`/api/databricks/knowledge-base/upload.js`)

#### New Parameters
```javascript
cleaningStatus = 'cleaned',    // Default to 'cleaned'
allowUncleaned = false,        // Allow upload without brand/project
```

#### Skip Validation for Uncleaned
```javascript
if (!allowUncleaned) {
  // Validate scope-specific requirements
  if (scope === 'category' && !category) {
    return res.status(400).json({ error: 'Category required' });
  }
  if (scope === 'brand' && (!brand || !category)) {
    return res.status(400).json({ error: 'Brand and category required' });
  }
}
```

#### Uncleaned Folder Path
```javascript
if (cleaningStatus === 'uncleaned') {
  filePath = `${baseVolumePath}/uncleaned/${sanitizedFileName}`;
} else {
  // Normal scope-based paths
  switch (scope) {
    case 'general': ...
    case 'category': ...
    case 'brand': ...
  }
}
```

#### Auto-Tagging
```javascript
const finalTags = cleaningStatus === 'uncleaned' 
  ? [...tags, 'Uncleaned', 'Needs-AI-Processing']
  : tags;
```

#### Enhanced Logging
```javascript
console.log(`[KB Upload] Cleaning Status: ${cleaningStatus}`);
```

---

## File Storage Structure

```
/Volumes/knowledge_base/cohive/files/
├── general/               # Cleaned general knowledge
├── category/             # Cleaned category-specific
│   ├── beer/
│   ├── cider/
│   └── rtd/
├── brand/                # Cleaned brand-specific
│   ├── brand-a/
│   └── brand-b/
└── uncleaned/           # ⭐ NEW: Uncleaned data for AI processing
    ├── insight-123.txt
    ├── interview-456.txt
    └── wisdom-789.txt
```

---

## Usage Examples

### Quick Save (No Categorization)
```typescript
import { uploadUncleanedToKnowledgeBase } from '../utils/databricksAPI';

const result = await uploadUncleanedToKnowledgeBase({
  file: insightFile,
  fileType: 'Wisdom',
  insightType: 'General',
  inputMethod: 'Text',
  tags: ['User-Input'],
  userEmail: 'user@company.com',
  userRole: 'Researcher',
});
```

### Interview Transcript
```typescript
await uploadUncleanedToKnowledgeBase({
  file: transcriptFile,
  fileType: 'Wisdom',
  inputMethod: 'Interview',
  contentSummary: 'AI interview about consumer preferences',
  userEmail: 'user@company.com',
  userRole: 'Researcher',
});
```

### Using Standard API with Uncleaned Flag
```typescript
await uploadToKnowledgeBase({
  file: myFile,
  scope: 'general',
  fileType: 'Wisdom',
  userEmail: 'user@company.com',
  userRole: 'Researcher',
  cleaningStatus: 'uncleaned',
  allowUncleaned: true,
});
```

---

## Benefits

### 1. **Faster Data Capture**
Users can save insights immediately without categorization delay.

### 2. **Reduced Friction**
No need to assign brand/project when information isn't available.

### 3. **AI-Ready**
Data is organized and tagged for future AI processing and cleanup.

### 4. **Backward Compatible**
Existing code continues to work. Default behavior unchanged.

### 5. **Flexible Workflow**
- Quick save → AI cleans → Human approves
- User can also provide partial information

---

## Future Enhancements

### Phase 2: AI Cleaning Pipeline
```typescript
// Automated AI agent to process uncleaned files
async function cleanUncleanedData() {
  const uncleanedFiles = await listKnowledgeBaseFiles({
    searchTerm: 'Uncleaned',
  });
  
  for (const file of uncleanedFiles) {
    // AI analyzes content
    const analysis = await analyzeFileContent(file);
    
    // Extract metadata
    const { brand, category, projectType, tags } = analysis;
    
    // Update file metadata
    await updateKnowledgeBaseMetadata(
      file.fileId,
      { 
        brand, 
        category, 
        projectType, 
        tags: [...file.tags.filter(t => t !== 'Uncleaned'), ...tags] 
      },
      'ai-agent@system',
      'AI'
    );
    
    // Move file to proper location
    await moveFile(file.filePath, newCleanedPath);
  }
}
```

### Phase 3: Admin Dashboard
- View all uncleaned files
- Review AI suggestions
- Bulk approve/edit
- Track cleaning progress

---

## Testing Checklist

- [x] Upload without brand/project succeeds
- [x] File saved in `/uncleaned/` folder
- [x] Tags include 'Uncleaned' and 'Needs-AI-Processing'
- [x] Metadata stored correctly
- [x] Backward compatibility maintained
- [x] Error handling works properly
- [ ] Query uncleaned files (need to test)
- [ ] AI cleaning pipeline (future)
- [ ] Admin dashboard (future)

---

## Documentation

- ✅ `/docs/UNCLEANED_DATA_FEATURE.md` - Complete feature documentation
- ✅ `/utils/databricksAPI.ts` - TypeScript types and helper function
- ✅ `/api/databricks/knowledge-base/upload.js` - Backend implementation
- ✅ This summary document

---

## Breaking Changes

**None.** All changes are backward compatible:
- Default `cleaningStatus` is 'cleaned'
- Default `allowUncleaned` is false
- Existing uploads work exactly as before

---

## Migration Guide

### No Migration Needed

Existing files are considered "cleaned" by default (no 'Uncleaned' tag).

### To Start Using Uncleaned Uploads

**Option 1: Use Helper Function**
```typescript
import { uploadUncleanedToKnowledgeBase } from '../utils/databricksAPI';
// Use directly
```

**Option 2: Add Flags to Existing Code**
```typescript
await uploadToKnowledgeBase({
  // ... existing parameters ...
  cleaningStatus: 'uncleaned',
  allowUncleaned: true,
});
```

---

## API Summary

### New Function
- `uploadUncleanedToKnowledgeBase()` - Simplified uncleaned upload

### Modified Function
- `uploadToKnowledgeBase()` - Added optional `cleaningStatus` and `allowUncleaned` params

### Modified Interface
- `KnowledgeBaseFile` - Added `cleaningStatus`, `cleanedAt`, `cleanedBy`
- `UploadFileParams` - Added `cleaningStatus`, `allowUncleaned`

---

## Database Schema Notes

### Current Implementation
Cleaning status tracked via tags:
- Has 'Uncleaned' tag = uncleaned
- No 'Uncleaned' tag = cleaned

### Future Schema Addition
```sql
ALTER TABLE knowledge_base.cohive.file_metadata
ADD COLUMN cleaning_status STRING,
ADD COLUMN cleaned_at TIMESTAMP,
ADD COLUMN cleaned_by STRING;
```

This can be added later without breaking existing functionality.

---

## Performance Considerations

### Storage
- Uncleaned files in separate folder
- Easier to query and process
- No impact on cleaned file queries

### Indexing
Consider adding index on tags for faster uncleaned file queries:
```sql
CREATE INDEX idx_tags ON knowledge_base.cohive.file_metadata(tags);
```

### Batch Processing
For AI cleaning pipeline, process in batches:
```typescript
const BATCH_SIZE = 50;
const uncleaned = await listKnowledgeBaseFiles({
  searchTerm: 'Uncleaned',
  limit: BATCH_SIZE,
});
```

---

## Support & Troubleshooting

### Common Issues

**1. Upload Fails with "Brand required"**
- Ensure `allowUncleaned: true` is set
- Or use `uploadUncleanedToKnowledgeBase()` helper

**2. File Not in Uncleaned Folder**
- Check `cleaningStatus` parameter
- Verify it's set to 'uncleaned'

**3. Tags Not Applied**
- Backend automatically adds tags
- Check server logs for errors

---

## Contact

For questions or issues:
- Review `/docs/UNCLEANED_DATA_FEATURE.md`
- Check browser console for errors
- Verify Databricks authentication
- Contact system administrator

---

**Implementation Date:** February 2025  
**Status:** ✅ Complete and Ready for Use
