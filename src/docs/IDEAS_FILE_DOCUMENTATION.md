# Ideas File Feature Documentation

## Overview

The "Load Current Ideas" feature in the Enter hex allows users to upload existing ideas documents that will be included in all subsequent workflow executions and sent to Databricks for AI processing.

---

## How It Works

### 1. Upload Process

When a user selects "Load Current Ideas" in the Enter hex:

1. **File Selection**: User uploads a document (.pdf, .doc, .docx, .txt, .csv, .xlsx, .xls)
2. **Content Reading**: File content is read and encoded as base64
3. **Storage**: File is stored with:
   - Brand name
   - Project type
   - Original filename
   - Base64 content
   - MIME type
   - Upload timestamp

### 2. Storage Location

Ideas files are stored in multiple places:

- **State**: `ideasFiles` array in ProcessWireframe component
- **localStorage**: `cohive_ideas_files` key
- **Export/Import**: Included in project JSON exports

### 3. Data Structure

```typescript
interface IdeasFile {
  brand: string;           // Brand name from Enter step
  projectType: string;     // Project type from Enter step
  fileName: string;        // Original filename
  content: string;         // Base64 encoded file content
  fileType: string;        // MIME type (e.g., 'application/pdf')
  uploadDate: number;      // Timestamp of upload
}
```

---

## Integration with Databricks

### When Executing Workflow Hexes

When any workflow hex is executed (Research, Luminaries, Panelist, etc.), the ideas file is automatically included:

```typescript
const databricksPayload = {
  hexId: 'research',
  brand: 'Nike',
  projectType: 'Creative Messaging',
  selectedFiles: ['file1.pdf', 'file2.xlsx'],
  assessmentType: ['assess', 'recommend'],
  assessment: 'User assessment text',
  timestamp: 1234567890,
  ideasFile: {
    fileName: 'Nike_Ideas_2024.pdf',
    content: 'base64EncodedContent...',
    fileType: 'application/pdf'
  }
};
```

### On Databricks Side

The Databricks backend should:

1. Decode the base64 content
2. Parse the file based on fileType
3. Include ideas content in AI prompts
4. Use ideas as context for assessments and recommendations

---

## One File Per Project

**Important**: Only one ideas file is stored per brand/project combination.

- If a user uploads a new ideas file for the same brand/project, the old one is replaced
- This ensures consistency across the workflow
- Users can update the ideas file by uploading a new one

---

## Export/Import

### Export

When exporting a project, ideas files are included:

```json
{
  "version": "1.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "projectName": "Nike",
  "responses": {...},
  "ideasFiles": [
    {
      "brand": "Nike",
      "projectType": "Creative Messaging",
      "fileName": "Nike_Ideas_2024.pdf",
      "content": "base64Content...",
      "fileType": "application/pdf",
      "uploadDate": 1234567890
    }
  ],
  ...
}
```

### Import

When importing a project:

1. Ideas files are restored to state
2. Saved to localStorage
3. Available for use immediately

---

## Restart Behavior

When restarting a project:

- ✅ Ideas files are **cleared**
- ✅ User must re-upload if needed
- ✅ Prevents confusion from old ideas persisting

---

## File Size Considerations

### Base64 Encoding

Base64 encoding increases file size by approximately 33%.

**Example:**
- Original file: 1 MB
- Base64 encoded: ~1.33 MB

### localStorage Limits

Most browsers limit localStorage to 5-10 MB per domain.

**Recommendations:**
- Keep ideas files under 3 MB for safety
- Larger files should be stored in Databricks
- Consider implementing file size validation

---

## Future Enhancements

### Potential Improvements

1. **File Size Validation**
   ```typescript
   if (file.size > 3 * 1024 * 1024) {
     alert('File too large. Maximum size: 3 MB');
     return;
   }
   ```

2. **File Preview**
   - Show preview of uploaded file content
   - Display file metadata (size, type, upload date)

3. **Multiple Ideas Files**
   - Allow multiple ideas files per project
   - User can select which to include in execution

4. **Direct Databricks Upload**
   - Upload directly to Databricks instead of localStorage
   - Store only the path reference locally
   - Better for large files

5. **Version History**
   - Track multiple versions of ideas files
   - Allow reverting to previous versions

---

## API Integration Example

### Sending to Databricks via Vercel Function

```typescript
// In ProcessWireframe.tsx
const response = await fetch('/api/databricks-execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(databricksPayload)
});

// In /api/databricks-execute.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { ideasFile, ...otherData } = req.body;
  
  // Decode base64 if ideas file exists
  if (ideasFile) {
    const fileBuffer = Buffer.from(
      ideasFile.content.split(',')[1], // Remove data:mime;base64, prefix
      'base64'
    );
    
    // Process file or send to Databricks
    // ...
  }
  
  // Continue with Databricks execution
  // ...
}
```

---

## Troubleshooting

### File Not Appearing

**Check:**
1. File was successfully uploaded (check console logs)
2. Brand and project type match between upload and execution
3. localStorage has `cohive_ideas_files` key

### File Content Not Sent to Databricks

**Check:**
1. `getIdeasFile()` returns the correct file
2. Console log shows `ideasFile` in databricksPayload
3. API endpoint properly handles ideasFile data

### localStorage Full Error

**Solution:**
1. Clear old project data
2. Reduce file size
3. Implement Databricks direct upload

---

## Related Files

- `/components/ProcessWireframe.tsx` - Main implementation
- `/guidelines/Guidelines.md` - Development guidelines
- `/api/databricks-execute.ts` - API endpoint (future)

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Feature Status**: ✅ Fully Implemented
