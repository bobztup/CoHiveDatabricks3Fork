# Databricks API Migration Instructions

## Summary

Updated the Databricks Knowledge Base integration to use the actual production API from `/utils/databricksAPI.ts` instead of the mock implementation.

---

## Key Changes

### 1. API Function Signature

**OLD (Mock):**
```typescript
uploadToKnowledgeBase({
  file: KnowledgeBaseFile,  // Custom object with base64 content
  scope: 'general' | 'category' | 'brand',
  fileType: 'Synthesis' | 'Wisdom',
  userEmail: string,
  userRole: string,
  categoryName?: string
})
```

**NEW (Production):**
```typescript
uploadToKnowledgeBase({
  file: File,  // Browser File object from input
  scope: 'general' | 'category' | 'brand',
  category?: string,  // The project type/category
  brand?: string,
  projectType?: string,
  fileType: 'Synthesis' | 'Wisdom',
  tags?: string[],
  contentSummary?: string,
  insightType?: 'Brand' | 'Category' | 'General',
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File',
  userEmail: string,
  userRole: string
})
```

---

## Updated Files

### 1. `/utils/databricksAPI.ts`

**Status:** ✅ Replaced with production version

The production API includes:
- `uploadToKnowledgeBase()` - Handles base64 conversion internally
- `listKnowledgeBaseFiles()` - Query files with filters
- `approveKnowledgeBaseFile()` - Approve files
- `updateKnowledgeBaseMetadata()` - Update file metadata
- `deleteKnowledgeBaseFile()` - Delete files
- `downloadFile()` - Download files to computer

All functions integrate with Databricks authentication via `databricksAuth.ts`.

---

### 2. `/components/ProcessWireframe.tsx`

**Status:** ✅ Updated `handleSaveWisdomToDatabricks` function

**Implementation:**

