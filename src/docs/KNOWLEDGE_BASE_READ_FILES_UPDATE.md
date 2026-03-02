# Knowledge Base: Read Files Access for All Researchers

## Update Summary

Added "Read Files" access to the Knowledge Base for all researchers (both research-analysts and research-leaders), not just research leaders.

---

## Changes Made

### 1. Mode Selection Screen (Lines 303-353)

**Before:**
- Only showed 3 mode options if `canApproveResearch` was true
- Only showed 2 mode options (Synthesis and Personas) for regular researchers
- "Read/Edit/Approve" mode was completely hidden from research analysts

**After:**
- Always shows 3 mode options for all researchers
- Third option dynamically changes based on permissions:
  - **Research Leaders:** "Read, Edit, or Approve" (full permissions)
  - **Research Analysts:** "Read Files" (view-only access)

```tsx
{/* Read Files Mode - Available for all researchers, with different permissions */}
<button onClick={() => setMode('read-edit-approve')}>
  <h4>{canApproveResearch ? 'Read, Edit, or Approve' : 'Read Files'}</h4>
  <p>
    {canApproveResearch 
      ? 'Read, edit, or approve any synthesis or persona file'
      : 'View all synthesis and persona files in the knowledge base'
    }
  </p>
  <div>
    {canApproveResearch 
      ? '• View all files • Edit content • Approve/unapprove'
      : '• View all files • Read content • Learn from existing research'
    }
  </div>
</button>
```

---

### 2. Mode Switcher Buttons (Lines 379-400, 1080-1100, 1394-1399)

**Before:**
- Mode switcher only showed "Read/Edit/Approve" button if `canApproveResearch` was true
- Regular researchers couldn't switch to this mode even if they somehow accessed it

**After:**
- Mode switcher always shows the third button for all researchers
- Button text changes dynamically:
  - **Research Leaders:** "Read/Edit/Approve"
  - **Research Analysts:** "Read Files"

```tsx
<button onClick={() => setMode('read-edit-approve')}>
  {canApproveResearch ? 'Read/Edit/Approve' : 'Read Files'}
</button>
```

Applied to:
- **Synthesis Mode** switcher (line 379-400)
- **Personas Mode** switcher (line 1080-1100)
- **Read/Edit/Approve Mode** switcher (line 1394-1399)

---

### 3. Mode Header (Lines 1404-1415)

**Before:**
- Always showed "Read/Edit/Approve Mode" title
- Always showed full permissions description

**After:**
- Title changes based on permissions:
  - **Research Leaders:** "Read/Edit/Approve Mode"
  - **Research Analysts:** "Read Files Mode"
- Description changes based on permissions:
  - **Research Leaders:** "Read, edit, or approve any synthesis or persona file"
  - **Research Analysts:** "View all synthesis and persona files in the knowledge base"

```tsx
<h3>{canApproveResearch ? 'Read/Edit/Approve Mode' : 'Read Files Mode'}</h3>
<p>
  {canApproveResearch 
    ? 'Read, edit, or approve any synthesis or persona file'
    : 'View all synthesis and persona files in the knowledge base'
  }
</p>
```

---

### 4. Edit Section Protection (Lines 1436-1458)

**Before:**
- Edit section was always visible for anyone in this mode
- Research analysts could edit files (not intended behavior)

**After:**
- Edit section only visible when `canApproveResearch` is true
- Research analysts only see the "View File" section (read-only)

```tsx
{/* Edit Section - Only for Research Leaders */}
{canApproveResearch && (
  <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
    <h4>Edit File</h4>
    <textarea ... />
    <button>Save Edits</button>
  </div>
)}
```

**Note:** Approval section was already protected (line 1461).

---

## Permission Matrix

### Research Leaders (`canApproveResearch: true`)

| Feature | Access |
|---------|--------|
| View all files | ✅ Yes |
| Read file content | ✅ Yes |
| Edit files | ✅ Yes |
| Approve/unapprove files | ✅ Yes |
| Mode visible | ✅ Yes - "Read/Edit/Approve" |

### Research Analysts (`canApproveResearch: false`)

