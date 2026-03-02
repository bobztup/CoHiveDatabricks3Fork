# Upload to Databricks Feature

## Overview

Added the ability to upload files directly from your computer to the Databricks Knowledge Base in the synthesis mode of the Knowledge Base hex.

---

## Location

**Component:** `/components/ResearcherModes.tsx`  
**Mode:** Synthesis → New Synthesis  
**Step:** After selecting Brand and Project Type

---

## Feature Details

### UI Component

- **Button Color:** Green (to distinguish from blue "Import from Databricks")
- **Icon:** Upload icon from lucide-react
- **Label:** "Upload File to Databricks"
- **Position:** Above the "Import from Databricks" button

### Workflow

1. **Select Mode:** Choose "Synthesis" in the Knowledge Base (Research) hex
2. **Choose Option:** Select "New Synthesis"
3. **Select Brand:** Choose a brand from the dropdown
4. **Select Project Type:** Choose a project type from the dropdown
5. **Upload File:** Click the green "Upload File to Databricks" button
6. **Choose File:** Select a file from your computer
7. **Auto-Upload:** File is automatically uploaded to Databricks Knowledge Base

### File Processing

When you upload a file:

1. **File is read** from your computer using FileReader API
2. **Content is converted** to Base64 encoding
3. **Metadata is created** including:
   - Brand (from selected dropdown)
   - Project Type (from selected dropdown)
   - File name (original filename)
   - File type: "Synthesis"
   - Upload date (timestamp)
   - Initial approval status: `false` (unapproved)
   - Citation count: 0
   - Gem inclusion count: 0

4. **File is saved** to Databricks Knowledge Base using `saveToKnowledgeBase()` API
5. **Local reference is created** in the research files list
6. **Success notification** appears when complete

---

## Supported File Types

The upload accepts the following file formats:

- **PDF:** `.pdf`
- **Word:** `.doc`, `.docx`
- **Excel:** `.xlsx`, `.xls`
- **CSV:** `.csv`
- **Text:** `.txt`
- **PowerPoint:** `.ppt`, `.pptx`

---

## API Integration

### Function Used

```typescript
import { saveToKnowledgeBase, KnowledgeBaseFile } from '../utils/databricksAPI';
```

### Data Structure

```typescript
const knowledgeBaseFile: KnowledgeBaseFile = {
  id: Date.now().toString(),
  brand: selectedBrand,
  projectType: selectedProjectType,
  fileName: file.name,
  isApproved: false,
  uploadDate: Date.now(),
  fileType: 'Synthesis',
  content: base64Content,
  source: `Uploaded: ${file.name}`,
  citationCount: 0,
  gemInclusionCount: 0
};
```

### Handler Function

```typescript
const handleUploadToDatabricks = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // 1. Get file from input
  const file = event.target.files?.[0];
  
  // 2. Validate brand and project type are selected
  if (!selectedBrand || !selectedProjectType) {
    alert('Please select Brand and Project Type first');
    return;
  }
  
  // 3. Read file as Base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Content = e.target?.result as string;
    
    // 4. Create Knowledge Base file object
    const knowledgeBaseFile = { /* ... */ };
    
    // 5. Save to Databricks
    const result = await saveToKnowledgeBase(knowledgeBaseFile);
    
    // 6. Create local reference if successful
    if (result.success) {
      onCreateResearchFile(newFile);
      alert('✅ File uploaded successfully!');
    }
  };
  
  reader.readAsDataURL(file);
};
```

---

## User Experience

### Before Upload
- User must select Brand and Project Type first
- If not selected, alert appears: "Please select Brand and Project Type first"

### During Upload
- File is read and converted to Base64
- Data is sent to Databricks API
- Console logs upload progress

### After Upload (Success)
- Success alert: "✅ '[filename]' uploaded to Databricks Knowledge Base successfully!"
- File appears in the local research files list
- File is tagged with selected brand and project type
- File starts with `isApproved: false` status
- File input is reset for next upload

