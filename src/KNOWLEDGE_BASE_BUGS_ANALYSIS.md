# Knowledge Base Bugs - Complete Analysis

**Date:** March 1, 2026  
**Status:** Analysis Complete - Ready for Fix Implementation

---

## Problems Identified

### Problem 1: Files showing "Approved" when they haven't been approved
**Severity:** HIGH  
**Location:** Multiple locations  

**Root Cause:**
- Database field `is_approved` can be `TRUE`, `FALSE`, or `NULL`
- When `NULL`, TypeScript interface defines `isApproved: boolean` (non-nullable)
- JavaScript coerces `NULL` → `false`, but logic may not handle this correctly
- Files may show as approved due to incorrect mapping

**Affected Files:**
- `/components/ProcessWireframe.tsx` (line 1257)
- `/api/databricks/knowledge-base/list.js` (lines 29-36)
- `/utils/databricksAPI.ts` (line 20 - type definition)

---

### Problem 2: Pending files need separation (Processing vs Approval)
**Severity:** MEDIUM  
**Location:** `/components/ResearcherModes.tsx`

**Current Logic** (lines 188-196):
```typescript
// Filter for files that haven't been processed yet (no AI summary)
const unprocessedFiles = files.filter(f => !f.contentSummary || f.contentSummary.trim() === '');

// Filter for files that have been processed but not approved yet (have summary, not approved)
const processedFiles = files.filter(f => f.contentSummary && f.contentSummary.trim() !== '');
```

**Issue:**
- Only uses `contentSummary` to determine processing status
- Doesn't use `cleaningStatus` field (exists in DB but not utilized)
- Result: Can't distinguish between:
  - **Pending Processing**: New uploads waiting for AI processing
  - **Pending Approval**: AI-processed files waiting for human approval

**What's Needed:**
Two distinct queues:
1. **Pending Processing Queue**: `isApproved = NULL` AND `contentSummary IS NULL`
2. **Pending Approval Queue**: `isApproved = FALSE` AND `contentSummary IS NOT NULL`

---

### Problem 3: Non-researchers can't select approved files to read
**Severity:** MEDIUM  
**Location:** `/components/ResearchView.tsx` (lines 93-209)

**Current Code** (lines 118-123):
```typescript
<button 
  className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
  onClick={() => setSelectedFile(selectedFile === file.id ? null : file.id)}
>
  Read
</button>
```

**Issue:**
- Button exists and has onClick handler
- No `disabled` attribute visible
- But user reports they can't click approved files
- May be CSS issue or state management issue

**Need to verify:**
- Is button actually disabled somewhere?
- Does `displayFiles` filter correctly?
- Is there a z-index or pointer-events issue?

---

### Problem 4: File preview is an inline box, not a modal
**Severity:** LOW (UX Issue)  
**Location:** `/components/ResearchView.tsx`

**Current Implementation** (lines 140-171 for non-researcher):
```typescript
{selectedFile === file.id && !showSuggestionForm && (
  <div className="mt-4 pt-4 border-t-2 border-gray-200">
    <div className="bg-gray-50 border-2 border-gray-300 rounded p-4 h-64 overflow-y-auto">
      {/* Content preview */}
    </div>
  </div>
)}
```

**Issue:**
- Renders inline within file list item
- Creates visual clutter
- No close button (clicking "Read" again toggles it off)
- Inconsistent with researcher view which HAS a proper modal (lines 2212-2301 in ResearcherModes.tsx)

**What's Needed:**
- Convert to modal popup (similar to researcher view)
- Add close button
- Better visual hierarchy

---

### Problem 5: Can't close opened file
**Severity:** LOW  
**Location:** `/components/ResearchView.tsx` (non-researcher view)

**Issue:**
- No explicit "Close" button
- User must click "Read" button again to toggle off
- Not intuitive UX

**Fix:**
- Add "Close" or "×" button in file preview
- OR convert to modal with standard close behavior

---

### Problem 6: Approved files appear in pending list
**Severity:** HIGH  
**Location:** `/components/ResearcherModes.tsx` (lines 167-204)

**Current Query** (lines 173-178):
```typescript
const files = await listKnowledgeBaseFiles({
  isApproved: false, // Only pending files
  sortBy: 'upload_date',
  sortOrder: 'DESC',
  limit: 100,
});
```

**API Logic** (`/api/databricks/knowledge-base/list.js`, lines 29-36):
```javascript
if (isApproved !== undefined) {
  if (isApproved === 'true') {
    conditions.push(`is_approved = TRUE`);
  } else {
    // Include both FALSE and NULL for unapproved files
    conditions.push(`(is_approved = FALSE OR is_approved IS NULL)`);
  }
}
```

**Root Causes:**
1. **Database inconsistency**: Some approved files may have `is_approved = FALSE` instead of `TRUE`
2. **Reload logic issue**: After approval (lines 361-372), query runs again with `isApproved: false`, which should exclude newly approved files BUT:
   - If database update failed silently
   - If there's a race condition
   - If frontend state is cached

3. **No validation**: No check to ensure `is_approved = TRUE` was actually set in DB after approval

**After Approval** (lines 354-382):
```typescript
const result = await approveKnowledgeBaseFile(fileId, userEmail, 'research-leader');
if (result.success) {
  alert('✅ File approved successfully!');
  
  // Reload pending files
  const files = await listKnowledgeBaseFiles({
    isApproved: false, // ← Should NOT include just-approved file
    ...
  });
```

**Potential Issues:**
- Approval API returns success but DB update didn't commit
- Frontend reloads before DB transaction commits
- File still has `isApproved = FALSE` in local cache

---

## Database Schema Understanding