| Feature | Access |
|---------|--------|
| View all files | ✅ Yes |
| Read file content | ✅ Yes |
| Edit files | ❌ No |
| Approve/unapprove files | ❌ No |
| Mode visible | ✅ Yes - "Read Files" |

---

## User Experience

### Research Analyst View

1. **Mode Selection:**
   - Sees 3 options: Synthesis, Personas, and **"Read Files"**
   - "Read Files" button shows: "View all synthesis and persona files in the knowledge base"

2. **In Read Files Mode:**
   - Can browse all synthesis and persona files
   - Can click on files to view content
   - Can filter by file type (all/synthesis/personas)
   - **Cannot** edit file content
   - **Cannot** approve/unapprove files

3. **Mode Switcher:**
   - All 3 buttons visible: Synthesis, Personas, **"Read Files"**

### Research Leader View

1. **Mode Selection:**
   - Sees 3 options: Synthesis, Personas, and **"Read, Edit, or Approve"**
   - Full access option shows: "Read, edit, or approve any synthesis or persona file"

2. **In Read/Edit/Approve Mode:**
   - Can browse all files
   - Can view file content
   - **Can** edit file content
   - **Can** approve/unapprove files

3. **Mode Switcher:**
   - All 3 buttons visible: Synthesis, Personas, **"Read/Edit/Approve"**

---

## Benefits

### For Research Analysts
✅ **Access to Knowledge:** Can now view all approved research and personas  
✅ **Learning:** Can study existing synthesis files to learn best practices  
✅ **Consistency:** Can reference existing personas before creating new ones  
✅ **Better Context:** Understand what research exists before starting new synthesis  

### For Research Leaders
✅ **No Change:** Full permissions preserved (edit and approve)  
✅ **Clear Distinction:** UI clearly shows different permission levels  
✅ **Maintained Control:** Only leaders can edit and approve files  

### For Organization
✅ **Knowledge Sharing:** Research is accessible to all researchers  
✅ **Collaboration:** Analysts can learn from leader-approved files  
✅ **Security:** Edit and approve permissions remain restricted  
✅ **Scalability:** More team members can access knowledge base  

---

## Technical Implementation

### Component: `/components/ResearcherModes.tsx`

**Key Changes:**
1. Removed conditional rendering of third mode button
2. Added dynamic text based on `canApproveResearch` prop
3. Wrapped edit functionality in permission check
4. Updated headers and descriptions to reflect permissions

**No breaking changes:** Existing functionality for research leaders unchanged.

---

## Testing Checklist

### Research Analyst
- [ ] Can see "Read Files" option in mode selection
- [ ] Can click "Read Files" and enter the mode
- [ ] Can view list of all files
- [ ] Can click on a file to view its content
- [ ] **Cannot** see the edit section
- [ ] **Cannot** see approve/unapprove buttons
- [ ] Mode switcher shows "Read Files" button

### Research Leader  
- [ ] Can see "Read, Edit, or Approve" option in mode selection
- [ ] Can click and enter the mode
- [ ] Can view list of all files
- [ ] Can click on a file to view its content
- [ ] **Can** see the edit section
- [ ] **Can** edit file content
- [ ] **Can** approve/unapprove files
- [ ] Mode switcher shows "Read/Edit/Approve" button

---

## Related Files

- **Modified:** `/components/ResearcherModes.tsx`
- **Props Used:** `canApproveResearch` (passed from ProcessWireframe.tsx)
- **Permission Source:** `currentTemplate?.permissions?.canApproveResearch`

---

## Future Enhancements

1. **File Comments:** Allow analysts to comment on files (read-only feedback)
2. **Favorites:** Let analysts bookmark useful files for quick access
3. **Search:** Add search functionality to find specific files quickly
4. **Export:** Allow analysts to export files for offline reading
5. **Citations:** Track which files are most referenced by analysts

---

**Updated:** February 11, 2026  
**Feature:** Read Files access for all researchers  
**Impact:** Research analysts can now view knowledge base files  
**Status:** ✅ Complete - Ready for Testing