### After Upload (Failure)
- Error alert: "❌ Failed to upload to Databricks: [error message]"
- Console logs error details
- File input is reset

---

## Comparison: Upload vs Import

### Upload File to Databricks (Green Button)
- **Source:** Your computer
- **Action:** Upload file TO Databricks
- **Use case:** Adding new research files to the knowledge base
- **Process:** File → Databricks → Local reference
- **Color:** Green

### Import from Databricks (Blue Button)
- **Source:** Databricks
- **Action:** Import file FROM Databricks
- **Use case:** Using existing files in the knowledge base
- **Process:** Databricks → Local reference
- **Color:** Blue

---

## Three Ways to Add Files

In the "New Synthesis" mode, you now have **three ways** to add files:

1. **Select Existing Approved Files**
   - Checkbox selection from existing approved files
   - Files already in the system

2. **Upload File to Databricks** (NEW)
   - Upload from your computer
   - Creates new entry in Databricks Knowledge Base
   - Green button

3. **Import from Databricks**
   - Browse existing Databricks files
   - Select and import to synthesis
   - Blue button

---

## Development Mode

In development mode (`DEVELOPMENT_MODE = true` in `/utils/databricksAPI.ts`):

- Upload operation is **mocked**
- Console logs show: "💾 [MOCK] Saving to Databricks Knowledge Base"
- Success is simulated immediately
- No actual API call is made

### Console Output Example

```
💾 [MOCK] Saving to Databricks Knowledge Base: {
  fileName: "Market_Research_2024.pdf",
  fileType: "Synthesis",
  brand: "Nike",
  insightType: undefined,
  inputMethod: undefined
}
✅ [MOCK] Successfully saved to Databricks Knowledge Base
✅ File uploaded to Databricks Knowledge Base: Market_Research_2024.pdf
```

---

## Production Mode

In production mode (`DEVELOPMENT_MODE = false`):

- Actual API call is made to: `POST /api/databricks/knowledge-base/upload`
- Request body contains full `KnowledgeBaseFile` object
- Response is validated
- Errors are properly handled and displayed

---

## Error Handling

### Validation Errors
- No file selected: Handler returns early
- No brand selected: Alert appears
- No project type selected: Alert appears

### File Reading Errors
- File read fails: "Failed to read file. Please try again."
- Console logs error

### Upload Errors
- API call fails: "❌ Failed to upload to Databricks: [error]"
- Network issues handled gracefully
- User is notified of failure

---

## File Management After Upload

Once uploaded, the file:

1. **Appears in research files list** with:
   - Brand: [selected brand]
   - Project Type: [selected project type]
   - Status: "Pending Approval" (yellow badge)
   - Source: "Databricks: Knowledge Base/[brand]/[filename]"

2. **Can be approved** by researchers with approval permissions

3. **Becomes available** in synthesis after approval

4. **Tracked in Knowledge Base** with:
   - Citation count (starts at 0)
   - Gem inclusion count (starts at 0)
   - Upload date
   - Approval status

---

## Future Enhancements

Potential improvements:

1. **Progress indicator** for large file uploads
2. **Drag and drop** file upload
3. **Multiple file selection** for batch uploads
4. **File preview** before uploading
5. **Auto-approval option** for trusted users
6. **File size validation** and limits
7. **Duplicate detection** before upload
8. **Upload history** tracking

---

## Testing Checklist

- [ ] Upload button appears after brand/project type selection
- [ ] Button is disabled/alerts when brand/project not selected
- [ ] File picker opens when button is clicked
- [ ] File type filter works (only shows accepted formats)
- [ ] File is read and converted to Base64
- [ ] API call is made with correct data structure
- [ ] Success alert appears on successful upload
- [ ] Error alert appears on failure
- [ ] File appears in research files list
- [ ] File has correct metadata (brand, project type, etc.)
- [ ] File starts with unapproved status
- [ ] File input resets after upload
- [ ] Console logs show correct information
- [ ] Works in both development and production modes

---

**Last Updated:** February 10, 2026  
**Version:** 1.0  
**Feature Added By:** CoHive Development Team
