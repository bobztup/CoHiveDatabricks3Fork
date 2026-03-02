# Connecting the "Be Interviewed" Button to Backend

## Overview

The "Be Interviewed" feature in the Wisdom hex allows users to have an AI-guided conversation to extract deeper insights. This document explains how to connect the frontend button to your Databricks backend.

---

## Current State

**Frontend:** Button is implemented in `/components/ProcessWireframe.tsx` (lines ~2961-3016)
- Currently shows a placeholder alert
- Marks interview as "scheduled" in local state
- No actual backend call is made

**Backend Infrastructure Available:**
- ✅ AI Agent API: `/api/databricks/ai/agent.js`
- ✅ AI Prompt API: `/api/databricks/ai/prompt.js`
- ✅ Knowledge Base Upload: `/api/databricks/knowledge-base/upload`
- ✅ Conversation Helper Class: `AIConversation` in `/utils/databricksAI.ts`

---

## Implementation Options

### **Option 1: Real-Time Interview (Recommended)**
Conduct the interview immediately in the browser using the existing AI conversation infrastructure.

### **Option 2: Scheduled Interview**
Schedule an interview session for later (email notification, calendar invite).

### **Option 3: Async Interview**
Send interview questions via email/Slack, collect responses, and save to Knowledge Base.

---

## Option 1: Real-Time Interview Implementation

### Step 1: Create Interview Dialog Component

Create `/components/InterviewDialog.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Mic, Send, Loader2, Check } from 'lucide-react';
import { AIConversation } from '../utils/databricksAI';
import { uploadToKnowledgeBase } from '../utils/databricksAPI';
import { getWorkspaceHost } from '../utils/databricksAuth';

interface InterviewDialogProps {
  open: boolean;
  onClose: () => void;
  insightType: 'Brand' | 'Category' | 'General';
  brand?: string;
  projectType?: string;
  userEmail: string;
  userRole: string;
}

export function InterviewDialog({
  open,
  onClose,
  insightType,
  brand,
  projectType,
  userEmail,
  userRole
}: InterviewDialogProps) {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 5;

  useEffect(() => {
    if (open && !conversation) {
      // Initialize conversation with interview system prompt
      const systemPrompt = `You are an expert interviewer conducting a wisdom extraction session. 
Your goal is to help the user articulate ${insightType.toLowerCase()} insights through thoughtful questions.

Context:
- Insight Type: ${insightType}
${brand ? `- Brand: ${brand}` : ''}
${projectType ? `- Project Type: ${projectType}` : ''}

Interview Guidelines:
1. Ask open-ended questions that encourage detailed responses
2. Follow up on interesting points to go deeper
3. Help the user articulate tacit knowledge
4. Limit to ${maxQuestions} questions total
5. After ${maxQuestions} questions, summarize the key insights

