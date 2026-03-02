# AI-Powered Knowledge Base Classification System

## Overview

The CoHive Knowledge Base uses **AI-powered automatic classification** to organize uploaded files. Instead of requiring users to manually specify whether content is general, category-specific, or brand-specific, the system uses Databricks AI to analyze file content and automatically assign appropriate metadata.

---

## How It Works

### 1. **Upload Flow**

```
User uploads file
    ↓
File saved to Databricks
    ↓
AI analyzes content
    ↓
Auto-assigned: scope, category, brand, tags
    ↓
File appears in appropriate hexes
```

### 2. **AI Classification Logic**

The AI analyzes file content to determine:

- **Scope**: general, category, or brand
- **Category**: Which product category (if applicable)
- **Brand**: Which brand (if applicable)  
- **Tags**: Relevant keywords and topics
- **Confidence Score**: How confident the AI is in its classification

**Example Classifications:**

| Content | AI Classification |
|---------|------------------|
| "Industry retail trends for 2024" | **General** - No category or brand |
| "Running shoe market analysis across all brands" | **Category: Running Shoes** - No specific brand |
| "Nike Air Max product research" | **Brand: Nike**, Category: Running Shoes |

---

## API Endpoints

### Upload File

`POST /api/databricks/knowledge-base/upload`

**Parameters:**
```json
{
  "fileName": "market-research.pdf",
  "fileContent": "base64-encoded-content",
  "fileSize": 123456,
  "scope": "general",  // Optional hint - AI will verify/correct
  "category": null,     // Optional hint
  "brand": null,        // Optional hint
  "fileType": "Research",
  "userEmail": "user@example.com"
}
```

**Note:** Users can provide `category` and `brand` as **hints**, but they're not required. The AI will analyze the content and assign the final values.

### Classify File

`POST /api/databricks/knowledge-base/classify`

**Parameters:**
```json
{
  "fileId": "kb-1234567890-abc123",
  "fileName": "research.pdf",
  "fileContent": "text content to analyze",
  "userHints": {
    "brand": "Nike",      // Optional
    "category": "Running Shoes",  // Optional
    "scope": "brand"      // Optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "scope": "brand",
    "category": "Running Shoes",
    "brand": "Nike",
    "confidence": 0.95,
    "reasoning": "Document contains Nike-specific product information and references the Air Max line",
    "tags": ["Nike", "Air Max", "Product Research", "Running Shoes"]
  }
}
```

---

## File Visibility in Enter Hex

When users select **Brand** and **Category** in the Enter hex, they see:

### Scenario: User selects Brand="Nike", Category="Running Shoes"

**Files Shown:**
- ✅ **All General files** (industry trends, methodologies)
- ✅ **All "Running Shoes" category files** (shared with Adidas, Puma, etc.)
- ✅ **All "Nike" brand files** (Nike-specific research)

**Files Hidden:**
- ❌ "Basketball" category files (different category)
- ❌ "Adidas" brand files (different brand)

---

## Benefits

### 1. **Reduces User Burden**
- No need to manually classify files
- Users just upload - AI does the rest

### 2. **Consistent Classification**
- AI applies same logic to all files
- Reduces human error

### 3. **Smart Hints**
- Users can provide optional hints
- AI uses hints but verifies against content

### 4. **Automatic Reclass ification**
- If file content changes, re-run classification
- Updates metadata automatically

---

## Available Categories

The AI recognizes these product categories:

- Running Shoes
- Basketball
- Athletic Apparel
- Lifestyle Footwear
- Training & Gym
- Soccer/Football
- Tennis
- Golf
- Outdoor & Hiking
- Kids & Youth

## Available Brands

The AI recognizes these brands:

- Nike, Adidas, Puma, New Balance, Under Armour
- Brooks, Asics, Saucony, Hoka
- Lululemon, Reebok, Vans, Converse
- Merrell, Columbia, Salomon
- FootJoy, Callaway

---

## Workflow Example

### Step 1: Upload File
```typescript
const result = await uploadToKnowledgeBase({
  file: uploadedFile,
  scope: 'general', // Initial guess - AI will verify
  fileType: 'Research',
  userEmail: 'user@example.com',
  userRole: 'research-analyst',
});
```

### Step 2: AI Classifies (Automatic)
The backend automatically triggers AI classification after upload.

### Step 3: View in Enter Hex
User selects Brand="Nike", Category="Running Shoes" and sees:
- General files (all users)
- Running Shoes category files (all Running Shoes brands)
- Nike brand files (Nike only)

---

## Code Integration

### Frontend: Upload with Optional Hints

```typescript
import { uploadToKnowledgeBase } from '../utils/databricksAPI';

// User can provide hints, but they're optional
const result = await uploadToKnowledgeBase({
  file: myFile,
  scope: 'brand', // Hint: probably brand-specific
  category: 'Running Shoes', // Hint
  brand: 'Nike', // Hint
  fileType: 'Research',
  userEmail: userEmail,
  userRole: userRole,
});

// AI will verify/correct these values based on actual content
```

### Frontend: Manual Classification

```typescript
import { classifyKnowledgeBaseFile } from '../utils/databricksAPI';

// Manually trigger classification (e.g., for re-classification)
const result = await classifyKnowledgeBaseFile(
  fileId,
  fileName,
  fileContentText,
  {
    brand: 'Nike', // Optional hint
    category: 'Running Shoes', // Optional hint
  }
);

console.log(result.classification);
// {
//   scope: 'brand',
//   category: 'Running Shoes',
//   brand: 'Nike',
//   confidence: 0.95,
//   reasoning: '...',
//   tags: ['Nike', 'Air Max', ...]
// }
```

---

## Database Schema

Files are stored with AI-assigned metadata:

```sql
CREATE TABLE knowledge_base.cohive.file_metadata (
  file_id STRING,
  file_name STRING,
  scope STRING,  -- 'general', 'category', or 'brand' (AI-assigned)
  category STRING,  -- NULL for general, category name for category/brand (AI-assigned)
  brand STRING,     -- NULL for general/category, brand name for brand (AI-assigned)
  tags ARRAY<STRING>,  -- AI-generated tags
  confidence FLOAT,  -- AI confidence score (future)
  -- ... other fields
);
```

---

## Future Enhancements

1. **Confidence Thresholds**: Flag low-confidence classifications for human review
2. **Re-classification Workflow**: Automatically re-classify when file content changes
3. **User Feedback Loop**: Learn from user corrections to improve AI accuracy
4. **Multi-category Support**: Allow files to belong to multiple categories
5. **Custom Taxonomies**: Allow organizations to define custom categories/brands

---

## Summary

✅ **No manual classification required** - AI handles it
✅ **Optional hints supported** - Users can guide AI if needed
✅ **Automatic file visibility** - Right files show in right hexes
✅ **Consistent and scalable** - Works for any number of files

**Last Updated:** March 2026