```typescript
const handleSaveWisdomToDatabricks = async (
  fileName: string,
  content: string,  // base64 content
  insightType: string,
  inputMethod: string,
  brand?: string,
  projectType?: string
) => {
  try {
    // Convert base64 content back to File/Blob
    const base64Data = content.includes(',') ? content.split(',')[1] : content;
    const mimeType = getMimeTypeFromFileName(fileName);
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Create File object from Blob
    const file = new File([blob], fileName, { type: mimeType });

    // Determine scope
    let scope: 'general' | 'category' | 'brand';
    if (insightType === 'General') scope = 'general';
    else if (insightType === 'Category') scope = 'category';
    else scope = 'brand';

    // Upload to Databricks
    const result = await uploadToKnowledgeBase({
      file,
      scope,
      category: projectType,
      brand: brand || undefined,
      projectType: projectType || undefined,
      fileType: 'Wisdom',
      tags: [insightType, inputMethod],
      insightType: insightType as 'Brand' | 'Category' | 'General',
      inputMethod: inputMethod as 'Text' | 'Voice' | 'Photo' | 'Video' | 'File',
      userEmail: 'user@company.com', // TODO: Get from auth
      userRole,
    });
    
    if (result.success) {
      console.log('✅ Wisdom successfully saved:', fileName);
      return true;
    } else {
      console.error('❌ Failed:', result.error);
      alert(`Failed to save: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert(`Failed to save wisdom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};
```

**Helper Function Added:**

```typescript
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'webm': 'audio/webm',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'csv': 'text/csv',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
```

---

### 3. `/components/ResearcherModes.tsx`

**Status:** ⚠️ NEEDS MANUAL FIX - Text encoding issue in file

**Required Changes:**

Replace the `handleUploadToDatabricks` function (lines 190-257) with:

```typescript
const handleUploadToDatabricks = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !selectedBrand || !selectedProjectType) {
    if (!selectedBrand || !selectedProjectType) {
      alert('Please select Brand and Project Type first');
    }
    return;
  }

  try {
    // Upload to Databricks Knowledge Base using the File object directly
    const result = await uploadToKnowledgeBase({
      file: file, // Pass the File object directly - API handles base64 conversion
      scope: 'brand', // Synthesis files are brand-specific
      category: selectedProjectType, // Map projectType to category
      brand: selectedBrand,
      projectType: selectedProjectType,
      fileType: 'Synthesis',
      tags: [],
      userEmail: 'user@company.com', // TODO: Get from authentication system
      userRole: canApproveResearch ? 'research-leader' : 'research-analyst',
    });
    
    if (result.success) {
      console.log('✅ File uploaded to Databricks Knowledge Base:', file.name);
      
      // Read file content for local reference only
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Create local research file reference
        const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
          brand: selectedBrand,
          projectType: selectedProjectType,
          fileName: file.name,
          isApproved: false,
          fileType: 'synthesis',
          content: content,
          source: result.filePath ? `Databricks: ${result.filePath}` : `Databricks KB: ${file.name}`
        };
        
        onCreateResearchFile(newFile);
      };
      reader.readAsDataURL(file);
      
      alert(`✅ "${file.name}" uploaded to Databricks Knowledge Base successfully!`);
    } else {
      alert(`❌ Failed to upload to Databricks: ${result.error || 'Unknown error'}`);
    }
    
    // Reset file input
    event.target.value = '';
    
  } catch (error) {
    console.error('Error uploading file to Databricks:', error);
    alert('Failed to upload file. Please try again.');
  }
};
```

**Also update the import at the top of the file:**

```typescript
// OLD
import { uploadToKnowledgeBase, UploadToKnowledgeBaseParams, KnowledgeBaseFile } from '../utils/databricksAPI';

// NEW
import { uploadToKnowledgeBase } from '../utils/databricksAPI';
```

---

## Migration Details

### Wisdom Hex (ProcessWireframe.tsx)

**Challenge:** Wisdom content comes as base64 strings (text, voice, photo, video)

**Solution:** Convert base64 back to File/Blob before uploading

**Flow:**
1. User enters wisdom content (text/voice/photo/video/file)
2. Content is converted to base64
3. Base64 is decoded back to binary
4. Binary is wrapped in Blob
5. Blob is converted to File object
6. File is uploaded via API (which re-converts to base64)

**Note:** This seems redundant, but is necessary because:
- Wisdom content is already being stored as base64 in responses
- The API requires a File object
- In future, could refactor to keep File objects longer

---

### Synthesis Upload (ResearcherModes.tsx)

**Challenge:** Simpler - user uploads file from computer

**Solution:** Pass File object directly to API

**Flow:**
1. User selects file from computer
2. File object passed directly to `uploadToKnowledgeBase()`
3. API handles base64 conversion
4. After upload, read file for local reference only

**Benefits:**
- Cleaner code
- API handles base64 conversion
- No intermediate objects needed

---

## Testing Checklist

### Wisdom Hex
- [ ] Text wisdom saves successfully
- [ ] Voice recording saves successfully  
- [ ] Photo upload saves successfully
- [ ] Photo capture saves successfully
- [ ] Video upload saves successfully
- [ ] Video recording saves successfully
- [ ] File upload saves successfully
- [ ] Scope is set correctly (general/category/brand)
- [ ] Tags include insightType and inputMethod
- [ ] Console logs show successful upload

### Synthesis Upload
- [ ] File upload works from computer
- [ ] Brand and projectType are required
- [ ] File is saved to Databricks
- [ ] Local reference is created
- [ ] `result.filePath` is used in source if available
- [ ] Success/error messages display correctly
- [ ] File input resets after upload
- [ ] Console logs show successful upload

### Authentication
- [ ] Update `userEmail` from actual auth system
- [ ] Verify Databricks session is valid
- [ ] Handle authentication errors gracefully

---

## TODO Items

### 1. Authentication Integration

**Current State:**
```typescript
userEmail: 'user@company.com' // Placeholder
```

**Required:**
```typescript
import { getValidSession } from '../utils/databricksAuth';

const session = getValidSession();
const userEmail = session?.userEmail || 'anonymous@company.com';
```

### 2. Error Handling

Add better error handling for:
- Network failures
- Authentication failures
- File size limits
- Invalid file types

### 3. Optimization

Consider refactoring Wisdom hex to:
- Keep File objects longer
- Avoid base64 → File → base64 conversion
- Store File references instead of base64 in state

---

## API Return Values

### Success Response
```typescript
{
  success: true,
  fileId: "abc123",
  filePath: "dbfs:/knowledge-base/brand/Nike/synthesis/file.pdf"
}
```

### Error Response
```typescript
{
  success: false,
  error: "Upload failed: Unauthorized"
}
```

---

## Production Endpoints

All API calls go through:
- `/api/databricks/knowledge-base/upload` (POST)
- `/api/databricks/knowledge-base/list` (GET)
- `/api/databricks/knowledge-base/approve` (POST)
- `/api/databricks/knowledge-base/update` (PATCH)
- `/api/databricks/knowledge-base/delete` (DELETE)

These endpoints must be implemented on the backend to handle:
- Databricks Unity Catalog integration
- File storage in DBFS
- Metadata tracking
- Access control

---

## Files Modified

1. ✅ `/utils/databricksAPI.ts` - Replaced with production version
2. ✅ `/components/ProcessWireframe.tsx` - Updated Wisdom upload function
3. ⚠️ `/components/ResearcherModes.tsx` - NEEDS MANUAL FIX (text encoding issue)

---

**Status:** Migration 95% complete  
**Remaining:** Fix ResearcherModes.tsx manually  
**Next:** Integrate actual authentication  
**Version:** Production API v1.0  
**Date:** February 11, 2026
