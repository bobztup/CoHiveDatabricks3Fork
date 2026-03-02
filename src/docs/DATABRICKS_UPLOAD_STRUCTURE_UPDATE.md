# Databricks Knowledge Base Upload Structure Update

## Overview

Updated the Databricks integration to use a new structured upload API that includes scope, fileType, userEmail, and userRole parameters.

---

## Changes Made

### 1. New API Function: `uploadToKnowledgeBase`

**Location:** `/utils/databricksAPI.ts`

**New Interface:**
```typescript
export interface UploadToKnowledgeBaseParams {
  file: KnowledgeBaseFile;
  scope: 'general' | 'category' | 'brand';
  fileType: 'Synthesis' | 'Wisdom' | 'Persona';
  userEmail: string;
  userRole: string;
  categoryName?: string; // Required when scope is 'category'
}

export async function uploadToKnowledgeBase(
  params: UploadToKnowledgeBaseParams
): Promise<{ success: boolean; error?: string }>
```

**Key Features:**
- **Scope Classification:** Determines if the file is general knowledge, category-specific, or brand-specific
- **File Type:** Explicit file type classification (Synthesis, Wisdom, Persona)
- **User Tracking:** Records who uploaded the file and their role
- **Category Support:** Optional category name for category-scoped files
- **New Endpoint:** Uses `/api/databricks/knowledge-base/upload-v2` endpoint

---

### 2. Old Function Deprecated

**Function:** `saveToKnowledgeBase`

- Marked as `@deprecated` with JSDoc comment
- Still functional for backward compatibility
- Uses old endpoint: `/api/databricks/knowledge-base/upload`

**Migration Note:** All new code should use `uploadToKnowledgeBase` instead.

---

## Updated Components

### ProcessWireframe.tsx

**Import Update:**
```typescript
// Old
import { saveToKnowledgeBase, ... } from '../utils/databricksAPI';

// New
import { uploadToKnowledgeBase, UploadToKnowledgeBaseParams, ... } from '../utils/databricksAPI';
```

**Function Update:** `handleSaveWisdomToDatabricks`

```typescript
// Determine scope based on insightType
let scope: 'general' | 'category' | 'brand';
if (insightType === 'General') {
  scope = 'general';
} else if (insightType === 'Category') {
  scope = 'category';
} else {
  scope = 'brand';
}

// Use placeholder email for now - in production, get from auth
const userEmail = 'user@company.com'; // TODO: Get from authentication system

const result = await uploadToKnowledgeBase({
  file: wisdomFile,
  scope,
  fileType: 'Wisdom',
  userEmail,
  userRole, // Uses existing userRole state variable
  categoryName: insightType === 'Category' ? insightType : undefined
});
```

**Scope Logic for Wisdom Files:**
- **General:** `insightType === 'General'` → `scope: 'general'`
- **Category:** `insightType === 'Category'` → `scope: 'category'`
- **Brand:** `insightType === 'Brand'` → `scope: 'brand'`

---

### ResearcherModes.tsx

**Import Update:**
```typescript
// Old
import { saveToKnowledgeBase, ... } from '../utils/databricksAPI';

// New
import { uploadToKnowledgeBase, UploadToKnowledgeBaseParams, ... } from '../utils/databricksAPI';
```

**Function Update:** `handleUploadToDatabricks`

```typescript
const result = await uploadToKnowledgeBase({
  file: knowledgeBaseFile,
  scope: 'brand', // Synthesis files are brand-specific
  fileType: 'Synthesis',
  userEmail: 'user@company.com', // Placeholder - TODO: Get from auth
  userRole: canApproveResearch ? 'research-leader' : 'research-analyst'
});
```

**Scope Logic for Synthesis Files:**
- Always uses `scope: 'brand'` (synthesis files are brand-specific)
- User role derived from `canApproveResearch` prop

---

## API Request Structure

### Old Structure (Deprecated)

```typescript
POST /api/databricks/knowledge-base/upload
Body: {
  id: "...",
  brand: "Nike",
  projectType: "Creative Messaging",
  fileName: "file.pdf",
  isApproved: false,
  uploadDate: 1234567890,
  fileType: "Synthesis",
  content: "base64...",
  // ... other fields
}
```

### New Structure

```typescript
POST /api/databricks/knowledge-base/upload-v2
Body: {
  // All original file fields
  id: "...",
  brand: "Nike",
  projectType: "Creative Messaging",
  fileName: "file.pdf",
  isApproved: false,
  uploadDate: 1234567890,
  fileType: "Synthesis",
  content: "base64...",
  
  // New required fields
  scope: "brand",              // 'general' | 'category' | 'brand'
  fileType: "Synthesis",       // Explicit type
  userEmail: "user@company.com",
  userRole: "research-leader",
  categoryName: undefined      // Optional, only for category scope
}
```

---

## Scope Classification Rules

### General Scope
**When to use:** Knowledge applicable across all brands and categories
- Wisdom files with `insightType: 'General'`
- Industry-wide insights
- Universal best practices

**Example:**
```typescript
scope: 'general'
categoryName: undefined
```

### Category Scope
**When to use:** Knowledge applicable to a category of products/brands
- Wisdom files with `insightType: 'Category'`
- Category-specific market research
- Segment-wide insights

**Example:**
```typescript
scope: 'category'
categoryName: 'Athletic Footwear'
```

### Brand Scope
**When to use:** Knowledge specific to a single brand
- Wisdom files with `insightType: 'Brand'`
- All Synthesis files
- All Persona files
- Brand-specific research

