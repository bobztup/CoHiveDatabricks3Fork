# Assessment Modal Integration - Change Summary

## 🎯 What Was Fixed

The bug was that **Luminaries** (and other persona hexes) were not receiving Knowledge Base files, causing the AssessmentModal to fail with "No matching knowledge base files found."

---

## 📝 The Single Change Made

### **File: `/components/ProcessWireframe.tsx`**

**Location:** Inside the `handleHexExecution` function (around line 905-916)

**Before (BROKEN):**
```typescript
// Determine whether selectedFiles are persona IDs or KB file names
const isPersonaHex = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'].includes(activeStepId);

// Open the assessment modal with real AI
setAssessmentModalProps({
  hexId: activeStepId,
  hexLabel: currentContent?.title || activeStepId,
  assessmentType: assessmentType[0] || 'unified',
  selectedPersonas: isPersonaHex ? selectedFiles : [],
  kbFileNames: isPersonaHex ? [] : selectedFiles,  // ❌ Empty array for personas!
  userSolution: assessmentType.includes('assess') ? assessment : '',
});
setAssessmentModalOpen(true);
```

**After (FIXED):**
```typescript
// Determine whether selectedFiles are persona IDs or KB file names
const isPersonaHex = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'].includes(activeStepId);

// Open the assessment modal with real AI
setAssessmentModalProps({
  hexId: activeStepId,
  hexLabel: currentContent?.title || activeStepId,
  assessmentType: assessmentType[0] || 'unified',
  selectedPersonas: isPersonaHex ? selectedFiles : [],
  kbFileNames: isPersonaHex ? selectedResearchFiles : selectedFiles,  // ✅ Use KB files from Enter!
  userSolution: assessmentType.includes('assess') ? assessment : '',
});
setAssessmentModalOpen(true);
```

**What Changed:**
- Line changed: `kbFileNames: isPersonaHex ? [] : selectedFiles,`
- Changed to: `kbFileNames: isPersonaHex ? selectedResearchFiles : selectedFiles,`
- **Result:** Persona hexes now receive the KB files that were selected in the Enter hex

---

## 📂 Files Involved in the Data Flow

### **1. `/components/ProcessWireframe.tsx`** (Main orchestrator)
**Role:** Manages state and coordinates all hexes

**Key State Variables:**
```typescript
const [selectedResearchFiles, setSelectedResearchFiles] = useState<string[]>([]);
const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
const [assessmentModalProps, setAssessmentModalProps] = useState<{
  hexId: string;
  hexLabel: string;
  assessmentType: string;
  selectedPersonas: string[];
  kbFileNames: string[];
  userSolution: string;
} | null>(null);
const [researchFiles, setResearchFiles] = useState<ResearchFile[]>([]);
```

**Key Functions:**
- `handleHexExecution()` - Prepares data and opens AssessmentModal ← **This is where the fix was made**
- `getApprovedResearchFiles()` - Gets KB files for a brand/project
- `handleResponseChange()` - Updates user responses

**Responsibilities:**
- Stores KB file selections from Enter in `selectedResearchFiles` state
- Passes correct data to AssessmentModal
- Manages research files list

---

### **2. `/components/CentralHexView.tsx`** (Hex UI)
**Role:** Provides the 3-step workflow UI for each hex

**For Persona Hexes (Luminaries, Consumers, etc.):**
- **Step 1:** Select personas → stored in `selectedFiles` prop
- **Step 2:** Choose assessment type (Assess/Recommend/Unified)
- **Step 3:** Enter assessment text → calls `onExecute(selectedFiles, assessmentType, assessment)`

**For Research Hexes (Panelist, Competitors, etc.):**
- **Step 1:** Select KB files → stored in `selectedFiles` prop
- **Step 2:** Choose assessment type
- **Step 3:** Enter assessment text → calls `onExecute(selectedFiles, assessmentType, assessment)`