Based on analysis, here's the complete field structure:

```typescript
interface KnowledgeBaseFile {
  // Core identification
  fileId: string;
  fileName: string;
  filePath: string;
  
  // Scope classification (AI-assigned)
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  
  // File metadata
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  fileSizeBytes: number;
  tags: string[];
  
  // Approval workflow
  isApproved: boolean;          // ⚠️ Can be TRUE, FALSE, or NULL in DB
  approverEmail?: string;
  approvalDate?: string;
  approvalNotes?: string;
  
  // AI Processing
  contentSummary?: string;       // AI-generated summary
  cleaningStatus?: 'uncleaned' | 'cleaned' | 'processed' | 'in_progress';
  cleanedAt?: string;
  cleanedBy?: string;
  
  // Timestamps
  uploadDate: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Usage tracking
  citationCount: number;
  gemInclusionCount: number;
  
  // Additional metadata
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  iterationType?: 'iteration' | 'summary';
  includedHexes?: string[];
}
```

---

## File Lifecycle States

### State 1: Uploaded (Not Processed)
```typescript
{
  isApproved: NULL,              // Not yet reviewed
  contentSummary: NULL,          // Not yet processed by AI
  cleaningStatus: 'uncleaned',   // Raw upload
}
```
**Display:** "Pending Processing" queue

### State 2: Processed (Awaiting Approval)
```typescript
{
  isApproved: FALSE,             // Explicitly not approved yet
  contentSummary: "AI summary...", // AI has processed it
  cleaningStatus: 'processed',   // AI processing complete
}
```
**Display:** "Pending Approval" queue

### State 3: Approved
```typescript
{
  isApproved: TRUE,              // Approved by research leader
  contentSummary: "AI summary...", // Has summary
  cleaningStatus: 'processed',   // Processed
  approverEmail: "leader@company.com",
  approvalDate: "2026-03-01T10:30:00Z",
}
```
**Display:** Available in Enter hex and other workflow steps

### State 4: Rejected (should be deleted, not stored)
Files should be deleted, not kept with `isApproved = FALSE`

---

## Solution Options

### Option A: Comprehensive Fix (RECOMMENDED)
**Scope:** Fix all 6 problems  
**Effort:** ~2-3 hours  
**Impact:** Complete resolution

**Changes:**
1. Update TypeScript interface to handle `isApproved` correctly (nullable)
2. Add proper state separation logic using `cleaningStatus` + `contentSummary` + `isApproved`
3. Fix non-researcher file selection bug
4. Create reusable modal component for file preview
5. Add close button to file preview
6. Fix approved files in pending list with better query logic
7. Add database consistency checks

### Option B: Critical Fixes Only
**Scope:** Fix problems 1, 2, 6 (approval logic)  
**Effort:** ~1 hour  
**Impact:** Core functionality works, UX issues remain

**Changes:**
1. Fix `isApproved` null handling
2. Separate pending queues correctly
3. Fix approved files appearing in pending list

### Option C: Full Refactor
**Scope:** Rebuild approval system from scratch  
**Effort:** ~5-6 hours  
**Impact:** Clean, maintainable codebase

**Changes:**
1. Create dedicated `ApprovalQueue.tsx` component
2. Separate concerns: Upload → Process → Approve
3. Use React Query or similar for data fetching
4. Add optimistic updates
5. Implement proper error handling
6. Create comprehensive test suite

---

## Recommended Approach: Option A

**Step-by-step plan:**

### Step 1: Fix Type Definitions
- Update `KnowledgeBaseFile.isApproved` to `boolean | null`
- Update all places that use this field

### Step 2: Fix Query Logic
- Update `/api/databricks/knowledge-base/list.js` to handle NULL correctly
- Add specific query for "unprocessed" vs "processed but not approved"

### Step 3: Fix State Management
- Update `ResearcherModes.tsx` to use proper state categorization
- Use `cleaningStatus` + `contentSummary` + `isApproved` together

### Step 4: Fix Non-Researcher View
- Debug why approved files can't be selected
- Fix the click handler or filtering logic

### Step 5: Convert Preview to Modal
- Create `FilePreviewModal.tsx` component
- Use in both ResearchView and ResearcherModes
- Add close button and proper UX

### Step 6: Add Database Validation
- After approval, verify file was actually updated
- Add retry logic if needed
- Show error if approval failed

---

## Files That Need Modification

### High Priority:
1. `/components/ResearcherModes.tsx` - Approval queue logic
2. `/api/databricks/knowledge-base/list.js` - Query logic
3. `/utils/databricksAPI.ts` - Type definitions
4. `/components/ProcessWireframe.tsx` - File loading logic

### Medium Priority:
5. `/components/ResearchView.tsx` - Non-researcher view
6. `/api/databricks/knowledge-base/approve.js` - Approval endpoint (add verification)

### New Files to Create:
7. `/components/FilePreviewModal.tsx` - Reusable modal component

---

## Testing Checklist

After fixes, verify:
- [ ] Newly uploaded file shows in "Pending Processing" (not "Pending Approval")
- [ ] After AI processing, file moves to "Pending Approval"
- [ ] After approval, file disappears from pending lists
- [ ] Approved files show in Enter hex for non-researchers
- [ ] Non-researchers can click "Read" on approved files
- [ ] File preview opens in modal with close button
- [ ] Approved files do NOT appear in pending lists
- [ ] Database `is_approved` field is actually TRUE after approval
- [ ] No race conditions between approval and reload

---

## Next Steps

**Ready to proceed with Option A fixes.**

Would you like me to:
1. Start implementing the fixes immediately?
2. Create a more detailed implementation plan first?
3. Focus on specific problems only?
