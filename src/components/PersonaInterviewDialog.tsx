import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, MicOff, ChevronRight, Check, User } from 'lucide-react';
import { SpinHex } from './LoadingGem';
import { AIConversation, executeAIPrompt } from '../utils/databricksAI';
import { saveCustomPersona } from '../utils/databricksAPI';

const CATEGORIES = ['Leadership', 'Product & Engineering', 'Commercial', 'Marketing', 'General'] as const;
type Category = typeof CATEGORIES[number];
const MARKETING_SUB_ROLES = ['Insights Manager', 'Brand Manager', 'Marketing Manager'] as const;

type Phase = 'form' | 'interview' | 'synthesis' | 'edit';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (personaName: string) => void;
  userEmail: string;
  userRole: string;
  selectedMicDeviceId?: string;
}

export function PersonaInterviewDialog({ open, onClose, onComplete, userEmail, userRole, selectedMicDeviceId }: Props) {
  const [phase, setPhase] = useState<Phase>('form');

  // Form fields
  const [personaName, setPersonaName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [roleInCompany, setRoleInCompany] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [subRole, setSubRole] = useState('');

  // Interview state
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Synthesis / edit state
  const [editablePersona, setEditablePersona] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!open) {
      setPhase('form');
      setPersonaName(''); setJobTitle(''); setRoleInCompany('');
      setCategory(''); setSubRole('');
      setConversation(null); setMessages([]);
      setUserInput(''); setIsLoading(false); setInitError(null);
      setEditablePersona(''); setSaveError(null);
    }
  }, [open]);

  const canStart = personaName.trim() && jobTitle.trim() && category;

  const handleStartInterview = async () => {
    setPhase('interview');
    setIsLoading(true);
    setInitError(null);

    const systemPrompt = `You are conducting a personal interview to build an AI persona profile for ${personaName.trim()}.

About the interviewee:
- Name: ${personaName.trim()}
- Job title: ${jobTitle.trim()}
- Role in company: ${roleInCompany.trim() || 'not specified'}
- Business area: ${category}${category === 'Marketing' && subRole ? ` — ${subRole}` : ''}

Your goal is to understand how this person thinks, what they value, how they communicate, and what their biases are — so an AI can accurately simulate their perspective in brand and marketing strategy assessments.

Conduct the interview conversationally. Cover these areas (not as a checklist — weave them in naturally):

A. How they think
- What they value most
- What they worry about
- What they notice first in a brief or strategy
- What they tend to ignore or deprioritize
- How they make decisions
- Their "signature moves" or recurring patterns

B. Role & domain expertise
- What they know deeply
- What they're responsible for
- What they're uniquely good at

C. Communication style
- Direct or diplomatic?
- Analytical or intuitive?
- Big-picture or detail-oriented?
- Fast or reflective?

D. Biases (ask gently — frame as "everyone has them")
- What they might consistently over- or underweight
- What perspectives they might dismiss too quickly

Guidelines:
- Ask one focused question at a time
- Follow up on interesting answers
- Keep it warm and conversational — never read out the list above
- After 15–20 exchanges you'll have a rich picture
- Begin with a brief warm introduction (1 sentence) and your first question`;

    try {
      const conv = new AIConversation(userEmail, userRole, systemPrompt);
      setConversation(conv);
      const opening = await conv.ask(`Please introduce yourself briefly (1 sentence) and ask your first question to ${personaName.trim()}.`);
      setMessages([{ role: 'assistant', content: opening }]);
    } catch (err: any) {
      setInitError(err.message || 'Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !conversation) return;
    const msg = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);
    try {
      const response = await conversation.ask(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error. Could you repeat that?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!conversation || isLoading) return;
    setIsLoading(true);
    try {
      const closing = await conversation.ask(
        '[System: The interviewee is ready to finish. Provide a warm 1–2 sentence closing that thanks them and mentions their AI persona is now being created.]'
      );
      setMessages(prev => [...prev, { role: 'assistant', content: closing }]);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
    }
    await runSynthesis();
  };

  const runSynthesis = async () => {
    setPhase('synthesis');

    const transcript = messages
      .map(m => `${m.role === 'user' ? personaName.trim() : 'Interviewer'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Transform this interview transcript into a structured AI persona profile.

Interview subject: ${personaName.trim()}
Job title: ${jobTitle.trim()}
Role in company: ${roleInCompany.trim() || 'not specified'}
Business area: ${category}${category === 'Marketing' && subRole ? ` — ${subRole}` : ''}

TRANSCRIPT:
${transcript}

Create a structured persona with exactly these 7 sections. Be specific and grounded in what was said — avoid generic statements:

## 1. Identity
- Name: ${personaName.trim()}
- Role:
- Domain expertise:
- Years of experience: (estimate based on what was shared, or note "not specified")

## 2. Cognitive Style
- How they reason:
- How they evaluate ideas:
- How they challenge assumptions:
- What they consider "good":

## 3. Motivations
- What they optimize for:
- What they protect:
- What they push toward:

## 4. Blind Spots
- What they undervalue:
- What they overestimate:
- What they avoid:

## 5. Voice & Tone
- How they speak:
- Phrases they use: (give 2–3 actual examples based on the interview)
- Phrases they never use: (give 2–3 contrasting examples)

## 6. Behavioral Rules
- Response to vague ideas:
- Response to risky ideas:
- Response to data:
- Response to creative leaps:

## 7. Example Outputs
[Provide 2–3 short samples (2–4 sentences each) showing how this person would respond in a brand or marketing strategy assessment. Write in first person as if they are speaking.]

---
Context: [One paragraph (2–3 sentences) capturing the essence of this persona for display purposes.]`;

    try {
      const result = await executeAIPrompt({ prompt, userEmail, userRole, maxTokens: 2500, temperature: 0.3 });
      setEditablePersona(result.response || '');
    } catch (err: any) {
      setEditablePersona(`Failed to generate persona. Error: ${err.message}\n\nPlease write your persona profile manually using the structure above.`);
    }
    setPhase('edit');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const contextMatch = editablePersona.match(/Context:\s*([\s\S]+?)(?:\n##|\n---|\z|$)/);
    const context = contextMatch
      ? contextMatch[1].replace(/\[.*?\]/g, '').trim()
      : `${personaName.trim()} — ${jobTitle.trim()}`;

    const result = await saveCustomPersona({
      name: personaName.trim(),
      hexIds: 'Colleagues',
      createdBy: userEmail,
      contentJson: {
        personaText: editablePersona,
        category,
        subRole: category === 'Marketing' ? subRole : '',
        jobTitle: jobTitle.trim(),
        roleInCompany: roleInCompany.trim(),
        context,
        createdVia: 'persona-interview',
      },
    });

    setIsSaving(false);
    if (result.success) {
      onComplete(personaName.trim());
      onClose();
    } else {
      setSaveError(result.error || 'Save failed. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleStartListening = async () => {
    if (!hasSpeechRecognition) { alert('Speech recognition is not supported in your browser.'); return; }
    if (selectedMicDeviceId && selectedMicDeviceId !== 'default') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedMicDeviceId } } });
        s.getTracks().forEach(t => t.stop());
      } catch { /* fall back */ }
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setUserInput(prev => prev ? `${prev} ${t}` : t); };
    rec.onerror = (e: any) => { if (e.error !== 'aborted') alert('Speech recognition error. Please try again.'); setIsListening(false); };
    rec.onend = () => setIsListening(false);
    try { rec.start(); } catch { setIsListening(false); }
  };

  const handleStopListening = () => recognitionRef.current?.stop();

  if (!open) return null;

  const exchangeCount = Math.floor(messages.filter(m => m.role === 'user').length);
  const readyToEnd = exchangeCount >= 4;

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-600" />
              Interview to Become a Persona
            </h2>
            {phase === 'interview' && (
              <p className="text-xs text-indigo-600 mt-0.5">
                You will be able to edit the results before they are saved.
              </p>
            )}
            {phase === 'edit' && (
              <p className="text-xs text-gray-500 mt-0.5">
                Review and edit your profile, then save to make it available in the Colleagues hex.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── FORM ── */}
          {phase === 'form' && (
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personaName}
                  onChange={e => setPersonaName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="w-full border-2 border-gray-300 rounded p-2.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">This will be the label for your AI persona.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your job title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Brand Manager"
                  className="w-full border-2 border-gray-300 rounded p-2.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your role in the company
                </label>
                <input
                  type="text"
                  value={roleInCompany}
                  onChange={e => setRoleInCompany(e.target.value)}
                  placeholder="e.g. Lead brand strategy for our core product lines"
                  className="w-full border-2 border-gray-300 rounded p-2.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area of the business <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => { setCategory(e.target.value as Category); setSubRole(''); }}
                  className="w-full border-2 border-gray-300 rounded p-2.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select area...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {category === 'Marketing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marketing role
                  </label>
                  <select
                    value={subRole}
                    onChange={e => setSubRole(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded p-2.5 text-gray-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select role...</option>
                    {MARKETING_SUB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── INTERVIEW ── */}
          {phase === 'interview' && (
            <div className="p-4 space-y-3">
              {initError ? (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-sm font-medium text-red-700">Failed to start interview</p>
                  <p className="text-xs text-red-600 mt-1">{initError}</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                        msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages.length === 0 && (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <SpinHex className="w-8 h-8 mx-auto" />
                        <p className="text-gray-500 text-sm mt-2">Starting interview...</p>
                      </div>
                    </div>
                  )}
                  {isLoading && messages.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3"><SpinHex className="w-5 h-5" /></div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          )}

          {/* ── SYNTHESIS ── */}
          {phase === 'synthesis' && (
            <div className="flex items-center justify-center h-full min-h-48">
              <div className="text-center p-8">
                <SpinHex className="w-12 h-12 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Creating your AI persona...</p>
                <p className="text-gray-400 text-sm mt-1">Analysing the interview and building the profile</p>
              </div>
            </div>
          )}

          {/* ── EDIT ── */}
          {phase === 'edit' && (
            <div className="p-4 space-y-3">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              )}
              <textarea
                value={editablePersona}
                onChange={e => setEditablePersona(e.target.value)}
                className="w-full border-2 border-gray-300 rounded p-3 text-sm text-gray-700 font-mono focus:outline-none focus:border-indigo-500 resize-none"
                style={{ height: 'calc(85vh - 200px)' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex-shrink-0">
          {phase === 'form' && (
            <button
              onClick={handleStartInterview}
              disabled={!canStart}
              className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Start Interview <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {phase === 'interview' && !initError && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Your response... (Enter to send)"
                  className="flex-1 border-2 border-gray-300 rounded p-2 text-gray-700 focus:outline-none focus:border-indigo-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
                {hasSpeechRecognition && (
                  <button
                    onClick={isListening ? handleStopListening : handleStartListening}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <button
                onClick={handleEndInterview}
                disabled={isLoading || !readyToEnd}
                className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {readyToEnd ? 'End Interview & Create Persona' : 'Interview in progress...'}
              </button>
            </div>
          )}

          {phase === 'edit' && (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editablePersona.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving
                  ? <><SpinHex className="w-4 h-4" />Saving...</>
                  : <><Check className="w-4 h-4" />Save Persona</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