**Props it receives:**
```typescript
interface CentralHexViewProps {
  hexId: string;
  responses: { [questionIndex: number]: string };
  onResponseChange: (questionIndex: number, value: string) => void;
  onExecute: (
    selectedFiles: string[],
    assessmentType: string[],
    assessment: string
  ) => void;
  researchFiles: ResearchFile[];
  // ... other props
}
```

---

### **3. `/components/AssessmentModal.tsx`** (AI Assessment UI)
**Role:** Full-screen modal that runs real Databricks AI assessments

**Props it receives:**
```typescript
interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  hexId: string;
  hexLabel: string;
  brand: string;
  projectType: string;
  assessmentType: string;
  selectedPersonas: string[];      // Persona IDs (e.g., ['ogilvy', 'bernbach'])
  kbFileNames: string[];           // KB file names (e.g., ['Nike_Research.pdf'])
  userSolution: string;            // User's assessment text
  researchFiles: ResearchFile[];   // Full list of available files
  onSaveRecommendation: (recommendation: string, hexId: string) => void;
}
```

**What it does:**
1. **Maps KB file names to full file objects:**
   ```typescript
   const kbFiles = kbFileNames
     .map(name => researchFiles.find(f => f.fileName === name))
     .filter((f): f is ResearchFile => Boolean(f))
     .map(f => ({
       fileId: f.id,
       fileName: f.fileName,
       content: f.content || `[Content pending for ${f.fileName}]`,
     }));
   ```

2. **Validates KB files exist:**
   ```typescript
   if (kbFiles.length === 0) {
     throw new Error('No matching knowledge base files found. Please re-select files and try again.');
   }
   ```

3. **Calls Databricks API:**
   ```typescript
   const response = await fetch('/api/databricks/assessment/run', {
     method: 'POST',
     body: JSON.stringify({
       hexId,
       hexLabel,
       brand,
       projectType,
       assessmentTypes: [assessmentType],
       userSolution,
       selectedPersonas,  // Persona IDs
       kbFiles,           // File content
       userEmail,
       accessToken,
       workspaceHost,
     }),
   });
   ```

4. **Displays streaming AI rounds:**
   - Shows loading state with progress indicator
   - Displays each round of AI responses
   - Allows text selection → "Save as Gem 💎"
   - Tracks cited files

---

### **4. `/api/databricks/assessment/run.js`** (Backend API)
**Role:** Processes assessment requests and returns AI rounds

**Located at:** `/api/databricks/assessment/run.js`

**What it receives:**
```javascript
{
  hexId: string,
  hexLabel: string,
  brand: string,
  projectType: string,
  assessmentTypes: string[],
  userSolution: string,
  selectedPersonas: string[],    // Persona IDs
  kbFiles: Array<{               // File content
    fileId: string,
    fileName: string,
    content: string
  }>,
  userEmail: string,
  accessToken: string,
  workspaceHost: string
}
```

**What it returns:**
```javascript
{
  rounds: Array<{
    roundNumber: number,
    title: string,
    content: string,
    citedFiles?: string[]
  }>,
  citedFiles: Array<{
    fileId: string,
    fileName: string
  }>
}
```

---

### **5. `/api/databricks/gems/save.js`** (Gem Saver)
**Role:** Saves highlighted text as "gems" to Databricks

**Located at:** `/api/databricks/gems/save.js`

**What it receives:**
```javascript
{
  gemText: string,
  hexId: string,
  hexLabel: string,
  roundNumber: number,
  brand: string,
  projectType: string,
  citedFiles: string[],
  userEmail: string,
  accessToken: string,
  workspaceHost: string
}
```

---

### **6. `/utils/databricksAPI.ts`** (API Utilities)
**Role:** Client-side utilities for Databricks operations

**Key Functions:**
- `saveGem()` - Saves gems via `/api/databricks/gems/save`
- `uploadToKnowledgeBase()` - Uploads files to Databricks
- `listKnowledgeBaseFiles()` - Lists files from Databricks
- `downloadFile()` - Downloads file content from Databricks

---

### **7. `/utils/databricksAuth.ts`** (Authentication)
**Role:** Manages Databricks OAuth authentication

