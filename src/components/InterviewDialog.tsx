import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Check, Mic, MicOff } from 'lucide-react';
import { SpinHex } from './LoadingGem';
import { AIConversation } from '../utils/databricksAI';

interface InterviewDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  userEmail: string;
  userRole: string;
  onSaveTranscript: (transcript: string, fileName: string) => Promise<boolean>;
  selectedMicDeviceId?: string;
}

export function InterviewDialog({
  open,
  onClose,
  onComplete,
  userEmail,
  userRole,
  onSaveTranscript,
  selectedMicDeviceId,
}: InterviewDialogProps) {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [interviewTopic, setInterviewTopic] = useState<string>('');
  const [interviewSummary, setInterviewSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Browser environment check
  const isBrowser = typeof window !== 'undefined';
  const hasSpeechRecognition = isBrowser && (
    ('SpeechRecognition' in window) || 
    ('webkitSpeechRecognition' in window)
  );

  useEffect(() => {
    if (open && !conversation) {
      initializeFlexibleInterview();
    }
  }, [open, conversation, userEmail, userRole]);

  const initializeFlexibleInterview = async () => {
    try {
      // System prompt for flexible, professional interview
      const systemPrompt = `You are a professional interviewer conducting a flexible, conversational interview with company employees.

**Interview Purpose:**
The AI agent is designed to conduct interviews with individuals across the company.
While it most frequently interviews members of the marketing or creative teams, it may
also engage with employees from retail, who have direct customer interactions, or the
CEO.

**Content Guidelines:**
Interviewees are encouraged to share information or ideas, which may range from
highly specific and concrete to imaginative, broad, or even fanciful. The format is
flexible, accommodating a wide variety of input and perspectives.

**Interview Style:**
The interviewer maintains a professional and friendly demeanor throughout the process,
ensuring the conversation is constructive without being overly flattering.

**Context:**
- Interviewee Role: ${userRole}
- Interviewee: ${userEmail}

**Your Approach:**
1. Start by asking: "What would you like to share your wisdom on?"
2. Once they've identified their topic, explore it through thoughtful questions that adapt to the subject matter
3. Potential areas to explore (when relevant to their topic):
   - Key characteristics of the topic
   - Greatest strengths and weaknesses (if appropriate)
   - Core customer/audience (if it's a brand or product)
   - Customer characteristics (if applicable)
   - Current needs or gaps
   - Opportunities for marketing or business development
   - Specific recommendations
4. Ask these areas naturally in conversational flow - don't use a checklist format
5. Be adaptive - follow interesting threads and explore unexpected insights
6. Only ask about areas that are relevant to their chosen topic
7. Maintain a professional yet warm tone - never overly flattering
8. Let the conversation flow naturally - there's no fixed question count or time limit
9. Accept all types of input: specific data, creative ideas, broad strategies, or imaginative concepts

**Starting the Interview:**
Begin with a brief introduction (1-2 sentences) and ask: "What would you like to share your wisdom on?"`;

      const conv = new AIConversation(userEmail, userRole, systemPrompt);
      setConversation(conv);
      
      // Get first question
      await startInterview(conv);
    } catch (err) {
      console.error('Failed to initialize flexible interview:', err);
      handleError(err);
    }
  };

  const startInterview = async (conv: AIConversation) => {
    setIsLoading(true);
    setInitError(null);
    try {
      console.log('Starting flexible interview...');
      const response = await conv.ask('Please introduce yourself briefly and ask: "What would you like to share your wisdom on?"');
      console.log('Got opening question:', response);
      setMessages([{ role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Failed to start interview:', err);
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (err: any) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.error('Interview Error:', errorMessage);
    
    let userFriendlyError = errorMessage;
    
    if (errorMessage.includes('Model invocation failed') || errorMessage.includes('serving-endpoints')) {
      userFriendlyError = `AI Model Not Available\n\nThe AI interview feature requires a Databricks Model Serving endpoint.\n\nError: ${errorMessage}`;
    } else if (errorMessage.includes('Not authenticated')) {
      userFriendlyError = `Authentication Required\n\nPlease sign in to Databricks to use AI interviews.`;
    } else if (errorMessage.includes('timeout')) {
      userFriendlyError = `Request Timeout\n\nThe AI model took too long to respond. This might be a temporary issue.`;
    }
    
    setInitError(userFriendlyError);
    setIsLoading(false);
  };

  const retryInterview = () => {
    setInitError(null);
    setMessages([]);
    setConversation(null);
    setInterviewTopic('');
    initializeFlexibleInterview();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !conversation) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Capture topic from first response if not already set
    if (!interviewTopic && messages.length === 1) {
      setInterviewTopic(userMessage);
    }
    
    setIsLoading(true);

    try {
      const response = await conversation.ask(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, I encountered an error. Could you please repeat your last response?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!conversation || isLoading) return;

    setIsLoading(true);
    setIsGeneratingSummary(true);
    try {
      const response = await conversation.ask('[System: The interviewee has indicated they would like to end the interview. Please provide a brief, professional closing that thanks them for their time.]');
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Generate summary
      const summaryPrompt = `[System: Please provide a concise summary of the key insights from this interview. Structure it as:

**Topic:** [What they shared wisdom on]

**Key Insights:**
- [Main point 1]
- [Main point 2]
- [Main point 3]
...

**Recommendations:**
- [Any recommendations they provided]

Keep it professional and actionable. Focus on the most valuable takeaways.]`;
      
      const summary = await conversation.ask(summaryPrompt);
      setInterviewSummary(summary);
      setInterviewComplete(true);
    } catch (err) {
      console.error('Failed to end interview:', err);
      // Fallback closing and summary
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Thank you for taking the time to share your insights today. Your perspectives will be valuable to the team.' 
      }]);
      setInterviewSummary(`Interview Summary\n\nTopic: ${interviewTopic}\n\nThe interviewee shared valuable insights during this conversation. Please review the full transcript for details.`);
      setInterviewComplete(true);
    } finally {
      setIsLoading(false);
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveToKnowledgeBase = async () => {
    setIsSaving(true);
    try {
      const summarySection = `\n\n=== Interview Summary ===\n\n${interviewSummary}\n\n`;
      
      // Format date as YYYY-MM-DD with month name for clear metadata extraction
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${monthNames[month - 1]} ${year})`;
      
      const header = `AI Wisdom Interview Session
Date: ${formattedDate}
${interviewTopic ? `Topic: ${interviewTopic}` : ''}
Interview Format: Flexible Conversational
Interviewer: AI Assistant
Interviewee: ${userEmail}
Interviewee Role: ${userRole}
${summarySection}
=== Full Interview Transcript ===

`;
      
      const transcript = header + messages
        .map(msg => {
          const speaker = msg.role === 'user' ? `${userEmail}` : 'Interviewer';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n\n');

      const fileName = `Wisdom_Interview_${userEmail}_${Date.now()}.txt`;

      const success = await onSaveTranscript(transcript, fileName);

      if (success) {
        alert('✓ Interview transcript and summary saved to Databricks Knowledge Base!');
        onComplete();
        onClose();
      } else {
        throw new Error('Failed to save transcript');
      }
    } catch (err) {
      console.error('Failed to save interview:', err);
      alert('Failed to save interview transcript. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartListening = async () => {
    if (!hasSpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    // Prime the browser to the selected device before SpeechRecognition starts
    if (selectedMicDeviceId && selectedMicDeviceId !== 'default') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedMicDeviceId } } });
        s.getTracks().forEach(t => t.stop());
      } catch { /* fall back to browser default */ }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        alert('Speech recognition error. Please try again.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mic className="w-6 h-6 text-purple-600" />
              Wisdom Interview
            </h2>
            {interviewTopic ? (
              <p className="text-sm text-gray-600 mt-1">Topic: {interviewTopic}</p>
            ) : (
              <p className="text-xs text-purple-600 mt-0.5">You will be able to edit the results before they are saved.</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close interview"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {initError ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="max-w-md w-full">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">Failed to Start Interview</h3>
                  <p className="text-sm text-red-700 mb-4 whitespace-pre-wrap">{initError}</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Possible solutions:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Sign in to Databricks using the button in the header</li>
                      <li>Check that your Databricks AI model endpoint is configured</li>
                      <li>Verify you have an active network connection</li>
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={retryInterview}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <SpinHex className="w-4 h-4" />
                          Retrying...
                        </>
                      ) : (
                        'Try Again'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
              {isLoading && messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <SpinHex className="w-10 h-10" />
                    <p className="text-gray-600">Starting interview...</p>
                  </div>
                </div>
              )}
              {isLoading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <SpinHex className="w-5 h-5" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input or Complete Actions */}
        <div className="border-t p-4">
          {!interviewComplete ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your thoughts... (Press Enter to send)"
                  className="flex-1 border-2 border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
                {hasSpeechRecognition && (
                  <button
                    onClick={isListening ? handleStopListening : handleStartListening}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              <button
                onClick={handleEndInterview}
                disabled={isLoading}
                className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                End Interview
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {isGeneratingSummary ? (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="flex items-center gap-2">
                    <SpinHex className="w-5 h-5" />
                    <p className="text-sm text-blue-800">Generating interview summary...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Interview complete! {messages.length} messages exchanged
                    </p>
                  </div>
                  
                  {/* Editable Summary */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Interview Summary (Edit as needed)
                    </label>
                    <textarea
                      value={interviewSummary}
                      onChange={(e) => setInterviewSummary(e.target.value)}
                      className="w-full h-48 border-2 border-gray-300 rounded p-3 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                      placeholder="Summary will appear here..."
                    />
                    <p className="text-xs text-gray-500">
                      Review and edit the summary before saving. This summary will be saved along with the full transcript.
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isSaving || isGeneratingSummary}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveToKnowledgeBase}
                  disabled={isSaving || isGeneratingSummary}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <SpinHex className="w-4 h-4" />
                      Saving...
                    </>
                  ) : (
                    'Save to Knowledge Base'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}