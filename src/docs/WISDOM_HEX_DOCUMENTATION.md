# Wisdom Hex Documentation

## Overview

The Wisdom hex ("Share Your Wisdom") allows users to contribute insights about brands, categories, or general market knowledge to the CoHive knowledge base. These insights are **stored directly in Databricks** (not localStorage) for centralized, persistent storage accessible to all users across the organization. Files become available as context for AI processing in other workflow steps.

---

## User Flow

### Step 1: Select Insight Type

User chooses what type of insight they're sharing:

- **About a Brand** - Specific insights about a particular brand
- **About a Category** - Insights about a product category or market segment  
- **General Insight** - General market, consumer, or industry knowledge

### Step 2: Choose Input Method

User selects how they want to share their wisdom:

- **Type Text** - Write text-based insights in a textarea
- **Record Voice** - Record audio directly using microphone (no file upload)
- **Upload Photo** - Choose to upload an image file OR capture with camera
- **Upload Video** - Choose to upload a video file OR record with camera
- **Upload File** - Upload any document (PDF, Word, Excel, PowerPoint, Text, CSV)

### Step 3: Share Your Wisdom

Based on the input method selected:

**Text**:
- Multi-line text area for typing insights
- "Save to Knowledge Base" button when content is entered

**Voice**:
- "Start Recording" button to begin microphone capture
- Real-time recording indicator with pulsing dot
- "Stop" button to end recording
- Audio automatically saved as .webm file
- No file upload needed - records directly in browser

**Photo**:
- Two options presented:
  - **Upload Photo**: File picker for existing images
  - **Capture with Camera**: Live camera preview with "Capture Photo" button
- Captured photos saved as .jpg files
- Camera preview shows in real-time before capture

**Video**:
- Two options presented:
  - **Upload Video**: File picker for existing videos
  - **Record Video**: Live camera preview with recording controls
- "Start Recording" and "Stop & Save" buttons
- Real-time recording indicator
- Recorded videos saved as .webm files
- Camera preview shows in real-time during recording

**File**:
- File picker for document uploads
- Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt), CSV (.csv)
- Automatically saved to Knowledge Base on upload
- No size limit enforcement (but localStorage limits apply)

### Step 4: Save to Knowledge Base

Once content is provided, user clicks "Save to Knowledge Base" (for text) or the content auto-saves on upload (for files).

---

## Data Structure

### Wisdom File Format

```typescript
{
  id: string,                    // Unique timestamp-based ID
  brand: string,                 // From Enter step or 'General'
  projectType: string,           // From Enter step or 'General'
  fileName: string,              // Auto-generated with pattern
  isApproved: boolean,           // Always true for Wisdom
  uploadDate: number,            // Timestamp
  fileType: 'Wisdom',           // Special type for filtering
  content: string                // Base64 for files, plain text for text
}
```

### Filename Patterns

- **Text**: `Wisdom_[InsightType]_[Timestamp].txt`
- **Voice**: `Wisdom_[InsightType]_Voice_[Timestamp].webm` (recorded audio)
- **Photo Upload**: `Wisdom_[InsightType]_Photo_[OriginalFilename]`
- **Photo Capture**: `Wisdom_[InsightType]_Captured_[Timestamp].jpg`
- **Video Upload**: `Wisdom_[InsightType]_Video_[OriginalFilename]`
- **Video Record**: `Wisdom_[InsightType]_Recorded_[Timestamp].webm`
- **File Upload**: `Wisdom_[InsightType]_File_[OriginalFilename]`

**Examples:**
- `Wisdom_Brand_1738927456789.txt`
- `Wisdom_Category_Voice_1738927456789.webm`
- `Wisdom_General_Photo_consumer_behavior.jpg`
- `Wisdom_Brand_Captured_1738927456789.jpg`
- `Wisdom_Category_Video_product_demo.mp4`
- `Wisdom_General_Recorded_1738927456789.webm`
- `Wisdom_Brand_File_market_research.pdf`
- `Wisdom_Category_File_sales_data.xlsx`

---

## Storage

### Databricks Integration

In production, wisdom files should be:

1. **Uploaded to Databricks** via API endpoint
2. **Stored in Unity Catalog** or Databricks Volumes
3. **Indexed for retrieval** by AI agents
4. **Made searchable** by brand, category, type, etc.

**API Call (Future)**:
```typescript
const response = await fetch('/api/databricks-save-wisdom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    insightType: 'Brand',
    inputMethod: 'Text',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    fileName: 'Wisdom_Brand_1738927456789.txt',
    content: 'Base64 or text content...'
  })
});
```

---

## Features

### Progressive Disclosure

Questions appear sequentially:
1. Insight Type shows first
2. Input Method shows only after Insight Type selected
3. Share Your Wisdom shows only after both are selected

This guides users through the flow naturally.

### Native Media Capture

