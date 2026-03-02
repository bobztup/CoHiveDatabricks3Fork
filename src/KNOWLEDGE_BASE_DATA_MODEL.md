# Knowledge Base Data Model

## Database Schema: `knowledge_base.cohive.file_metadata`

### Overview

The CoHive Knowledge Base uses **AI-powered automatic classification** to organize files. Users upload files with optional hints (brand, category), and AI analyzes the content to automatically assign:
- **scope**: 'general' | 'category' | 'brand'
- **category**: Product category name (if applicable)
- **brand**: Brand name (if applicable)
- **tags**: Relevant keywords

See `/AI_CLASSIFICATION_SYSTEM.md` for complete AI classification documentation.

### Scope-Based Field Usage

The Knowledge Base uses a **scope-based data model** with three levels of organization:

#### 1. **General Scope** (`scope = 'general'`)
Files that apply to all brands and categories.

**Fields:**
- `scope`: `'general'`
- `category`: `NULL`
- `brand`: `NULL`
- `project_type`: Optional descriptive text

**Example:**
```json
{
  "scope": "general",
  "category": null,
  "brand": null,
  "project_type": "Industry Research",
  "fileName": "2024_Market_Trends.pdf"
}
```

**Display:** "General - Industry Research"

---

#### 2. **Category Scope** (`scope = 'category'`)
Files that apply to a specific product category across all brands.

**Fields:**
- `scope`: `'category'`
- `category`: Name of the category (e.g., "Running Shoes", "Basketball")
- `brand`: `NULL` ⚠️ **Important: brand should be NULL for category scope**
- `project_type`: Optional project type within that category

**Example:**
```json
{
  "scope": "category",
  "category": "Running Shoes",
  "brand": null,
  "project_type": "Performance Analysis",
  "fileName": "Running_Category_Insights.pdf"
}
```

**Display:** "Running Shoes - Performance Analysis"

---

#### 3. **Brand Scope** (`scope = 'brand'`)
Files specific to a particular brand within a category.

**Fields:**
- `scope`: `'brand'`
- `category`: Name of the category (e.g., "Running Shoes")
- `brand`: Name of the brand (e.g., "Nike", "Adidas")
- `project_type`: Optional project type for that brand

**Example:**
```json
{
  "scope": "brand",
  "category": "Running Shoes",
  "brand": "Nike",
  "project_type": "Product Launch",
  "fileName": "Nike_Air_Max_Research.pdf"
}
```

**Display:** "Nike - Product Launch"

---

## Code Implementation

### Frontend Display Logic

In `/components/ProcessWireframe.tsx`, the conversion from `KnowledgeBaseFile` to `ResearchFile` handles scope-based display:

```typescript
const convertedFiles: ResearchFile[] = kbFiles.map((kbFile: KnowledgeBaseFile) => {
  let displayBrand = 'General';
  let displayProjectType = 'Knowledge Base';
  
  if (kbFile.scope === 'category') {
    // For category scope, show the category name
    displayBrand = kbFile.category || 'Uncategorized';
    displayProjectType = kbFile.projectType || 'Category Knowledge';
  } else if (kbFile.scope === 'brand') {
    // For brand scope, show the brand name
    displayBrand = kbFile.brand || 'Unknown Brand';
    displayProjectType = kbFile.projectType || kbFile.category || 'Brand Knowledge';
  } else {
    // For general scope, show "General"
    displayBrand = 'General';
    displayProjectType = kbFile.projectType || 'General Knowledge';
  }
  
  return {
    id: kbFile.fileId,
    brand: displayBrand,
    projectType: displayProjectType,
    fileName: kbFile.fileName,
    isApproved: kbFile.isApproved,
    uploadDate: new Date(kbFile.uploadDate).getTime(),
    fileType: kbFile.fileType,
    source: kbFile.filePath,
  };
});
```

### Database Validation

In `/api/databricks/knowledge-base/upload.js`, validation ensures correct field usage:

```javascript
// Validate scope-specific requirements
if (!allowUncleaned) {
  if (scope === 'category' && !category) {
    return res.status(400).json({ error: 'Category required for category scope' });
  }
  if (scope === 'brand' && (!brand || !category)) {
    return res.status(400).json({ error: 'Brand and category required for brand scope' });
  }
}
```

---

## File Storage Paths

Files are stored in Unity Catalog Volumes with paths based on scope:

### General Files
```
/Volumes/knowledge_base/cohive/files/general/{filename}
```

