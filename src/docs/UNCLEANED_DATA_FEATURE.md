# Uncleaned Data Feature

## Overview

The Knowledge Base now supports saving "uncleaned" data that hasn't been categorized with brand or project type information. This data is stored separately and tagged for later AI processing and cleanup.

---

## What is Uncleaned Data?

**Uncleaned data** is knowledge that:
- May not have a specific brand assigned yet
- May not have a project type defined
- Contains raw insights, research, or wisdom that needs organization
- Will be processed and categorized by AI later

---

## Use Cases

### 1. **Quick Capture**
Users can save insights immediately without worrying about categorization:
```typescript
// Save wisdom without brand/project
await uploadUncleanedToKnowledgeBase({
  file: insightFile,
  fileType: 'Wisdom',
  insightType: 'General',
  inputMethod: 'Text',
  userEmail: 'user@company.com',
  userRole: 'Researcher',
});
```

### 2. **Interview Transcripts**
AI interview transcripts can be saved without immediate categorization:
```typescript
await uploadUncleanedToKnowledgeBase({
  file: transcriptFile,
  fileType: 'Wisdom',
  inputMethod: 'Interview',
  tags: ['Interview', 'Uncategorized'],
  userEmail: 'user@company.com',
  userRole: 'Researcher',
});
```

### 3. **Bulk Imports**
Import large amounts of data that needs AI cleaning:
```typescript
for (const file of bulkFiles) {
  await uploadUncleanedToKnowledgeBase({
    file,
    fileType: 'Research',
    tags: ['Bulk-Import', 'Q1-2025'],
    userEmail: 'user@company.com',
    userRole: 'Admin',
  });
}
```

---

## How It Works

### 1. **Storage Location**
Uncleaned files are stored in a special folder:
```
/Volumes/knowledge_base/cohive/files/uncleaned/
```

### 2. **Automatic Tagging**
All uncleaned data automatically receives these tags:
- `Uncleaned`
- `Needs-AI-Processing`
- Plus any custom tags you provide

### 3. **Metadata Tracking**
The system tracks:
- Upload date and user
- File type and content
- Insight type (if provided)
- Input method (Text, Voice, Interview, etc.)

---

## API Reference

### `uploadUncleanedToKnowledgeBase()`

Upload data without brand/project type requirements.

**Parameters:**
```typescript
{
  file: File;                    // The file to upload
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  tags?: string[];               // Optional custom tags
  contentSummary?: string;       // Optional summary
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  userEmail: string;             // User's email
  userRole: string;              // User's role
  scope?: 'general' | 'category' | 'brand'; // Defaults to 'general'
}
```

**Returns:**
```typescript
Promise<{
  success: boolean;
  fileId?: string;      // Unique file identifier
  filePath?: string;    // Path in Unity Catalog
  error?: string;       // Error message if failed
}>
```

**Example:**
```typescript
import { uploadUncleanedToKnowledgeBase } from '../utils/databricksAPI';

const result = await uploadUncleanedToKnowledgeBase({
  file: myFile,
  fileType: 'Wisdom',
  insightType: 'General',
  inputMethod: 'Interview',
  tags: ['User-Generated', 'Q1'],
  contentSummary: 'Consumer insights about beverage preferences',
  userEmail: 'researcher@company.com',
  userRole: 'Researcher',
});

if (result.success) {
  console.log('Uploaded with ID:', result.fileId);
} else {
  console.error('Upload failed:', result.error);
}
```

---

## Standard Upload API Changes

The existing `uploadToKnowledgeBase()` function now supports two new optional parameters:

```typescript
{
  // ... existing parameters ...
  cleaningStatus?: 'uncleaned' | 'cleaned';  // Default: 'cleaned'
  allowUncleaned?: boolean;                   // Default: false
}
```

**Example:**
```typescript
await uploadToKnowledgeBase({
  file: myFile,
  scope: 'general',
  fileType: 'Wisdom',
  userEmail: 'user@company.com',
  userRole: 'Researcher',
  cleaningStatus: 'uncleaned',    // Mark as uncleaned
  allowUncleaned: true,            // Skip brand/project validation
});
```

---

## AI Processing Workflow

### Phase 1: Data Collection (Current)
1. User uploads uncleaned data
2. Data stored in `/uncleaned/` folder
3. Tagged with `Uncleaned` and `Needs-AI-Processing`
4. Metadata recorded in database

### Phase 2: AI Cleaning (Future)
1. AI agent reads uncleaned files
2. Analyzes content and context
3. Extracts brand, category, project type
4. Suggests tags and summary
5. Moves to appropriate folder
6. Updates metadata with cleaning info

### Phase 3: Human Review (Future)
1. Admin reviews AI suggestions
2. Approves or modifies categorization
3. File marked as "cleaned"
4. Available for normal use

---

## Database Schema

### New Fields in `file_metadata` Table

```sql
-- Future schema additions (not yet implemented):
cleaning_status STRING,      -- 'uncleaned' | 'cleaned' | 'in_progress'
cleaned_at TIMESTAMP,        -- When AI cleaned the data
cleaned_by STRING            -- Who/what cleaned it
```