**Voice Recording**:
- Uses browser MediaRecorder API
- Direct microphone access (no file upload)
- Real-time recording indicator with pulsing animation
- One-click start/stop recording
- Automatically saves as .webm audio file

**Photo Capture**:
- Two options: Upload existing file OR capture with camera
- Uses getUserMedia API for camera access
- Live camera preview before capture
- Single button click captures frame
- Saves as .jpg with 90% quality

**Video Recording**:
- Two options: Upload existing file OR record with camera
- Uses MediaRecorder API with video stream
- Live camera preview during recording
- Start/stop controls with recording indicator
- Automatically saves as .webm video file

### Auto-Save on Capture/Upload

For all media types:
- Files automatically saved to knowledge base on capture/upload/recording complete
- No separate "Save" button needed (except for text)
- Success message confirms save
- Console log shows saved data structure

### Text Input Save Button

For text input:
- Multi-line textarea for longer insights
- "Save to Knowledge Base" button appears when text is entered
- Button click saves to knowledge base and shows confirmation

### File Size Warnings

For video uploads:
- Warning message about file size limits
- Suggests using smaller files or shorter clips
- Helps prevent localStorage overflow

---

## Use Cases

### Brand Insights

**Example**: Marketing manager shares competitive intelligence
```
Insight Type: Brand
Input Method: Text
Content: "Nike's recent campaign focused on sustainability 
has resonated strongly with Gen Z consumers. Sales data 
shows 23% increase in 18-24 demographic since launch..."
```

### Category Insights

**Example**: Product manager shares category trends
```
Insight Type: Category
Input Method: Photo
Content: [Photo of retail shelf showing product placement trends]
```

### General Insights

**Example**: Research analyst shares voice memo
```
Insight Type: General
Input Method: Voice
Content: [Audio recording discussing consumer behavior patterns]
```

---

## Integration with Other Hexes

### Knowledge Base Access

Wisdom contributions become part of the research files pool and can be:

1. **Selected in CentralHexView** - Available for "New Synthesis" mode
2. **Referenced by AI** - Used as context in assessments/recommendations
3. **Filtered by type** - Can filter to show only "Wisdom" type files
4. **Searched** - Searchable in Knowledge Base management

### AI Context Enhancement

When executing workflow hexes:
- Wisdom files provide additional context
- Help AI understand brand/category nuances
- Enrich recommendations with crowdsourced insights
- Build institutional knowledge over time

---

## File Size Considerations

### Storage Limits

**localStorage Limits**: 5-10 MB per domain

**Recommendations**:
- **Text**: Unlimited practical length (few KB)
- **Voice**: Keep under 5 MB (about 5 minutes at 128kbps)
- **Photo**: Compress to < 2 MB if possible
- **Video**: Keep clips under 30 seconds or use lower quality

### Future: Direct Databricks Upload

For production deployment, implement:

```typescript
// Upload directly to Databricks, store only reference locally
const uploadToDatabricks = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('insightType', insightType);
  
  const response = await fetch('/api/databricks-upload-wisdom', {
    method: 'POST',
    body: formData
  });
  
  const { fileId, path } = await response.json();
  
  // Store only reference in localStorage
  const reference = {
    id: fileId,
    path: path,
    fileName: file.name,
    // ... other metadata
  };
  
  return reference;
};
```

This avoids localStorage limits and enables large file uploads.

---

## Validation

### Required Fields

- **Insight Type**: Must select one option
- **Input Method**: Must select one option  
- **Content**: Must provide content based on method:
  - Text: Non-empty string
  - Voice/Photo/Video: File uploaded

### Error Handling

- File read errors show alert
- Missing selections show error message
- Large files trigger warning (video only currently)

---

## Mobile Support

The Wisdom hex is designed for mobile deployment:

- **Text Input**: Works on mobile keyboards
- **Voice Recording**: Can use device microphone (future: native recording)
- **Photo Upload**: Can use device camera
- **Video Upload**: Can use device camera

**Description Note**: "This will also be deployed as a mobile app soon."

---

## Export/Import

### Export

Wisdom contributions are included in project exports:

```json
{
  "version": "1.0",
  "researchFiles": [
    {
      "id": "1738927456789",
      "brand": "Nike",
      "projectType": "Creative Messaging",
      "fileName": "Wisdom_Brand_1738927456789.txt",
      "isApproved": true,
      "uploadDate": 1738927456789,
      "fileType": "Wisdom",
      "content": "Brand insights..."
    }
  ]
}
```

### Import

When importing a project:
- Wisdom files restore to research files
- Available immediately in Knowledge Base
- Maintain all metadata and content

---

## Best Practices

### For Text Insights

- Be specific and actionable
- Include data/evidence when possible
- Date your insights for temporal context
- Reference sources if applicable

### For Voice Insights

- Browser will request microphone permission on first use
- Speak clearly and minimize background noise
- Recording indicator shows when active
- Click "Stop" when finished - saves automatically
- Recordings saved as .webm format (widely supported)

### For Photo Insights

