# User Email Authentication - Real User Identity

## Overview

All hardcoded `user@company.com` placeholders have been replaced with the **actual authenticated user's email** from Databricks OAuth. This ensures proper user attribution and tracking across all Knowledge Base operations.

---

## What Changed

### Before (Hardcoded):
```typescript
userEmail: 'user@company.com' // Placeholder
```

### After (Real User):
```typescript
userEmail: userEmail // From Databricks OAuth session
```

---

## Implementation

### 1. Enhanced Databricks Session

**File:** `/utils/databricksAuth.ts`

**Added to Session:**
```typescript
interface DatabricksSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  workspaceHost: string;
  userEmail?: string; // ✅ NEW: User's email address
  userName?: string;  // ✅ NEW: User's display name
}
```

### 2. New Functions to Fetch User Info

**`fetchCurrentUser()`**
- Calls Databricks SCIM API: `/api/2.0/preview/scim/v2/Me`
- Extracts user email and display name
- Updates session with user info
- Caches in sessionStorage

**`getCurrentUserEmail()`**
- Returns cached email from session if available
- Otherwise fetches from Databricks API
- Fallback: `'unknown@databricks.com'`

**`getCurrentUserName()`**
- Returns cached name from session if available
- Otherwise fetches from Databricks API
- Fallback: `'Unknown User'`

### 3. Component State Management

**ProcessWireframe.tsx:**
```typescript
const [userEmail, setUserEmail] = useState<string>('unknown@databricks.com');

useEffect(() => {
  const fetchUserEmail = async () => {
    if (isDatabricksAuthenticated) {
      const email = await getCurrentUserEmail();
      setUserEmail(email);
    }
  };
  fetchUserEmail();
}, [isDatabricksAuthenticated]);
```

**ResearcherModes.tsx:**
```typescript
const [userEmail, setUserEmail] = useState<string>('unknown@databricks.com');

useEffect(() => {
  const fetchUserEmail = async () => {
    if (isAuthenticated()) {
      const email = await getCurrentUserEmail();
      setUserEmail(email);
    }
  };
  fetchUserEmail();
}, []);
```

---

## Where User Email Is Used

### 1. **Knowledge Base Uploads**
**Wisdom Hex:**
```typescript
await uploadToKnowledgeBase({
  file: wisdomFile,
  fileType: 'Wisdom',
  userEmail: userEmail, // ✅ Real user
  userRole: userRole,
  // ...
});
```

**Iteration Files:**
```typescript
await uploadToKnowledgeBase({
  file: iterationFile,
  fileType: 'Findings',
  userEmail: userEmail, // ✅ Real user
  userRole: userRole,
  // ...
});
```

**Interview Transcripts:**
```typescript
await uploadToKnowledgeBase({
  file: transcriptFile,
  fileType: 'Wisdom',
  inputMethod: 'Interview',
  userEmail: userEmail, // ✅ Real user
  userRole: userRole,
  // ...
});
```

### 2. **Researcher Modes**
**Synthesis Uploads:**
```typescript
await uploadToKnowledgeBase({
  file: synthesisFile,
  fileType: 'Synthesis',
  userEmail: userEmail, // ✅ Real user
  userRole: canApproveResearch ? 'research-leader' : 'research-analyst',
  // ...
});
```

**File Approval:**
```typescript
await approveKnowledgeBaseFile(
  fileId,
  userEmail, // ✅ Real user
  userRole,
  approvalNotes
);
```

**File Deletion:**
```typescript
await deleteKnowledgeBaseFile(
  fileId,
  userEmail, // ✅ Real user
  userRole
);
```

**Metadata Updates:**
```typescript
await updateKnowledgeBaseMetadata(
  fileId,
  { tags: newTags },
  userEmail, // ✅ Real user
  userRole
);
```

### 3. **AI Operations**
**AI Agent Runs:**
```typescript
await runAIAgent({
  prompt: userPrompt,
  userEmail: userEmail, // ✅ Real user
  userRole: userRole,
  // ...
});
```

**AI Prompt Execution:**
```typescript
await executeAIPrompt({
  prompt: userPrompt,
  userEmail: userEmail, // ✅ Real user
  userRole: userRole,
  // ...
});
```

---

## Benefits

### ✅ **Proper Attribution**
- All files tagged with actual uploader
- Audit trail shows real user actions
- Approval workflow tracks real approvers

### ✅ **Security & Compliance**
- No anonymous uploads
- User accountability for all operations
- Compliance with data governance policies

### ✅ **Usage Tracking**
- Track which users contribute most
- Identify power users
- Analyze adoption by user