Start by introducing yourself and asking the first question.`;

      const conv = new AIConversation(userEmail, userRole, systemPrompt);
      setConversation(conv);
      
      // Get first question
      startInterview(conv);
    }
  }, [open]);

  const startInterview = async (conv: AIConversation) => {
    setIsLoading(true);
    try {
      const response = await conv.ask('Please introduce yourself and ask your first question.');
      setMessages([{ role: 'assistant', content: response }]);
      setQuestionCount(1);
    } catch (err) {
      console.error('Failed to start interview:', err);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !conversation || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await conversation.ask(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      const newCount = questionCount + 1;
      setQuestionCount(newCount);

      // Check if interview should end
      if (newCount >= maxQuestions) {
        setInterviewComplete(true);
      }
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToKnowledgeBase = async () => {
    if (!conversation) return;

    setIsLoading(true);
    try {
      // Format conversation as text
      const transcript = messages
        .map(msg => `${msg.role === 'user' ? 'You' : 'Interviewer'}: ${msg.content}`)
        .join('\n\n');

      // Create file
      const fileName = `Wisdom_${insightType}_Interview_${Date.now()}.txt`;
      const file = new File([transcript], fileName, { type: 'text/plain' });

      // Upload to Knowledge Base
      const result = await uploadToKnowledgeBase({
        file,
        scope: brand ? 'brand' : projectType ? 'category' : 'general',
        category: projectType,
        brand: brand,
        fileType: 'Wisdom',
        insightType: insightType,
        inputMethod: 'Interview',
        userEmail,
        userRole,
        contentSummary: `AI-guided interview about ${insightType.toLowerCase()} insights`
      });

      if (result.success) {
        alert('✓ Interview transcript saved to Knowledge Base!');
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save interview:', err);
      alert('Failed to save interview transcript. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            🎤 AI Interview: {insightType} Insights
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Question {questionCount} of {maxQuestions}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 border rounded">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!interviewComplete ? (
          <div className="flex gap-2 pt-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your response..."
              className="flex-1 border rounded p-2"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="pt-4 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Interview complete! Your insights have been captured.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button
                onClick={handleSaveToKnowledgeBase}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Knowledge Base'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

### Step 2: Update ProcessWireframe.tsx

Add state for interview dialog:

```typescript
// Add at top with other state
const [showInterviewDialog, setShowInterviewDialog] = useState(false);
const [interviewContext, setInterviewContext] = useState<{
  insightType: 'Brand' | 'Category' | 'General';
  brand?: string;
  projectType?: string;
}>({ insightType: 'General' });
```

Import the component:

```typescript
import { InterviewDialog } from './InterviewDialog';
```

Update the "Be Interviewed" button handler (around line 2980):

```typescript
// Be Interviewed
if (inputMethod === 'Interview') {
  return (
    <div key={idx} className="mb-2">
      <label className="block text-gray-900 mb-1 flex items-start justify-between">
        <span>{idx + 1}. Share Your Wisdom</span>
        {hasResponse && (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        )}
      </label>
      
      <div className="space-y-4 border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl">🎤</span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-2">AI Interview Session</h3>
            <p className="text-sm text-gray-700 mb-3">
              Our AI interviewer will ask you questions about your {insightType.toLowerCase()} insights. 
              This conversational approach helps extract deeper wisdom through guided discussion.
            </p>
            
            {!hasResponse ? (
              <button
                onClick={() => {
                  // Check authentication
                  if (!isDatabricksAuthenticated) {
                    alert('⚠️ Please sign in to Databricks before starting an interview.\\n\\nClick the \"Sign In\" button in the header to authenticate.');
                    setShowLoginModal(true);
                    return;
                  }

                  // Set interview context
                  setInterviewContext({
                    insightType: insightType as 'Brand' | 'Category' | 'General',
                    brand: brand || undefined,
                    projectType: projectType || undefined
                  });
                  
                  // Open interview dialog
                  setShowInterviewDialog(true);
                  
                  // Mark as in progress
                  handleResponseChange(idx, 'Interview in progress');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Interview
              </button>
            ) : (
              <div className="bg-white border border-purple-200 rounded p-3">
                <p className="text-sm text-purple-700">
                  {responses[activeStepId]?.[idx]}
                </p>
                <button
                  onClick={() => {
                    handleResponseChange(idx, '');
                  }}
                  className="mt-2 text-sm text-purple-600 hover:underline"
                >
                  Start new interview
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-purple-200 pt-3">
          <p className="text-xs text-gray-600">
            <strong>How it works:</strong> The AI interviewer adapts questions based on your responses, 
            helping you articulate insights you might not have considered. Sessions typically last 10-15 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
```

Add the dialog component at the end before closing tags:

```typescript
{/* Interview Dialog */}
<InterviewDialog
  open={showInterviewDialog}
  onClose={() => {
    setShowInterviewDialog(false);
    // Update response to show completion
    if (responses[activeStepId]?.[2]) {
      handleResponseChange(2, 'Interview completed and saved');
    }
  }}
  insightType={interviewContext.insightType}
  brand={interviewContext.brand}
  projectType={interviewContext.projectType}
  userEmail={currentUser?.email || 'user@example.com'}
  userRole={currentTemplate?.role || 'user'}
/>
```

---

### Step 3: Verify API Routes Exist

Check that these API endpoints are working:

1. **`/api/databricks/ai/prompt.js`** - For AI conversation
2. **`/api/databricks/knowledge-base/upload`** - For saving transcript

If not created yet, create them based on the existing patterns in `/api/databricks/ai/agent.js`.

---

## Option 2: Scheduled Interview (Email/Calendar)

### Step 1: Create Interview Scheduling API

Create `/api/databricks/interview/schedule.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userEmail,
    userName,
    insightType,
    brand,
    projectType,
    preferredTime,
    accessToken,
    workspaceHost
  } = req.body;

  try {
    // 1. Store interview request in Databricks table
    // 2. Send confirmation email to user
    // 3. Create calendar event (optional)
    // 4. Return confirmation

    res.status(200).json({
      success: true,
      interviewId: `INT-${Date.now()}`,
      scheduledTime: preferredTime,
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    console.error('Failed to schedule interview:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Step 2: Create Email Template

You'll need to integrate with an email service (SendGrid, AWS SES, etc.) to send:
- Interview confirmation
- Interview link (for video call or chat interface)
- Reminder before interview
- Thank you with transcript after interview

---

## Option 3: Async Interview (Email Questions)

### Implementation

1. Generate interview questions using AI
2. Send questions via email
3. User responds via email/form
4. Collect responses
5. Save to Knowledge Base

Create `/api/databricks/interview/generate-questions.js`:

```javascript
export default async function handler(req, res) {
  const { insightType, brand, projectType, accessToken, workspaceHost } = req.body;

  try {
    // Use Databricks AI to generate tailored questions
    const prompt = `Generate 5 thoughtful interview questions to extract ${insightType} insights about ${brand || 'the category'}.`;
    
    // Call Databricks Model Serving API
    const questions = await generateQuestions(prompt, accessToken, workspaceHost);
    
    res.status(200).json({
      success: true,
      questions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## Testing the Integration

### 1. Test Real-Time Interview (Option 1)

```bash
# 1. User clicks "Start Interview" in Wisdom hex
# 2. Interview dialog opens
# 3. AI asks first question
# 4. User types response
# 5. AI asks follow-up questions (5 total)
# 6. User clicks "Save to Knowledge Base"
# 7. Transcript uploaded to Databricks
```

### 2. Verify Knowledge Base Upload

Check that interview transcripts appear in:
- Databricks Unity Catalog
- Knowledge Base with fileType: 'Wisdom'
- inputMethod: 'Interview'

### 3. Test Error Handling

- User not authenticated → Show login modal
- API failure → Show error message, allow retry
- Network issues → Queue for retry

---

## Production Considerations

### Security
- ✅ Already using OAuth for Databricks authentication
- ✅ API routes should validate tokens
- ⚠️ Rate limit interview sessions (prevent abuse)

### Performance
- Consider caching system prompts
- Stream AI responses for better UX
- Limit concurrent interview sessions per user

### Analytics
- Track interview completion rates
- Measure insight quality from interviews vs other methods
- A/B test different interview approaches

---

## Summary

**Easiest Path:** Option 1 (Real-Time Interview)
- Uses existing AI infrastructure
- No external dependencies
- Immediate user feedback
- Works entirely in browser

**Next Steps:**
1. Create `InterviewDialog.tsx` component
2. Add state to `ProcessWireframe.tsx`
3. Update button handler to open dialog
4. Test with real Databricks AI endpoint
5. Deploy and gather feedback

**Time Estimate:** 2-4 hours for Option 1 implementation

---

## Questions?

If you need help with:
- Setting up Databricks Model Serving endpoints
- Configuring AI system prompts
- Testing the interview flow
- Optimizing conversation quality

Let me know and I can provide more specific guidance!