**Key Functions:**
- `isAuthenticated()` - Checks if user is logged in
- `getValidSession()` - Gets valid access token
- `getCurrentUserEmail()` - Gets user's email

---

## 🔄 Complete Data Flow

### **Step 1: Enter Hex (KB File Selection)**
```
User in Enter Hex
  ↓
Selects Brand: "Nike"
Selects Project Type: "Creative Messaging"
Selects Research Files: ["Nike_Research.pdf", "Creative_Brief.docx"]
  ↓
Checkboxes update ProcessWireframe state:
  setSelectedResearchFiles(["Nike_Research.pdf", "Creative_Brief.docx"])
  ↓
State persists in ProcessWireframe component
```

### **Step 2: Luminaries Hex (Persona Selection)**
```
User clicks Luminaries hex
  ↓
ProcessWireframe renders CentralHexView
  Props: hexId="Luminaries", researchFiles=[...], selectedResearchFiles=[...]
  ↓
CentralHexView Step 1: User selects personas
  selectedFiles = ["ogilvy", "bernbach", "burnett"]
  ↓
CentralHexView Step 2: User selects assessment type
  assessmentType = ["unified"]
  ↓
CentralHexView Step 3: User enters assessment text
  assessment = "Evaluate these creative concepts"
  ↓
User clicks "Execute Process"
```

### **Step 3: Execute (The Fix)**
```
CentralHexView calls:
  onExecute(selectedFiles, assessmentType, assessment)
  ↓
ProcessWireframe.handleHexExecution() receives:
  selectedFiles = ["ogilvy", "bernbach", "burnett"]  // persona IDs
  assessmentType = ["unified"]
  assessment = "Evaluate these creative concepts"
  ↓
Determines this is a persona hex:
  isPersonaHex = true
  ↓
✅ FIX APPLIED HERE:
  selectedPersonas = selectedFiles = ["ogilvy", "bernbach", "burnett"]
  kbFileNames = selectedResearchFiles = ["Nike_Research.pdf", "Creative_Brief.docx"]
  ↓
Opens AssessmentModal with:
  setAssessmentModalProps({
    hexId: "Luminaries",
    hexLabel: "Luminaries",
    assessmentType: "unified",
    selectedPersonas: ["ogilvy", "bernbach", "burnett"],
    kbFileNames: ["Nike_Research.pdf", "Creative_Brief.docx"],  ← FROM ENTER!
    userSolution: "Evaluate these creative concepts"
  })
  setAssessmentModalOpen(true)
```

### **Step 4: AssessmentModal Execution**
```
AssessmentModal receives props
  ↓
Maps kbFileNames to actual file objects:
  kbFiles = [
    { fileId: "1", fileName: "Nike_Research.pdf", content: "base64..." },
    { fileId: "2", fileName: "Creative_Brief.docx", content: "base64..." }
  ]
  ↓
Validates kbFiles.length > 0 ✅
  ↓
Calls /api/databricks/assessment/run with:
  {
    selectedPersonas: ["ogilvy", "bernbach", "burnett"],
    kbFiles: [{ fileId, fileName, content }, ...],
    userSolution: "Evaluate these creative concepts",
    ...
  }
  ↓
API returns rounds:
  {
    rounds: [
      { roundNumber: 1, title: "Ogilvy's Assessment", content: "..." },
      { roundNumber: 2, title: "Bernbach's Assessment", content: "..." },
      { roundNumber: 3, title: "Burnett's Assessment", content: "..." },
      { roundNumber: 4, title: "Unified Response", content: "..." }
    ],
    citedFiles: ["Nike_Research.pdf", "Creative_Brief.docx"]
  }
  ↓
AssessmentModal displays rounds with streaming animation
  ↓
User can highlight text → "Save as Gem 💎"
  ↓
Gems saved to Databricks via /api/databricks/gems/save
```

---

## 🗂️ State Management