**Example:**
```typescript
scope: 'brand'
categoryName: undefined
```

---

## TODO Items

### 1. User Authentication Integration

**Current State:** Using placeholder email `'user@company.com'`

**Required:**
```typescript
// ProcessWireframe.tsx (line 1172)
const userEmail = 'user@company.com'; // TODO: Get from authentication system

// ResearcherModes.tsx (line 223)
userEmail: 'user@company.com', // Placeholder - TODO: Get from auth
```

**Implementation:**
```typescript
// Example with auth integration
import { useAuth } from '../hooks/useAuth';

const { user } = useAuth();
const userEmail = user?.email || 'anonymous@company.com';
```

---

### 2. User Role in ResearcherModes

**Current State:** Deriving role from `canApproveResearch` prop

**Current Logic:**
```typescript
userRole: canApproveResearch ? 'research-leader' : 'research-analyst'
```

**Improvement Options:**

**Option A:** Add userRole prop to ResearcherModes
```typescript
interface ResearcherModesProps {
  // ... existing props
  userRole: string; // Add this
}
```

**Option B:** Get from authentication context
```typescript
const { user } = useAuth();
const userRole = user?.role || 'research-analyst';
```

---

### 3. Category Name for Wisdom Files

**Current Implementation:**
```typescript
categoryName: insightType === 'Category' ? insightType : undefined
```

**Issue:** Uses insightType value ('Category') as the category name

**Improvement:** Add category name input field for Category-scoped Wisdom
```typescript
// Add to Wisdom hex UI
<select>
  <option value="">-- Select Category --</option>
  <option value="Athletic Footwear">Athletic Footwear</option>
  <option value="Sports Apparel">Sports Apparel</option>
  // ... other categories
</select>
```

---

## Testing Checklist

### Wisdom Hex
- [ ] Brand-scoped wisdom uploads successfully
- [ ] Category-scoped wisdom uploads successfully
- [ ] General-scoped wisdom uploads successfully
- [ ] userRole is passed correctly
- [ ] Console logs show new structure

### Synthesis Upload (ResearcherModes)
- [ ] Synthesis files upload with brand scope
- [ ] userRole derived from canApproveResearch
- [ ] New endpoint is called (/upload-v2)
- [ ] Success/error messages display correctly

### Development Mode
- [ ] Mock logs show new structure
- [ ] All new parameters are logged
- [ ] No console errors

### Production Mode (when DEVELOPMENT_MODE = false)
- [ ] New endpoint receives correct payload
- [ ] Databricks API processes new structure
- [ ] Error handling works correctly

---

## Benefits of New Structure

### 1. Better Organization
- Files organized by scope (general/category/brand)
- Easier to query and filter
- Clear hierarchy in Databricks

### 2. Enhanced Metadata
- Track who uploaded each file
- Track user roles for permissions
- Audit trail for compliance

### 3. Improved Search
- Query by scope
- Filter by user/role
- Category-based retrieval

### 4. Future Features
- **Permission Control:** Role-based access to files
- **Analytics:** Track contributions by user/role
- **Notifications:** Alert users when files in their scope are updated
- **Collaboration:** See who added what knowledge

---

## Migration Path

### For Development
1. ✅ New function created (`uploadToKnowledgeBase`)
2. ✅ Old function deprecated (`saveToKnowledgeBase`)
3. ✅ Core components updated (ProcessWireframe, ResearcherModes)
4. ⏳ Add authentication integration
5. ⏳ Add proper userRole passing
6. ⏳ Add category name selection

### For Production
1. Deploy new API endpoint (`/api/databricks/knowledge-base/upload-v2`)
2. Test with development data
3. Update DEVELOPMENT_MODE to false
4. Monitor for errors
5. Deprecate old endpoint after migration period

---

## Rollback Plan

If issues arise, the old `saveToKnowledgeBase` function remains available:

```typescript
// Temporary rollback
const result = await saveToKnowledgeBase(wisdomFile);
```

Both functions coexist for backward compatibility.

---

## Files Modified

1. **`/utils/databricksAPI.ts`**
   - Added `uploadToKnowledgeBase` function
   - Added `UploadToKnowledgeBaseParams` interface
   - Deprecated `saveToKnowledgeBase`

2. **`/components/ProcessWireframe.tsx`**
   - Updated import statement
   - Updated `handleSaveWisdomToDatabricks` function
   - Added scope logic based on insightType

3. **`/components/ResearcherModes.tsx`**
   - Updated import statement
   - Updated `handleUploadToDatabricks` function
   - Added userRole derivation logic

---

## API Endpoint Documentation

### New Endpoint: POST /api/databricks/knowledge-base/upload-v2

**Request Body:**
```typescript
{
  // File metadata
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  content: string; // Base64
  source?: string;
  
  // New structure fields
  scope: 'general' | 'category' | 'brand';
  fileType: 'Synthesis' | 'Wisdom' | 'Persona';
  userEmail: string;
  userRole: string;
  categoryName?: string;
  
  // Type-specific fields
  insightType?: string; // For Wisdom
  inputMethod?: string; // For Wisdom
  citationCount?: number;
  gemInclusionCount?: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Error Codes:**
- `400`: Invalid scope or fileType
- `401`: Unauthorized (invalid userEmail)
- `403`: Forbidden (insufficient permissions)
- `500`: Server error

---

**Updated:** February 11, 2026  
**Version:** 2.0  
**Status:** ✅ Complete - Awaiting Authentication Integration  
**Backward Compatible:** Yes (old API still functional)
