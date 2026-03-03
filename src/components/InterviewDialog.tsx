import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Check, Mic, MicOff, AlertCircle } from 'lucide-react';
import { AIConversation } from '../utils/databricksAI';

interface InterviewDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  insightType: 'Brand' | 'Category' | 'General';
  brand?: string;
  projectType?: string;
  userEmail: string;
  userRole: string;
  onSaveTranscript: (transcript: string, fileName: string) => Promise<boolean>;
}

// Fallback questions if AI interview fails
const FALLBACK_QUESTIONS = {
  Brand: [
    "What unique characteristics define this brand's identity?",
    "What challenges or opportunities do you see for this brand?",
    "How does this brand's audience perceive it compared to competitors?",
    "What insights about this brand would be valuable for future projects?",
    "What would you recommend for strengthening this brand's position?"
  ],
  Category: [
    "What trends are shaping this category right now?",
    "What unmet needs exist in this category?",
    "How is consumer behavior evolving in this space?",
    "What opportunities exist for innovation in this category?",
    "What insights would help teams working in this category?"
  ],
  General: [
    "What important insight or knowledge would you like to share?",
    "What context or background is important to understand this insight?",
    "How might others apply this insight in their work?",
    "What examples or evidence support this insight?",
    "What recommendations would you make based on this insight?"
  ]
};

export function InterviewDialog({
  open,
  onClose,
  onComplete,
  insightType,
  brand,
  projectType,
  userEmail,
  userRole,
  onSaveTranscript
}: InterviewDialogProps) {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const recognitionRef = useRef<any>(null);
  const maxQuestions = 5;
  
  // Browser environment check
  const isBrowser = typeof window !== 'undefined';
  const hasSpeechRecognition = isBrowser && (
    ('SpeechRecognition' in window) || 
    ('webkitSpeechRecognition' in window)
  );

  useEffect(() => {
    if (open && !conversation && useAI) {
      // Try to initialize AI conversation
      initializeAIInterview();
    } else if (open && !useAI && messages.length === 0) {
      // Start with fallback questions
      startFallbackInterview();
    }
  }, [open, conversation, insightType, brand, projectType, userEmail, userRole, useAI]);

  const initializeAIInterview = async () => {
    try {
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
3. Help the user articulate tacit knowledge they might not realize they have
4. Be conversational and encouraging
5. You will ask exactly ${maxQuestions} questions total
6. After the user answers the ${maxQuestions}th question, provide a brief summary of the key insights gathered

Start by introducing yourself briefly (1 sentence) and then immediately ask your first insightful question.`;

      const conv = new AIConversation(userEmail, userRole, systemPrompt);
      setConversation(conv);
      
      // Get first question
      await startAIInterview(conv);
    } catch (err) {
      console.error('Failed to initialize AI interview:', err);
      handleAIError(err);
    }
  };

  const startAIInterview = async (conv: AIConversation) => {
    setIsLoading(true);
    setInitError(null);
    try {
      console.log('Starting AI interview, asking first question...');
      const response = await conv.ask('Please introduce yourself briefly and ask your first question.');
      console.log('Got first question:', response);
      setMessages([{ role: 'assistant', content: response }]);
      setQuestionCount(1);
    } catch (err) {
      console.error('Failed to start AI interview:', err);
      handleAIError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIError = (err: any) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.error('AI Interview Error:', errorMessage);
    
    // Provide more helpful error messages
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

  const startFallbackInterview = () => {
    const questions = FALLBACK_QUESTIONS[insightType];
    const firstQuestion = questions[0];
    setMessages([{ 
      role: 'assistant', 
      content: `Hello! I'll guide you through ${maxQuestions} questions about your ${insightType.toLowerCase()} insights. Let's begin:\n\n${firstQuestion}` 
    }]);
    setCurrentQuestionIndex(0);
    setQuestionCount(1);
  };

  const switchToFallback = () => {
    setUseAI(false);
    setInitError(null);
    setMessages([]);
    setConversation(null);
    startFallbackInterview();
  };

  const retryAI = () => {
    setInitError(null);
    setMessages([]);
    setConversation(null);
    setQuestionCount(0);
    initializeAIInterview();
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Fallback mode (no AI)
    if (!useAI) {
      const questions = FALLBACK_QUESTIONS[insightType];
      const newIndex = currentQuestionIndex + 1;
      
      setQuestionCount(prev => prev + 1);
      
      if (newIndex < maxQuestions) {
        // Ask next question
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: questions[newIndex] 
          }]);
          setCurrentQuestionIndex(newIndex);
        }, 500);
      } else {
        // Interview complete
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Thank you for sharing your insights! I've captured your responses to all ${maxQuestions} questions. Your knowledge will be valuable to the team.` 
          }]);
          setInterviewComplete(true);
        }, 500);
      }
      return;
    }

    // AI mode
    if (!conversation) return;
    
    setIsLoading(true);

    try {
      let promptText = userMessage;
      const newCount = questionCount + 1;
      
      // Add context to help AI know when to end
      if (newCount >= maxQuestions) {
        promptText += `\n\n[System: This was the answer to your final question (#${maxQuestions}). Please provide a brief summary of the key insights gathered during this interview and thank the user.]`;
      } else {
        promptText += `\n\n[System: You have asked ${newCount} out of ${maxQuestions} questions. Ask your next insightful question.]`;
      }

      const response = await conversation.ask(promptText);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      setQuestionCount(newCount);

      // Check if interview should end
      if (newCount >= maxQuestions) {
        setInterviewComplete(true);
      }
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try your response again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToKnowledgeBase = async () => {
    // Works for both AI and fallback modes
    setIsSaving(true);
    try {
      // Format conversation as text
      const header = `AI Interview Session - ${insightType} Insights
Date: ${new Date().toLocaleString()}
${brand ? `Brand: ${brand}` : ''}
${projectType ? `Project Type: ${projectType}` : ''}
Interviewer: AI Assistant
Interviewee: ${userEmail}

=== Interview Transcript ===

`;
      
      const transcript = header + messages
        .map(msg => {
          const speaker = msg.role === 'user' ? 'You' : 'Interviewer';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n\n');

      // Create filename
      const fileName = `Wisdom_${insightType}_Interview_${Date.now()}.txt`;

      // Save using parent callback
      const success = await onSaveTranscript(transcript, fileName);

      if (success) {
        alert('✓ Interview transcript saved to Databricks Knowledge Base!');
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

  const handleStartListening = () => {
    if (!hasSpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mic className="w-6 h-6 text-purple-600" />
              AI Interview: {insightType} Insights
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Question {questionCount} of {maxQuestions}
            </p>
          </div>
          <button
            onClick={onClose}
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
                      onClick={retryAI}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        'Try Again'
                      )}
                    </button>
                    <button
                      onClick={switchToFallback}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Use Fallback Questions
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
                    <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
                    <p className="text-gray-600">Starting interview...</p>
                  </div>
                </div>
              )}
              {isLoading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input or Complete Actions */}
        <div className="border-t p-4">
          {!interviewComplete ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response... (Press Enter to send)"
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
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Interview complete! Your insights have been captured in {messages.length} messages.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveToKnowledgeBase}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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