Currently, cleaning status is tracked via tags:
- `Uncleaned` tag = uncleaned status
- No `Uncleaned` tag = cleaned status

---

## Querying Uncleaned Data

### Find All Uncleaned Files
```typescript
const uncleanedFiles = await listKnowledgeBaseFiles({
  searchTerm: 'Uncleaned',  // Search in tags
  sortBy: 'upload_date',
  sortOrder: 'DESC',
});
```

### Find by File Type
```typescript
const uncleanedWisdom = await listKnowledgeBaseFiles({
  fileType: 'Wisdom',
  searchTerm: 'Uncleaned',
});
```

### Find Recent Uploads
```typescript
const recentUncleaned = await listKnowledgeBaseFiles({
  searchTerm: 'Needs-AI-Processing',
  startDate: '2025-01-01',
  limit: 50,
});
```

---

## Best Practices

### 1. **When to Use Uncleaned Upload**
✅ **Use when:**
- Capturing insights in real-time
- User doesn't know brand/project yet
- Bulk importing historical data
- Interview transcripts or voice notes
- Quick wisdom sharing

❌ **Don't use when:**
- Brand and project are known
- Creating official deliverables
- Data is already organized
- Need immediate categorization

### 2. **Tagging Strategy**
Add descriptive tags to help AI processing:
```typescript
tags: [
  'Consumer-Insights',     // What it's about
  'Interview',             // How it was captured
  'Q1-2025',              // When it was created
  'West-Coast',           // Geographic context
  'Preliminary',          // Status
]
```

### 3. **Content Summary**
Provide a brief summary to help AI understand context:
```typescript
contentSummary: "User discussed beer preferences during casual interview. Mentioned craft beer brands and packaging preferences. May relate to RTD category expansion."
```

---

## Migration Path

### Existing Data
No migration needed. Existing files without the "Uncleaned" tag are considered cleaned.

### Future Enhancements
1. **Automatic AI Cleaning Pipeline**
   - Scheduled job to process uncleaned files
   - AI suggests categorization
   - Updates metadata automatically

2. **Cleaning Dashboard**
   - View all uncleaned files
   - Review AI suggestions
   - Bulk approve/edit categorization

3. **Smart Routing**
   - AI predicts brand/project from content
   - Suggests related existing knowledge
   - Links to similar cleaned files

---

## Error Handling

### Common Errors

**1. Authentication Required**
```typescript
Error: 'Not authenticated. Please sign in to Databricks.'
```
**Solution:** Ensure user is authenticated before upload.

**2. File Too Large**
```typescript
Error: 'File size exceeds maximum allowed (50MB)'
```
**Solution:** Split large files or compress before upload.

**3. Invalid File Type**
```typescript
Error: 'Invalid fileType. Must be: Synthesis, Wisdom, Findings, Research, or Persona'
```
**Solution:** Use a valid fileType value.

---

## Example Integration

### In Wisdom Hex (ProcessWireframe.tsx)

```typescript
// Option 1: Save without categorization
const handleQuickSave = async (content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], `wisdom-${Date.now()}.txt`);
  
  const result = await uploadUncleanedToKnowledgeBase({
    file,
    fileType: 'Wisdom',
    insightType: 'General',
    inputMethod: 'Text',
    contentSummary: content.substring(0, 200),
    userEmail: 'user@company.com',
    userRole: userRole,
  });
  
  if (result.success) {
    alert('Wisdom saved! Will be categorized by AI.');
  }
};

// Option 2: Save with categorization if known
const handleCategorizedSave = async (content: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], `wisdom-${Date.now()}.txt`);
  
  await uploadToKnowledgeBase({
    file,
    scope: 'brand',
    brand: brand || undefined,
    projectType: projectType || undefined,
    fileType: 'Wisdom',
    insightType: insightType as 'Brand' | 'Category' | 'General',
    inputMethod: 'Text',
    userEmail: 'user@company.com',
    userRole: userRole,
  });
};
```

---

## Testing

### Manual Test
1. Navigate to Wisdom hex
2. Enter insight without brand/project
3. Click "Quick Save" (uses uncleaned upload)
4. Verify file appears in `/uncleaned/` folder
5. Check tags include "Uncleaned"

### Automated Test
```typescript
describe('Uncleaned Data Upload', () => {
  it('should upload without brand/project', async () => {
    const file = new File(['test'], 'test.txt');
    const result = await uploadUncleanedToKnowledgeBase({
      file,
      fileType: 'Wisdom',
      userEmail: 'test@test.com',
      userRole: 'Tester',
    });
    
    expect(result.success).toBe(true);
    expect(result.fileId).toBeDefined();
  });
});
```

---

## Support

For questions or issues with uncleaned data:
1. Check error logs in browser console
2. Verify Databricks authentication
3. Review file size and type requirements
4. Contact system administrator

---

**Last Updated:** February 2025