**Upload Option**:
- Use high-quality but compressed images
- Ensure text/details are readable
- Most image formats supported

**Capture Option**:
- Grant camera permission when prompted
- Position camera for clear shot
- Click "Capture Photo" when ready
- Photo automatically saved as .jpg

### For Video Insights

**Upload Option**:
- Keep files under recommended size limits
- Most video formats supported
- Consider compressing large files

**Record Option**:
- Grant camera and microphone permission
- Click "Start Recording" to begin
- Recording indicator shows when active
- Click "Stop & Save" when finished
- Videos saved as .webm format
- Keep recordings under 30 seconds for best performance

### For File Uploads

- Supported formats: PDF, Word, Excel, PowerPoint, Text, CSV
- Use descriptive filenames for easy identification
- Include reports, research documents, data files, presentations
- Files automatically saved to Knowledge Base
- Consider file size - large files may impact browser performance

---

## Future Enhancements

### Planned Features

1. **Enhanced Audio Quality**
   - Multiple audio format options
   - Audio compression settings
   - Waveform visualization during recording

2. **Advanced Camera Controls**
   - Switch between front/back camera (mobile)
   - Zoom and focus controls
   - Flash toggle for photos

3. **Rich Text Editor**
   - Formatting options
   - Bullet points, bold, italic
   - Link embedding

4. **Collaborative Wisdom**
   - Multiple contributors per insight
   - Version history
   - Comments and discussions

5. **AI-Assisted Tagging**
   - Auto-suggest tags from content
   - Extract key themes from text/transcripts
   - Link related insights

6. **Search and Filter**
   - Full-text search
   - Filter by insight type
   - Sort by date, relevance

7. **Transcription Services**
   - Automatic voice-to-text transcription
   - Video speech-to-text
   - Multi-language support

---

## Troubleshooting

### Cannot Access Microphone/Camera

**Symptoms**:
- "Unable to access microphone/camera" error
- Permission denied message

**Solutions**:
- Check browser permissions (click lock icon in address bar)
- Grant microphone/camera access when prompted
- Ensure no other app is using the device
- Try a different browser (Chrome/Edge recommended)
- Check system privacy settings (especially macOS/iOS)

### Recording Not Saving

**Check**:
- Recording was stopped before navigating away
- Browser localStorage has space available
- Console for any error messages

**Solution**:
- Complete the recording (click Stop button)
- Clear some localStorage space if needed
- Check if file was created in console log

### Camera Preview Not Showing

**Check**:
- Camera permission granted
- Camera not in use by another app
- Browser supports getUserMedia API

**Solution**:
- Refresh page and grant permission again
- Close other apps using camera
- Use modern browser (Chrome, Firefox, Edge, Safari)

### File Upload Fails

**Check**:
- File size (under browser/localStorage limits)
- File format (matches accepted types)
- Browser permissions (for camera/mic if applicable)

**Solution**:
- Compress large files
- Use different format
- Grant browser permissions

### Wisdom Not Appearing in Knowledge Base

**Check**:
- localStorage has `cohive_research_files`
- File has `fileType: 'Wisdom'`
- Brand/project match current project

**Solution**:
- Check browser console for errors
- Verify save confirmation appeared
- Check localStorage in DevTools

### Cannot Save Text Wisdom

**Check**:
- Text is not empty
- Brand and project type set in Enter step
- "Save to Knowledge Base" button appears

**Solution**:
- Enter some text first
- Complete Enter step first
- Refresh page if button doesn't appear

---

## Related Files

- `/components/ProcessWireframe.tsx` - Wisdom hex implementation (lines 1751-2081)
- `/components/ProcessFlow.tsx` - Wisdom hex definition
- `/styles/cohive-theme.ts` - Wisdom hex color
- `/guidelines/Guidelines.md` - Development standards

---

## API Integration Example

### Future Databricks API Endpoint

```typescript
// /api/databricks-save-wisdom.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest, 
  res: VercelResponse
) {
  const { 
    insightType, 
    inputMethod, 
    brand, 
    projectType, 
    fileName, 
    content 
  } = req.body;
  
  // Decode base64 if file content
  let processedContent = content;
  if (inputMethod !== 'Text') {
    const base64Data = content.split(',')[1];
    processedContent = Buffer.from(base64Data, 'base64');
  }
  
  // Upload to Databricks Workspace or Volume
  const databricksPath = `/Workspace/CoHive/Wisdom/${brand}/${fileName}`;
  
  await uploadToDatabricksWorkspace(databricksPath, processedContent);
  
  // Index in vector database for AI retrieval
  await indexForAI({
    path: databricksPath,
    insightType,
    brand,
    projectType,
    content: inputMethod === 'Text' ? content : fileName
  });
  
  res.status(200).json({ 
    success: true, 
    path: databricksPath 
  });
}
```

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Feature Status**: ✅ Fully Implemented  
**Mobile Ready**: 🚧 Planned