### **ProcessWireframe State (Parent Component)**
```typescript
// KB files selected in Enter hex - PERSISTS across hex navigation
selectedResearchFiles: string[] = ["Nike_Research.pdf", "Creative_Brief.docx"]

// Full list of all research files (with content)
researchFiles: ResearchFile[] = [
  { id: "1", fileName: "Nike_Research.pdf", content: "base64...", ... },
  { id: "2", fileName: "Creative_Brief.docx", content: "base64...", ... }
]

// Assessment modal props
assessmentModalProps: {
  hexId: "Luminaries",
  hexLabel: "Luminaries",
  assessmentType: "unified",
  selectedPersonas: ["ogilvy", "bernbach", "burnett"],
  kbFileNames: ["Nike_Research.pdf", "Creative_Brief.docx"],  ← THE FIX
  userSolution: "Evaluate these creative concepts"
}

// Modal visibility
assessmentModalOpen: boolean = true
```

### **CentralHexView State (Child Component)**
```typescript
// For Luminaries: persona IDs selected
selectedFiles: string[] = ["ogilvy", "bernbach", "burnett"]

// Assessment type choices
assessmentType: string[] = ["unified"]

// User's assessment text
assessment: string = "Evaluate these creative concepts"
```

---

## ✅ Verification Checklist

To verify the fix is working:

1. ✅ **Enter Hex:**
   - [ ] Select Brand
   - [ ] Select Project Type
   - [ ] Select at least one Research File (KB file)
   - [ ] Verify `selectedResearchFiles` state is populated

2. ✅ **Luminaries Hex:**
   - [ ] Select at least one persona
   - [ ] Choose assessment type
   - [ ] Enter assessment text
   - [ ] Click "Execute Process"

3. ✅ **AssessmentModal:**
   - [ ] Modal opens (full screen)
   - [ ] No error: "No matching knowledge base files found"
   - [ ] Loading state shows
   - [ ] AI rounds appear one by one
   - [ ] Can highlight text → "Save as Gem 💎" button appears
   - [ ] Cited files shown at bottom

4. ✅ **Console:**
   - [ ] No errors in browser console
   - [ ] API call to `/api/databricks/assessment/run` succeeds
   - [ ] Response contains `rounds` array
   - [ ] Response contains `citedFiles` array

---

## 🐛 What Was Broken Before

**Symptom:** "No matching knowledge base files found" error

**Root Cause:**
```typescript
// OLD CODE (Line 913 in ProcessWireframe.tsx)
kbFileNames: isPersonaHex ? [] : selectedFiles,
//                          ^^
//                          Empty array for persona hexes!
```

**Why it failed:**
1. `selectedFiles` in Luminaries contains **persona IDs**, not KB file names
2. For persona hexes, code was passing `[]` for `kbFileNames`
3. AssessmentModal tried to map `[]` to file objects → got empty array
4. Threw error: "No matching knowledge base files found"

**Why personas need KB files:**
- Personas can't assess nothing!
- They need documents/files to evaluate
- KB files provide the context for assessment

---

## 🎯 Summary

**ONE LINE CHANGE:**
```diff
- kbFileNames: isPersonaHex ? [] : selectedFiles,
+ kbFileNames: isPersonaHex ? selectedResearchFiles : selectedFiles,
```

**RESULT:**
- ✅ Persona hexes (Luminaries, Consumers, etc.) now receive KB files from Enter
- ✅ AssessmentModal can properly map file names to file objects
- ✅ Databricks API receives both personas AND files
- ✅ Real AI assessments work for persona hexes!

**FILES INVOLVED:**
1. `/components/ProcessWireframe.tsx` - ⚡ **FIXED HERE**
2. `/components/CentralHexView.tsx` - Persona selection UI
3. `/components/AssessmentModal.tsx` - AI assessment modal
4. `/api/databricks/assessment/run.js` - Backend API
5. `/api/databricks/gems/save.js` - Gem saver API
6. `/utils/databricksAPI.ts` - API utilities
7. `/utils/databricksAuth.ts` - Authentication

---

**Last Updated:** December 2024
