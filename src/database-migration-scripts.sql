-- Knowledge Base Data Model Migration Scripts
-- Run these on your Databricks SQL Warehouse to fix existing data

-- ============================================================================
-- 1. FIX CATEGORY SCOPE FILES
-- ============================================================================
-- Category scope files should have:
-- - scope = 'category'
-- - category = <category name>
-- - brand = NULL (NOT the category name)
-- ============================================================================

-- Preview: See which category files have brand values set
SELECT file_id, file_name, scope, category, brand, project_type
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'category' AND brand IS NOT NULL
ORDER BY upload_date DESC;

-- Fix: Clear brand field for all category scope files
UPDATE knowledge_base.cohive.file_metadata
SET brand = NULL, updated_at = CURRENT_TIMESTAMP()
WHERE scope = 'category' AND brand IS NOT NULL;

-- Verify fix
SELECT COUNT(*) as fixed_count
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'category' AND brand IS NULL;

-- ============================================================================
-- 2. FIX GENERAL SCOPE FILES
-- ============================================================================
-- General scope files should have:
-- - scope = 'general'
-- - category = NULL
-- - brand = NULL
-- ============================================================================

-- Preview: See which general files have category or brand values set
SELECT file_id, file_name, scope, category, brand, project_type
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'general' AND (category IS NOT NULL OR brand IS NOT NULL)
ORDER BY upload_date DESC;

-- Fix: Clear category and brand for all general scope files
UPDATE knowledge_base.cohive.file_metadata
SET category = NULL, brand = NULL, updated_at = CURRENT_TIMESTAMP()
WHERE scope = 'general' AND (category IS NOT NULL OR brand IS NOT NULL);

-- Verify fix
SELECT COUNT(*) as fixed_count
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'general' AND category IS NULL AND brand IS NULL;

-- ============================================================================
-- 3. VERIFY BRAND SCOPE FILES
-- ============================================================================
-- Brand scope files should have:
-- - scope = 'brand'
-- - category = <category name>
-- - brand = <brand name>
-- ============================================================================

-- Check for brand scope files missing required fields
SELECT file_id, file_name, scope, category, brand, project_type
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'brand' AND (category IS NULL OR brand IS NULL)
ORDER BY upload_date DESC;

-- These files need manual review to determine correct category/brand values

-- ============================================================================
-- 4. SUMMARY REPORT
-- ============================================================================
-- Get counts by scope to verify data model integrity

SELECT 
  scope,
  COUNT(*) as total_files,
  SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as null_category_count,
  SUM(CASE WHEN brand IS NULL THEN 1 ELSE 0 END) as null_brand_count,
  SUM(CASE WHEN is_approved = TRUE THEN 1 ELSE 0 END) as approved_count
FROM knowledge_base.cohive.file_metadata
GROUP BY scope
ORDER BY scope;

-- Expected results:
-- general:  null_category_count = total_files, null_brand_count = total_files
-- category: null_brand_count = total_files (category should have values)
-- brand:    null_category_count = 0, null_brand_count = 0 (both should have values)

-- ============================================================================
-- 5. DETAILED VIEW BY SCOPE
-- ============================================================================

-- General scope files
SELECT file_id, file_name, project_type, file_type, is_approved, upload_date
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'general'
ORDER BY upload_date DESC
LIMIT 20;

-- Category scope files
SELECT file_id, file_name, category, project_type, file_type, is_approved, upload_date
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'category'
ORDER BY upload_date DESC
LIMIT 20;

-- Brand scope files
SELECT file_id, file_name, category, brand, project_type, file_type, is_approved, upload_date
FROM knowledge_base.cohive.file_metadata
WHERE scope = 'brand'
ORDER BY upload_date DESC
LIMIT 20;

-- ============================================================================
-- 6. CLEANUP ORPHANED FILES (OPTIONAL)
-- ============================================================================
-- Find files with invalid combinations (should not exist after fixes)

-- Files with inconsistent scope/field combinations
SELECT file_id, file_name, scope, category, brand, 
  CASE 
    WHEN scope = 'general' AND (category IS NOT NULL OR brand IS NOT NULL) 
      THEN 'General should have no category/brand'
    WHEN scope = 'category' AND brand IS NOT NULL 
      THEN 'Category should have no brand'
    WHEN scope = 'category' AND category IS NULL 
      THEN 'Category should have category field'
    WHEN scope = 'brand' AND (category IS NULL OR brand IS NULL) 
      THEN 'Brand should have both category and brand'
    ELSE 'Valid'
  END as validation_status
FROM knowledge_base.cohive.file_metadata
WHERE 
  (scope = 'general' AND (category IS NOT NULL OR brand IS NOT NULL))
  OR (scope = 'category' AND (brand IS NOT NULL OR category IS NULL))
  OR (scope = 'brand' AND (category IS NULL OR brand IS NULL))
ORDER BY upload_date DESC;