### Category Files
```
/Volumes/knowledge_base/cohive/files/category/{category-slug}/{filename}
```
Example: `/Volumes/knowledge_base/cohive/files/category/running-shoes/insights.pdf`

### Brand Files
```
/Volumes/knowledge_base/cohive/files/brand/{brand-slug}/{filename}
```
Example: `/Volumes/knowledge_base/cohive/files/brand/nike/product-research.pdf`

---

## Migration Notes

If you need to update existing data in the database:

### Fix Category Scope Files
If category-scoped files incorrectly have brand names in the `brand` field:

```sql
-- Clear brand field for category scope files
UPDATE knowledge_base.cohive.file_metadata
SET brand = NULL
WHERE scope = 'category' AND brand IS NOT NULL;
```

### Fix General Scope Files
Ensure general scope files have null category and brand:

```sql
-- Clear category and brand for general scope files
UPDATE knowledge_base.cohive.file_metadata
SET category = NULL, brand = NULL
WHERE scope = 'general' AND (category IS NOT NULL OR brand IS NOT NULL);
```

---

## Querying Examples

### Get all files for a specific brand
```sql
SELECT * FROM knowledge_base.cohive.file_metadata
WHERE scope = 'brand' AND brand = 'Nike'
AND is_approved = TRUE;
```

### Get all files for a category (including general)
```sql
SELECT * FROM knowledge_base.cohive.file_metadata
WHERE (scope = 'general') 
   OR (scope = 'category' AND category = 'Running Shoes')
AND is_approved = TRUE;
```

### Get all files for a specific brand (including category and general)
```sql
SELECT * FROM knowledge_base.cohive.file_metadata
WHERE (scope = 'general')
   OR (scope = 'category' AND category = 'Running Shoes')
   OR (scope = 'brand' AND brand = 'Nike' AND category = 'Running Shoes')
AND is_approved = TRUE;
```

---

## TypeScript Interface

```typescript
export interface KnowledgeBaseFile {
  fileId: string;
  fileName: string;
  filePath: string;
  scope: 'general' | 'category' | 'brand';
  category?: string;  // Required for 'category' and 'brand' scopes
  brand?: string;     // Required only for 'brand' scope, NULL for others
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  isApproved: boolean;
  uploadDate: string;
  uploadedBy: string;
  // ... other fields
}
```

---

## File Visibility and Filtering

### Hierarchical Access Model

When users navigate workflow hexes (Enter, Luminaries, Panelist, etc.), files are filtered based on their brand and category selection:

**User Context:**
- Brand: Selected in Enter hex (e.g., "Nike")
- Category: Selected in Enter hex (e.g., "Running Shoes")

**File Visibility Rules:**

1. **General Files** (scope='general'):
   - ✅ Visible to ALL users
   - ✅ Available in ALL brands and categories
   - Example: Industry research, market trends

2. **Category Files** (scope='category'):
   - ✅ Visible to ALL brands within that category
   - ❌ NOT visible to brands in other categories
   - Example: "Running Shoes" insights visible to Nike, Adidas, New Balance (all in Running Shoes category)

3. **Brand Files** (scope='brand'):
   - ✅ Visible ONLY to that specific brand
   - ❌ NOT visible to other brands (even in same category)
   - Example: "Nike" research only visible when brand="Nike"

### Brand-Category Mapping

The system uses `/data/brandCategoryMapping.ts` to determine which brands belong to which categories:

```typescript
{
  categoryName: 'Running Shoes',
  brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Under Armour', 'Brooks', 'Asics', 'Saucony', 'Hoka']
}
```

### Example Filtering Scenario

**User:** Brand = "Nike", Category = "Running Shoes"

**Files Shown:**
- ✅ General files (all general research)
- ✅ "Running Shoes" category files (shared with Adidas, Puma, etc.)
- ✅ "Nike" brand files (Nike-specific only)

**Files Hidden:**
- ❌ "Basketball" category files (different category)
- ❌ "Adidas" brand files (different brand)

---

## Summary

✅ **General scope**: No category, no brand → visible to ALL
✅ **Category scope**: Has category, NO brand → visible to all brands in category
✅ **Brand scope**: Has both category AND brand → visible to that brand only

This model allows for hierarchical knowledge organization where:
- General files are available to everyone
- Category files are shared across all brands in that category
- Brand files are specific to one brand

**Last Updated:** March 2026