### ✅ **Collaboration**
- See who uploaded each file
- Contact file owners directly
- Credit contributors appropriately

---

## User Info Flow

```
┌─────────────────────────────────────────────────────────┐
│            User Signs In (OAuth)                         │
│                                                           │
│  1. User authenticates with Databricks                   │
│  2. Access token stored in session                       │
│  3. App calls fetchCurrentUser()                         │
│  4. SCIM API returns user profile                        │
│  5. Email & name cached in session                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│          Components Fetch User Email                     │
│                                                           │
│  ProcessWireframe: useEffect → getCurrentUserEmail()     │
│  ResearcherModes: useEffect → getCurrentUserEmail()      │
│                                                           │
│  Email stored in component state                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         All Operations Use Real Email                    │
│                                                           │
│  • File uploads → uploadedBy = userEmail                 │
│  • File approvals → approverEmail = userEmail            │
│  • AI operations → userEmail in audit log                │
│  • Metadata updates → updatedBy = userEmail              │
└─────────────────────────────────────────────────────────┘
```

---

## SCIM API Details

**Endpoint:**
```
GET https://{workspaceHost}/api/2.0/preview/scim/v2/Me
```

**Headers:**
```json
{
  "Authorization": "Bearer {accessToken}",
  "Content-Type": "application/json"
}
```

**Response:**
```json
{
  "emails": [
    { "value": "user@company.com", "primary": true }
  ],
  "userName": "user@company.com",
  "displayName": "John Doe",
  "name": {
    "formatted": "John Doe",
    "givenName": "John",
    "familyName": "Doe"
  }
}
```

**Email Extraction:**
```typescript
const email = userData.emails?.[0]?.value || 
              userData.userName || 
              'unknown@databricks.com';
```

---

## Fallback Behavior

### If User Not Authenticated:
```typescript
userEmail = 'unknown@databricks.com'
```

### If SCIM API Fails:
```typescript
userEmail = 'unknown@databricks.com'
```

### If Session Exists But No Email:
```typescript
// Fetch from SCIM API
const userInfo = await fetchCurrentUser();
userEmail = userInfo?.email || 'unknown@databricks.com';
```

---

## Files Modified

### Core Auth System:
- **`/utils/databricksAuth.ts`**
  - Added `userEmail` and `userName` to `DatabricksSession`
  - Added `fetchCurrentUser()` function
  - Added `getCurrentUserEmail()` function
  - Added `getCurrentUserName()` function

### Components:
- **`/components/ProcessWireframe.tsx`**
  - Added `userEmail` state variable
  - Added useEffect to fetch user email
  - Replaced 4 instances of `'user@company.com'`
  - Imported `getCurrentUserEmail` from auth

- **`/components/ResearcherModes.tsx`**
  - Added `userEmail` state variable
  - Added useEffect to fetch user email
  - Replaced 6 instances of `'user@company.com'`
  - Imported `getCurrentUserEmail` from auth

---

## Testing Checklist

After this change, verify:

- [ ] User email fetched on sign-in
- [ ] Email cached in session
- [ ] Wisdom uploads show real user
- [ ] Iteration saves show real user
- [ ] Interview transcripts show real user
- [ ] Synthesis uploads show real user
- [ ] File approvals show real user
- [ ] File deletions show real user
- [ ] Metadata updates show real user
- [ ] AI operations log real user
- [ ] Fallback works if SCIM fails
- [ ] No console errors

---

## Future Enhancements

### Display User Info in UI
```typescript
// Show current user in header
const userName = await getCurrentUserName();
<div className="user-profile">
  Signed in as: {userName} ({userEmail})
</div>
```

### User-Specific Filters
```typescript
// Filter files by current user
const myFiles = await listKnowledgeBaseFiles({
  uploadedBy: userEmail,
});
```

### User Statistics
```typescript
// Show user contribution stats
const stats = {
  filesUploaded: files.filter(f => f.uploadedBy === userEmail).length,
  filesApproved: files.filter(f => f.approverEmail === userEmail).length,
  citationCount: files.reduce((sum, f) => 
    f.uploadedBy === userEmail ? sum + f.citationCount : sum, 0
  ),
};
```

---

## Summary

✅ **All hardcoded emails removed**  
✅ **Real user email from Databricks OAuth**  
✅ **Cached in session for performance**  
✅ **Proper attribution for all operations**  
✅ **Fallback handling for errors**  
✅ **Consistent across all components**

**Status:** ✅ **Using Real Authenticated User Email**

The application now properly attributes all actions to the authenticated Databricks user, ensuring accountability, security, and accurate usage tracking!
