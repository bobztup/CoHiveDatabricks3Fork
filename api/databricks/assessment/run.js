/**
 * Assessment Run API — CoHive v3
 *
 * Runs a structured multi-round AI collaboration with:
 *   - Rich persona prompts (voice, values, evaluation criteria, dislikes, praises)
 *   - Per-project-type prompt templates (system + user-defined)
 *   - KB knowledge mode: hard-forbidden / strong-preference / equal-weight
 *   - Request modes: get-inspired (generate ideas) vs load-ideas (assess/compare)
 *   - Scope: brand / category / general
 *   - Parallel Round 1 (all personas fire simultaneously via Promise.all)
 *   - Debate rounds (each persona sees full prior transcript)
 *   - Moderator: opens each round, closes with synthesis
 *   - Fact-Checker: audits all citations at the end
 *   - Neutral summarizer pass (never sees system prompt or KB)
 *   - Exact prompt logging via logEvent() → activity_log
 *
 * Request body additions vs v2:
 *   kbMode          'hard-forbidden' | 'strong-preference' | 'equal-weight'
 *   requestMode     'get-inspired' | 'load-ideas'
 *   ideaElements    Array<{ id: string, label: string, content: string }>
 *   scope           'brand' | 'category' | 'general'
 *   numDebateRounds number (default 1, max 3)
 *
 * Location: api/databricks/assessment/run.js
 */

import { getPersonaContent } from '../../../src/data/personaContentData.cjs';
import { getDatabricksConfig } from '../../utils/validateEnv.js';
// ─── Inline system project type prompts ───────────────────────────────────────
// Cannot import .ts files at runtime in the API server. projectTypeConfigs passed
// from the frontend already includes system types (merged in ProcessWireframe).
// This inline copy is a server-side safety net only — used when projectTypeConfigs
// is empty or the project type isn't found in the passed configs.
const SYSTEM_PROJECT_TYPE_PROMPTS = {
  'Creative Messaging': `You are analyzing creative messaging campaigns. Focus on:
- Message clarity and resonance with target audience
- Brand voice consistency and authenticity
- Emotional impact and memorability
- Call-to-action effectiveness
- Differentiation from competitor messaging`,
  'Product Launch': `You are evaluating product launch strategies. Consider:
- Market readiness and optimal timing
- Competitive positioning and unique value proposition
- Launch messaging and communication channels
- Success metrics and KPIs
- Risk mitigation strategies`,
  'War Games': `You are conducting competitive war games analysis. Analyze:
- Competitor strengths and weaknesses
- Market positioning opportunities and threats
- Strategic advantages and vulnerabilities
- Defensive and offensive strategies`,
  'Brand Strategy': `You are analyzing brand strategy initiatives. Focus on:
- Brand positioning and differentiation
- Target audience definition and insights
- Brand architecture and portfolio strategy
- Brand equity and value proposition
- Competitive landscape and white space`,
  'Market Research': `You are evaluating market research findings. Consider:
- Consumer insights and behavioral patterns
- Market trends and emerging opportunities
- Segmentation and targeting strategies
- Purchase drivers and barriers`,
  'Innovation Pipeline': `You are assessing innovation and new product development. Analyze:
- Innovation opportunity spaces and white space
- Consumer unmet needs and pain points
- Prototype performance and concept testing
- Feasibility and time-to-market`,
  'Big Idea': `You are evaluating big ideas and core creative concepts. Focus on:
- Conceptual strength and originality
- Strategic alignment with brand positioning
- Cultural relevance and resonance
- Scalability across channels
- Emotional connection and impact`,
  'Customer Experience': `You are assessing customer experience strategies. Evaluate:
- Customer journey mapping and touchpoints
- Pain points and friction areas
- Moments of truth and delight
- Omnichannel consistency
- Personalization and relevance`,
  'Packaging': `You are assessing packaging design and strategy. Evaluate:
- Visual appeal and shelf presence
- Brand identity alignment
- Sustainability considerations
- Consumer perception and appeal`,
  'Retail Strategy': `You are analyzing retail and distribution strategies. Focus on:
- Channel strategy and distribution mix
- In-store execution and merchandising
- Shopper marketing and activation`,
  'Content Strategy': `You are evaluating content marketing strategies. Consider:
- Content themes and narrative architecture
- Audience needs and information seeking behaviors
- Content formats and distribution channels`,
  'Rebranding': `You are assessing rebranding and brand refresh initiatives. Evaluate:
- Rationale and strategic necessity
- Brand equity transfer and risk mitigation
- Visual identity and design system
- Implementation timeline and phasing`,
};
import { logEvent, logError, logAssessment } from '../../utils/logger.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SUMMARIZER_SYSTEM_PROMPT = `You are a neutral summarization agent. Your task is to summarize the provided conversation accurately, concisely, and without interpretation, judgment, or emotional coloring. Do not add opinions, praise, or recommendations beyond what the conversation explicitly contains.`;

const MAX_KB_CHARS = 80000;
const MAX_DEBATE_ROUNDS = 3;
// warehouseId_resolved is resolved from getDatabricksConfig() in the handler — not hardcoded

// ─── KB Mode instructions ──────────────────────────────────────────────────────

/**
 * Returns the knowledge mode block injected into every persona prompt.
 * Three strictness levels; all three enforce mandatory citations.
 */
function getKbModeInstructions(kbMode, kbFileNames, exampleFileNames = []) {
  const exampleNote = exampleFileNames.length > 0
    ? `

EXAMPLE FILES (cross-brand reference only): ${exampleFileNames.join(', ')}
` +
      `These files show quality and format standards from other brands. ` +
      `Do NOT cite them as evidence about the current brand. ` +
      `Use them only to understand the expected level of quality, tone, and structure.`
    : '';
  const fileList = kbFileNames.map(f => `  - ${f}`).join('\n');

  if (kbMode === 'hard-forbidden') {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE MODE: KNOWLEDGE BASE ONLY — GENERAL KNOWLEDGE HARD FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 You are STRICTLY FORBIDDEN from using general knowledge.
🚫 Every single claim MUST be sourced from the Knowledge Base files listed below.
🚫 If the Knowledge Base files do not contain evidence for a claim, DO NOT MAKE IT.
🚫 If you cannot cite it, you cannot say it. No exceptions whatsoever.
✅ Cite every claim as [Source: exact_filename.ext]

AUTHORISED KNOWLEDGE BASE FILES (copy filenames exactly — case matters):
${fileList}

HALLUCINATION RULE: If you cannot find the answer in the Knowledge Base files,
write: "The Knowledge Base does not contain sufficient information on this point."${exampleNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  if (kbMode === 'strong-preference') {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE MODE: KNOWLEDGE BASE STRONGLY PREFERRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STRONGLY prefer Knowledge Base files over general knowledge at all times.
⚠️  Only use general knowledge when the Knowledge Base files are completely silent on a point.
⚠️  When you do use general knowledge, you MUST:
    (a) Flag it as [General Knowledge — Knowledge Base silent on this point]
    (b) Explain why the Knowledge Base files did not cover it
✅ Cite Knowledge Base claims as [Source: exact_filename.ext]
✅ Never fabricate — if the Knowledge Base is silent and you lack certainty, say so.

AUTHORISED KNOWLEDGE BASE FILES:
${fileList}${exampleNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // equal-weight (default)
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE MODE: KNOWLEDGE BASE + GENERAL KNOWLEDGE (EQUAL WEIGHT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ You may draw on both Knowledge Base files AND general knowledge.
✅ ALL claims — from either source — MUST be cited. No uncited assertions ever.
✅ Cite Knowledge Base files as [Source: exact_filename.ext]
✅ Cite general knowledge as [General Knowledge]
✅ Never fabricate facts — if uncertain, say so explicitly.

AUTHORISED KNOWLEDGE BASE FILES:
${fileList}${exampleNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─── Project type prompt resolver ─────────────────────────────────────────────

/**
 * Resolves the project-type-specific prompt instructions.
 * Priority: user-defined (from DB, passed in req.body) → system defaults → generic fallback.
 *
 * For the user-defined vs system question: we trust what's passed in projectTypeConfigs
 * (already fetched by the frontend from the DB), but also check systemProjectTypes as a
 * reliable server-side fallback. This avoids an extra DB round-trip in the critical path
 * while keeping system defaults always available.
 */
function resolveProjectTypePrompt(projectType, projectTypeConfigs) {
  // 1. User-defined configs passed from AssessmentModal (sourced from project_type_configs DB table)
  if (projectTypeConfigs?.length > 0) {
    const userDefined = projectTypeConfigs.find(
      c => c.projectType?.toLowerCase() === projectType?.toLowerCase()
    );
    if (userDefined?.prompt) {
      console.log(`[Assessment] Using user-defined prompt for project type: ${projectType}`);
      return userDefined.prompt;
    }
  }

  // 2. Inline system project type prompts (server-side safety net)
  if (projectType) {
    const normalised = Object.keys(SYSTEM_PROJECT_TYPE_PROMPTS).find(
      k => k.toLowerCase() === projectType.toLowerCase()
    );
    if (normalised) {
      console.log(`[Assessment] Using system prompt for project type: ${projectType}`);
      return SYSTEM_PROJECT_TYPE_PROMPTS[normalised];
    }
  }

  // 3. Generic fallback
  console.log(`[Assessment] No prompt found for project type: ${projectType} — using generic fallback`);
  return `Provide expert analysis for this ${projectType || 'general'} project. Focus on strategic implications, actionable insights, and specific recommendations grounded in evidence.`;
}

// ─── Persona identity block ────────────────────────────────────────────────────

/**
 * Extracts all rich fields from a persona JSON and builds a prompt identity block.
 * Works for both luminary personas (Bill Bernbach style with psychographics,
 * voiceCharacteristics, evaluationCriteria) and agent personas (analyst-competitive
 * style with identity, capabilities, behavior, adaptations).
 * Gracefully degrades when fields are absent.
 */
function buildPersonaIdentityBlock(persona) {
  const lines = [];

  const name = persona.name || persona.identity?.name || 'Expert';

  // ── Primary identity ──
  // Luminary: use shortVoicePrompt as the most distilled identity statement
  // Agent: use systemPrompt excerpt
  const shortVoicePrompt = persona.evaluationCriteria?.shortVoicePrompt;
  const systemPromptExcerpt = persona.systemPrompt?.substring(0, 500);

  lines.push(`YOU ARE: ${name}`);

  if (shortVoicePrompt) {
    lines.push(`\nVOICE & IDENTITY:\n${shortVoicePrompt}`);
  } else if (systemPromptExcerpt) {
    lines.push(`\nIDENTITY:\n${systemPromptExcerpt}`);
  } else {
    if (persona.context) lines.push(`\nBACKGROUND:\n${persona.context}`);
    if (persona.description) lines.push(`\nDESCRIPTION:\n${persona.description}`);
    if (persona.identity?.background) lines.push(`\nBACKGROUND:\n${persona.identity.background}`);
    if (persona.identity?.perspective) lines.push(`\nPERSPECTIVE:\n${persona.identity.perspective}`);
  }

  // ── Communication style ──
  if (persona.voiceCharacteristics) {
    const vc = persona.voiceCharacteristics;
    const parts = [
      vc.tone && `Tone: ${vc.tone}`,
      vc.style && `Style: ${vc.style}`,
      vc.speechPattern && `Speech pattern: ${vc.speechPattern}`,
    ].filter(Boolean);
    if (parts.length) lines.push(`\nCOMMUNICATION STYLE:\n${parts.join('\n')}`);
  } else if (persona.behavior?.communicationStyle) {
    lines.push(`\nCOMMUNICATION STYLE:\n${persona.behavior.communicationStyle}`);
    if (persona.behavior.tone) lines.push(`Tone: ${persona.behavior.tone}`);
  }

  // ── What this persona champions ──
  if (persona.psychographics?.praises?.length) {
    lines.push(`\nWHAT YOU CHAMPION:\n${persona.psychographics.praises.map(p => `- ${p}`).join('\n')}`);
  }

  // ── What this persona attacks ──
  if (persona.psychographics?.dislikes?.length) {
    lines.push(`\nWHAT YOU ATTACK OR REJECT:\n${persona.psychographics.dislikes.map(d => `- ${d}`).join('\n')}`);
  }

  // ── Core beliefs / philosophies ──
  const beliefs = persona.psychographics?.philosophies || persona.psychographics?.values;
  if (beliefs?.length) {
    lines.push(`\nCORE BELIEFS:\n${beliefs.map(b => `- ${b}`).join('\n')}`);
  }

  // ── Mandatory evaluation questions ──
  if (persona.evaluationCriteria?.alwaysAsks?.length) {
    lines.push(`\nQUESTIONS YOU ALWAYS ASK (address at least 2 in your response):\n${persona.evaluationCriteria.alwaysAsks.map(q => `- ${q}`).join('\n')}`);
  }

  // ── How they engage with early-stage ideas ──
  if (persona.evaluationCriteria?.reactsToEarlyIdeas) {
    lines.push(`\nHOW YOU REACT TO IDEAS:\n${persona.evaluationCriteria.reactsToEarlyIdeas}`);
  }

  // ── Expertise areas (agent personas) ──
  const expertise = persona.identity?.expertise || persona.capabilities?.analysis;
  if (expertise?.length) {
    lines.push(`\nEXPERTISE:\n${expertise.slice(0, 6).map(e => `- ${e}`).join('\n')}`);
  }

  // ── Project type adaptations (agent personas) ──
  if (persona.adaptations?.projectType && Object.keys(persona.adaptations.projectType).length > 0) {
    lines.push(`\nHOW YOU ADAPT BY PROJECT TYPE:\n${Object.entries(persona.adaptations.projectType).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`);
  }

  // ── Scoring rubric ──
  if (persona.evaluationCriteria?.scoringRubric) {
    lines.push(`\nHOW YOU EVALUATE & SCORE:\n${persona.evaluationCriteria.scoringRubric}`);
  }

  // ── Living person disclaimer ──
  if (persona.metadata?.living) {
    const baseName = persona.metadata?.baseName || name.replace(/'s Published Works$/, '');
    lines.push(`\nIMPORTANT — PUBLISHED WORKS PERSONA:\nThis persona is built exclusively from ${baseName}'s published books, articles, and documented public statements. Do not fabricate quotes, attribute opinions not found in their documented works, or claim to represent their personal views. All responses must be grounded in their published positions.`);
    lines.push(`\n*This persona is based solely on ${baseName}'s published works and does not represent their actual views or statements.`);
  }

  return lines.join('\n');
}

// ─── Story context block ───────────────────────────────────────────────────────

function buildStoryContextBlock(storyExecution) {
  if (!storyExecution) return '';
  const synopsis = storyExecution.synopsis || '';
  const fullText = (storyExecution.assessment || '').trim();
  const truncated = fullText.length > 2000 ? fullText.slice(0, 2000) + '\n\n[... story continues ...]' : fullText;
  const values = storyExecution.storyValues || [];
  const emotions = storyExecution.storyEmotions || [];
  const category = storyExecution.storyCategory || '';
  const subtype = storyExecution.storySubtype || '';
  const storyType = [category, subtype].filter(Boolean).join(' · ') || 'Brand Story';
  const metaParts = [
    `Type: ${storyType}`,
    values.length > 0 ? `Values: ${values.join(', ')}` : '',
    emotions.length > 0 ? `Emotions to evoke: ${emotions.join(', ')}` : '',
  ].filter(Boolean);

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND STORY WRITTEN THIS ITERATION:
${metaParts.join(' | ')}
${synopsis ? `\nStrategic Synopsis: ${synopsis}\n` : ''}
${truncated}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─── Task description builder ──────────────────────────────────────────────────

function buildTaskDescription({
  requestMode, assessmentTypes, brand, hexLabel, hexId,
  ideasContent, ideaElements, userSolution,
  projectType, projectTypePrompt, scope,
}) {
  const contextLabel = hexLabel || hexId;

  // Map hex IDs to plain-English task context descriptions
  // These replace the raw hex name in task descriptions to avoid the AI
  // treating the hex name as a brand concept.
  const HEX_TASK_CONTEXT = {
    'Luminaries':  'Expert Panel Review — industry luminaries applying their expertise',
    'Colleagues':  'Internal Stakeholder Review — functional colleagues assessing feasibility',
    'Consumers':   'Consumer Panel Review — buyer personas evaluating from lived experience',
    'panelist':    'Panel Homes Review — household personas evaluating from domestic context',
    'cultural':    'Cultural Voices Review — community personas evaluating cultural fit',
    'competitors': 'Competitive Analysis — pressure-testing strategy against competitive reality',
    'Grade':       'Quality Grading — evidence-based scoring of the work',
    'test':        'Segment Testing — evaluating strategy across target segments',
    'social':      'Social Listening Analysis',
    'research':    'Knowledge Base Analysis',
  };
  const taskContext = HEX_TASK_CONTEXT[hexId] || contextLabel;

  // ── Hex panel context clarification ─────────────────────────────────────
  // The hex name identifies the TYPE of expert panel — never a brand concept.
  const HEX_PANEL_LABELS = {
    'Luminaries': 'a panel of industry luminaries (advertising legends, thought leaders)',
    'Colleagues':  'a panel of internal colleagues (CMO, CFO, Sales Director, etc.)',
    'Consumers':   'a panel of consumer personas (buyers, category users)',
    'panelist':    'a panel of panelist households',
    'cultural':    'a panel of cultural voices',
    'Grade':       'a panel of target segment evaluators',
  };
  const _panelDesc = HEX_PANEL_LABELS[hexId];
  const luminariesClarification = _panelDesc ? `
⚠️ PANEL CONTEXT NOTE:
"${taskContext}" identifies the TYPE OF PANEL having this conversation — NOT a brand concept.
These personas ARE ${_panelDesc}. They are the experts in the room discussing the ${brand} problem.
Do NOT interpret "${taskContext}" as a creative territory, campaign theme, or brand relationship to activate.
Do NOT ask what "${taskContext}" means for ${brand} or generate ideas about ${brand}'s relationship to "${taskContext}".
Apply your expertise directly to the task below.

` : '';
  const scopeLabel = scope === 'brand' ? `${brand}-specific data`
    : scope === 'category' ? 'category-level benchmarks and brand data'
    : 'broad market knowledge plus brand and category data';

  // ── Get Inspired: generate ideas ──────────────────────────────────────────
  if (requestMode === 'get-inspired') {
    return `${luminariesClarification}MISSION: Generate original, creative ideas for ${brand} in the context of "${taskContext}".

MODE: GENERATIVE — produce fresh, specific, actionable ideas. Do not assess or critique.

SCOPE: ${scopeLabel}. Ground your ideas accordingly.

PROJECT TYPE GUIDANCE:
${projectTypePrompt}

Requirements:
- Generate a minimum of 3 genuinely distinct ideas
- Each idea must be concrete enough to execute (no vague directions)
- Each idea must cite supporting evidence [Source: filename.ext] or [General Knowledge]
- Ideas should offer real variety — different angles, not variations on a theme`;
  }

  // ── Load Ideas: single element ────────────────────────────────────────────
  if (requestMode === 'load-ideas' && ideaElements?.length === 1) {
    const el = ideaElements[0];
    const content = el.content || ideasContent || userSolution || 'No content provided';

    let task = `${luminariesClarification}MISSION: Critically assess the following for ${brand} in the context of "${taskContext}".

IDEA/CONTENT TO ASSESS — "${el.label || 'Current Idea'}":
${content}

SCOPE: ${scopeLabel}

PROJECT TYPE GUIDANCE:
${projectTypePrompt}

Assessment Requirements:
- Evaluate the idea on its own merits — what specifically works, what specifically doesn't
- Ground every judgment in evidence [Source: filename.ext] or [General Knowledge]
- Score the idea 1–10 with explicit rationale
- Provide specific, constructive improvement recommendations
- Flag any critical gaps, risks, or blind spots`;

    if (assessmentTypes?.includes('recommend')) {
      task += `\n\nSECOND PHASE — Recommend Changes: After assessing, propose specific changes that would make this idea stronger. Frame as concrete alternatives, not just criticism.`;
    }

    return task;
  }

  // ── Load Ideas: multiple elements comparison ──────────────────────────────
  if (requestMode === 'load-ideas' && ideaElements?.length > 1) {
    const elementList = ideaElements.map((el, i) =>
      `ELEMENT ${i + 1} — "${el.label || `Option ${i + 1}`}":\n${el.content}`
    ).join('\n\n---\n\n');

    let task = `${luminariesClarification}MISSION: Assess and compare the following ${ideaElements.length} elements for ${brand} in the context of "${taskContext}".

${elementList}

SCOPE: ${scopeLabel}

PROJECT TYPE GUIDANCE:
${projectTypePrompt}

Assessment Requirements:
- Assess EACH element individually first: strengths, weaknesses, score 1–10
- Compare elements directly: what does each do better or worse than the others?
- Rank all elements from strongest to weakest with explicit rationale
- Ground ALL judgments in evidence [Source: filename.ext] or [General Knowledge]
- Identify whether any elements can be combined into a stronger hybrid`;

    if (assessmentTypes?.includes('recommend')) {
      task += `\n\nSECOND PHASE — Recommend Changes: After comparison, recommend how to improve the top-ranked element, or describe the ideal hybrid.`;
    }

    return task;
  }

  // ── Default unified fallback ──────────────────────────────────────────────
  let task = `${luminariesClarification}MISSION: Collaborate to produce a unified, actionable recommendation for ${brand} in the context of "${taskContext}".

SCOPE: ${scopeLabel}

PROJECT TYPE GUIDANCE:
${projectTypePrompt}`;

  if (ideasContent) task += `\n\nCurrent ideas/work to assess and build on:\n${ideasContent}`;
  else if (userSolution) task += `\n\nSolution to consider: "${userSolution}"`;

  return task;
}

// ─── Moderator prompts ─────────────────────────────────────────────────────────

function buildModeratorOpeningPrompt({
  brand, projectType, hexLabel, hexId, assessmentTypeLabel,
  taskDescription, personaList, kbFileNames, kbMode, requestMode, scope,
  gemsBlock = '', iterationContextBlock = '', storyBlock = '',
}) {
  const kbModeLabel = kbMode === 'hard-forbidden'
    ? 'Knowledge Base ONLY — General Knowledge FORBIDDEN'
    : kbMode === 'strong-preference'
      ? 'Knowledge Base Preferred — General Knowledge only if Knowledge Base is silent'
      : 'Knowledge Base + General Knowledge (equal weight)';

  return `You are the Moderator for this ${brand} assessment session.

Your role: FRAME the session. Set objectives, rules, success criteria. Do NOT provide analysis yourself.

SESSION DETAILS:
Brand: ${brand}
Project Type: ${projectType}
Context: ${hexLabel || hexId}
Assessment Type: ${assessmentTypeLabel}
Mode: ${requestMode === 'get-inspired' ? 'Get Inspired — generate ideas' : 'Load Ideas — assess/compare'}
Scope: ${scope}
Knowledge Mode: ${kbModeLabel}
Personas: ${personaList}
KB Files: ${kbFileNames.join(', ')}

TASK:
${taskDescription}
${storyBlock ? `\n${storyBlock}` : ''}
${gemsBlock ? `\n${gemsBlock}\n\nUse the gems above to tell personas what "going in the right direction" looks like for this brand. They are directional calibration — not constraints.` : ''}
${iterationContextBlock ? `\n${iterationContextBlock}` : ''}

Write a sharp, energising opening. Cover exactly these four sections:

1. **Session Objective** — What success looks like for ${brand} by the end of this session (specific, not generic)
2. **What Good Looks Like** — The qualities of a genuinely useful output: cited, opinionated, actionable, grounded
3. **Rules of Engagement**
   - Knowledge mode is ${kbModeLabel} — enforce this strictly
   - Round 1: Each persona shares their independent view — no groupthink
   - Round 2+: Personas MUST directly challenge each other by name. Consensus for its own sake is a failure.
   - All claims must be cited. Uncited assertions are not acceptable.
4. **3 Sharp Questions** this session must answer by the end — make them specific to ${brand} and this task

Format:

## Moderator Opening

### Session Objective
[...]

### What Good Looks Like
[...]

### Rules of Engagement
[...]

### Questions This Session Must Answer
1. [...]
2. [...]
3. [...]

---`;
}

function buildModeratorRecapPrompt({
  roundNumber, priorTranscript, brand, personaList, taskDescription, requestMode,
}) {
  const challengeFocus = requestMode === 'load-ideas'
    ? 'Push personas to sharpen their scores and rankings — vague assessments are not acceptable in Round ' + roundNumber + '.'
    : 'Push personas to go deeper on the strongest ideas — refinement and rigour over volume.';

  return `You are the Moderator. Round ${roundNumber - 1} has just concluded.

Your job: Brief the group for Round ${roundNumber}. Do NOT add your own analysis.

PRIOR TRANSCRIPT:
${priorTranscript}

TASK REMINDER: ${taskDescription}
BRAND: ${brand}
PERSONAS: ${personaList}

Cover these four things:

1. What each persona contributed in Round ${roundNumber - 1} (1 blunt sentence per persona)
2. The sharpest DISAGREEMENTS or TENSIONS that emerged
3. Claims that went UNCHALLENGED but deserve scrutiny in Round ${roundNumber}
4. Your Round ${roundNumber} challenge: ${challengeFocus}

Format:

## Moderator — Round ${roundNumber} Brief

### Round ${roundNumber - 1} Contributions
[Per-persona, 1 sentence each — be direct]

### Key Tensions
[The disagreements that matter most]

### Unchallenged Claims to Interrogate
[What slipped through without pushback]

### Round ${roundNumber} Challenge
[Your specific provocation for this round]

---`;
}

function buildModeratorClosingPrompt({
  allTranscript, brand, projectType = '', taskDescription, assessmentTypeLabel, requestMode, ideaElements,
}) {
  const verdictFocus = requestMode === 'get-inspired'
    ? `Synthesize the BEST ideas generated across all rounds. Rank the top 3 for ${brand} to act on. Be decisive.`
    : ideaElements?.length > 1
      ? `Deliver a FINAL VERDICT on the ${ideaElements.length} elements compared. Which is strongest? Is there a hybrid that beats them all? Be decisive — not "it depends".`
      : `Deliver a FINAL VERDICT on the assessed idea. Overall score. Top 3 most important improvements. No hedging.`;

  const extraSections = requestMode === 'get-inspired'
    ? `\n### Top Ideas Ranked\n1. [...] [Source: ...]\n2. [...] [Source: ...]\n3. [...] [Source: ...]`
    : ideaElements?.length > 1
      ? `\n### Final Element Verdict\n[Which element wins and why — or describe the ideal hybrid with citations]`
      : `\n### Final Score & Priority Improvements\nOverall Score: X/10\n1. [Most important improvement] [Source: ...]\n2. [...]\n3. [...]`;

  return `You are the Moderator. All rounds are complete.

${verdictFocus}

FULL SESSION TRANSCRIPT:
${allTranscript}

ORIGINAL TASK: ${taskDescription}
BRAND: ${brand}
ASSESSMENT TYPE: ${assessmentTypeLabel}

Be DECISIVE. This is not an "on one hand / on the other hand" exercise. ${brand} needs a clear recommendation.

Format:

## Moderator Synthesis

### Points of Consensus
[What most personas agreed on — with citations]

### Dissenting Views Worth Noting
[Minority positions ${brand} should not ignore — with citations]

### Open Questions
[What the Knowledge Base or this session could not resolve]

${projectType === 'Big Idea' ? `### The Recommended Big Idea(s) for ${brand}

**Frontrunner 1: [Idea Name]**
[2–3 sentence articulation of the Big Idea]
*Why it won:* [What the debate established — Brand Truth, Cultural Relevance, Longevity, Distinctiveness scores]
*Knowledge Base Evidence:* [Key citations]

**Frontrunner 2 (if applicable): [Idea Name]**
[Description and rationale]

**Ideas That Were Rejected and Why:**
[Brief note on strong candidates that didn't survive the debate — what killed them]

**Recommended Next Step:**
[What ${brand} should do to develop and test the frontrunner(s)]` : `### Final Recommendations for ${brand}
1. [Specific action] [Source: ...]
2. [Specific action] [Source: ...]
3. [Specific action] [Source: ...]`}
${extraSections}

---`;
}

// ─── Persona prompts ────────────────────────────────────────────────��──────────

function buildRound1PersonaPrompt({
  persona, kbContext, kbModeInstructions, brand, projectType,
  hexLabel, hexId, taskDescription, assessmentTypeLabel, projectTypePrompt,
  requestMode, ideaElements, gemsBlock = '', iterationContextBlock = '',
  zappiQuestionsBlock = '', storyBlock = '',
}) {
  const name = persona.name || persona.identity?.name || 'Expert';
  const personaBlock = buildPersonaIdentityBlock(persona);

  // Big Idea has its own structured Round 1 format
  const isBigIdea = projectType === 'Big Idea';

  const hasStory = !!storyBlock;
  const hasIdeas = (ideaElements?.length > 0);

  const modeBlock = isBigIdea
    ? `ROUND 1 MODE: BIG IDEA GENERATION
Your task: Propose exactly 3 Big Idea candidates for ${brand}.

A Big Idea is the central organising thought for the brand — not a campaign, not a tagline. The one idea that defines what the brand uniquely stands for in culture and can sustain it for a decade.

For each of your 3 ideas:
1. NAME the idea (a short memorable phrase)
2. DESCRIBE it in 2–3 sentences — what does the brand stand for, what does it mean in the world?
3. GROUND it — cite 1–2 pieces of Knowledge Base evidence that make this idea true for ${brand}
4. STATE what makes it distinctive — why could ONLY ${brand} own this?

Your 3 ideas must be genuinely different — not variations on a single theme. Surprise the room.`
    : hasStory && requestMode === 'get-inspired'
    ? `ROUND 1 MODE: ADVERTISING DEVELOPMENT
A brand story has been written for ${brand} (see above). Your task is to develop it into advertising.
Generate 3+ specific, executable advertising ideas that bring this story to life — different formats, channels, or angles.
${hasIdeas ? 'Also consider the loaded ideas alongside the story — build on whichever is strongest.' : ''}
Each idea must be concrete enough to brief a creative team: medium, format, the core execution, and why it fits the story.`
    : hasStory && !hasIdeas
    ? `ROUND 1 MODE: ADVERTISING ASSESSMENT
A brand story has been written for ${brand} (see above). Your task is to assess it as advertising creative.
Evaluate it rigorously: what works emotionally and strategically, what's weak, where it would succeed or fail in market.
Score it 1–10 as advertising. Recommend specific, concrete improvements.`
    : hasStory && hasIdeas
    ? `ROUND 1 MODE: COMBINED ASSESSMENT — Story + Ideas
A brand story AND additional ideas are both available for ${brand} (see above and task below).
Assess both together: how do they relate? Which is stronger? Score each 1–10. Recommend how to combine or strengthen them.`
    : requestMode === 'get-inspired'
    ? `ROUND 1 MODE: GENERATIVE
Generate 3+ original, specific, actionable ideas. Do not assess or hedge. Be creative and bold.
Each idea must be different in approach — not variations on a single theme.`
    : ideaElements?.length > 1
      ? `ROUND 1 MODE: COMPARATIVE ASSESSMENT
You are assessing ${ideaElements.length} distinct elements. Score each 1–10 independently.
Be opinionated — diplomatic non-answers are a failure in this session.`
      : `ROUND 1 MODE: CRITICAL ASSESSMENT
You are assessing a single idea. Be rigorous. Score it 1–10. Ground every judgment in evidence.`;

  const outputFormat = isBigIdea
    ? `**Big Idea 1: [Name]**
[2–3 sentence description of the central brand idea]
*Brand Truth:* [Knowledge Base citation] · *Why only ${brand}:* [What makes it ownable]

**Big Idea 2: [Name]**
[2–3 sentence description]
*Brand Truth:* [Knowledge Base citation] · *Why only ${brand}:* [What makes it ownable]

**Big Idea 3: [Name]**
[2–3 sentence description]
*Brand Truth:* [Knowledge Base citation] · *Why only ${brand}:* [What makes it ownable]`
    : requestMode === 'get-inspired'
    ? `**Ideas Generated:**
1. [Idea name]: [Specific description with enough detail to act on] [Source: ...]
2. [Idea name]: [Specific description] [Source: ...]
3. [Idea name]: [Specific description] [Source: ...]`
    : ideaElements?.length > 1
      ? ideaElements.map((el, i) =>
          `**Element ${i + 1} — "${el.label || `Option ${i + 1}`}":**\n[Assessment + Score: X/10 + Rationale]`
        ).join('\n\n')
      : `**Assessment:**\n[Your evaluation — strengths, weaknesses, evidence]\n\n**Score: X/10**\n[Rationale]`;

  return `${personaBlock}

${kbModeInstructions}

KNOWLEDGE BASE CONTENT (read carefully — cite specifically):
${kbContext}

PROJECT TYPE CONTEXT:
${projectTypePrompt}
${storyBlock ? `\n${storyBlock}` : ''}
${gemsBlock ? `\n${gemsBlock}` : ''}
${iterationContextBlock ? `\n${iterationContextBlock}` : ''}

${modeBlock}

ROUND 1 RULES:
- Share YOUR independent expert perspective ONLY — do not try to anticipate others
- Be opinionated. Hedged, diplomatic answers are a failure.
- You MUST address at least 2 of your "Questions You Always Ask" listed above
- Every factual claim must be cited per the knowledge mode above
- This is Round 1 — you have not seen other personas' views yet. Stay original.
${zappiQuestionsBlock ? `- After your scoring section, you MUST complete the ZAPPI RESPONSES for every idea scored (see instructions below).` : ''}

TASK: ${taskDescription}
BRAND: ${brand}
PROJECT TYPE: ${projectType}
CONTEXT: ${hexLabel || hexId}
ASSESSMENT TYPE: ${assessmentTypeLabel}

Respond as ${name}. Be specific, direct, opinionated.

Format your response as:

### ${name}

**My Expert Perspective:**
[What your specific background tells you about this task that others would miss]

${outputFormat}
${zappiQuestionsBlock ? `\n${zappiQuestionsBlock}\n` : ''}
**What I'd Debate in Round 2:**
[1–2 sharp questions or provocations you'd put to the other personas]

---`;
}

function buildDebatePersonaPrompt({
  persona, kbContext, kbModeInstructions, brand, projectType = '',
  hexLabel, hexId, taskDescription, assessmentTypeLabel, projectTypePrompt,
  priorTranscript, roundNumber, allPersonaNames, requestMode, ideaElements,
  gemsBlock = '', iterationContextBlock = '', storyBlock = '',
}) {
  const name = persona.name || persona.identity?.name || 'Expert';
  const personaBlock = buildPersonaIdentityBlock(persona);
  const othersNames = allPersonaNames.filter(n => n !== name);
  const isBigIdea = projectType === 'Big Idea';

  const modeBlock = isBigIdea
    ? `ROUND ${roundNumber} MODE: BIG IDEA CONVERGENCE
Round 1 produced Big Idea candidates from all personas. Your task: debate and converge on the strongest 1–2 ideas.

FOR EACH KEY IDEA YOU ADDRESS:
- Score it 1–10 across: Brand Truth · Cultural Relevance · Longevity · Distinctiveness
- State: ADVANCE / REJECT / COMBINE with another idea — and why
- If you see a stronger synthesis of two ideas, NAME IT and describe it in 2–3 sentences

DEBATE RULES:
- Kill ideas any brand in the category could claim — generic = dead
- Fight for ideas with genuine Knowledge Base grounding — defend them with evidence
- Propose combinations when you see complementary strengths
- By the end of this round the room should converge on 1–2 frontrunners
- Address other personas by name when agreeing or challenging`
    : requestMode === 'get-inspired'
    ? `ROUND ${roundNumber} MODE: IDEA DEBATE & REFINEMENT
Build on, challenge, or reject specific ideas from prior rounds — name the persona each time.
Which ideas are strongest? Which are flawed? Can you combine ideas into something better?`
    : ideaElements?.length > 1
      ? `ROUND ${roundNumber} MODE: SCORING CHALLENGE
Challenge the scores and rankings from prior rounds. If you disagree with another persona's verdict, say so and back it with Knowledge Base evidence.
Can you identify a hybrid element that beats all individual options?`
      : `ROUND ${roundNumber} MODE: CRITICAL DEBATE
Challenge the assessments from prior rounds. Was someone too harsh? Too generous? Call it out with evidence.
What improvements did others miss that your background tells you are critical?`;

  return `${personaBlock}

${kbModeInstructions}

KNOWLEDGE BASE CONTENT:
${kbContext}

PROJECT TYPE CONTEXT:
${projectTypePrompt}
${storyBlock ? `\n${storyBlock}` : ''}
${gemsBlock ? `\n${gemsBlock}` : ''}
${iterationContextBlock ? `\n${iterationContextBlock}` : ''}

${modeBlock}

ROUND ${roundNumber} DEBATE RULES — ALL MANDATORY:
1. You MUST reference at least 2 other personas by name: ${othersNames.join(', ')}
2. For each: either agree-and-extend their specific point OR directly challenge it with evidence
3. If you think someone is WRONG, say so explicitly and cite Knowledge Base evidence against their claim
4. Score or rank ideas/elements from prior rounds from your expert perspective
5. Flag at least 1 BLIND SPOT — something important no one has addressed yet
6. Ask ONE probing question directed at a specific named persona
7. Every factual claim must be cited per the knowledge mode above

PRIOR TRANSCRIPT (engage with this directly — do not ignore what's been said):
${priorTranscript}

TASK: ${taskDescription}
BRAND: ${brand}
CONTEXT: ${hexLabel || hexId}

Respond as ${name} in debate mode.

Format:

### ${name} — Round ${roundNumber}

**Where I Agree (and will push further):**
[Name the persona + their specific point + your extension with citation]

**Where I Disagree:**
[Name the persona + their specific claim + your counter-argument + citation]

**What No One Has Said Yet:**
[Your original contribution — the blind spot you're flagging]

${isBigIdea ? `**My Big Idea Scores:**
[For each idea you addressed: Name — Brand Truth X/10 · Cultural Relevance X/10 · Longevity X/10 · Distinctiveness X/10 — ADVANCE/REJECT/COMBINE]

**My Recommended Frontrunner(s):**
[Name the 1–2 ideas you think should advance, and why]

` : requestMode !== 'get-inspired' ? `**My Updated Scores:**
[Revised scores/rankings with rationale based on the debate so far]

` : ''}**Question for [Specific Persona Name]:**
[Your probing question — not rhetorical, genuinely demands an answer]

---`;
}

// ─── Fact-Checker ──────────────────────────────────────────────────────────────

function buildFactCheckerPrompt({ fullTranscript, kbFileNames, kbMode }) {
  const modeNote = kbMode === 'hard-forbidden'
    ? '⚠️ IMPORTANT: [General Knowledge] citations are a VIOLATION in this session — flag every single one.'
    : kbMode === 'strong-preference'
      ? '⚠️ NOTE: [General Knowledge] citations are allowed but should be rare — flag any where Knowledge Base evidence clearly exists.'
      : '✅ NOTE: Both [Source: ...] and [General Knowledge] citations are valid in this session.';

  return `You are the Fact-Checker. Your ONLY job is citation verification — not analysis, not commentary.

${modeNote}

AUTHORISED KNOWLEDGE BASE FILES (exact names — case matters):
${kbFileNames.map(f => `- ${f}`).join('\n')}

FULL TRANSCRIPT TO AUDIT:
${fullTranscript}

For every [Source: filename.ext] citation in the transcript:
1. Check it matches one of the authorised filenames exactly
2. Flag any that don't match (wrong name, invented filename, typo)
3. Note any claims that clearly need a citation but have none

Format:

### Fact-Checker

**Citation Audit:**
- ✅ [Source: filename.ext] — Verified, matches Knowledge Base
- ❌ [Source: wrong_name.pdf] — NOT found in Knowledge Base (used by [Persona Name], Round [N])
${kbMode === 'hard-forbidden' ? '- 🚫 [General Knowledge] — FORBIDDEN in this session (used by [Persona Name], Round [N])' : ''}

**Uncited Claims Flagged:**
- "[paraphrase of claim]" — [Persona Name], Round [N] — citation required

**Audit Summary:** [N] citations verified ✅ | [N] citation errors ❌ | [N] uncited claims flagged

---`;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Iteration context builder ────────────────────────────────────────────────

/**
 * Builds a prompt block summarising what other hexes have already produced
 * in this iteration, and which gems the user has saved so far this session.
 *
 * Injected into every persona prompt and the Moderator opening so personas
 * build forward from existing work rather than repeating it.
 *
 * Prior hex results are truncated to 500 chars each to keep prompt size bounded.
 * Iteration gems are shown in full — they're short by nature.
 */
function buildIterationContextBlock({ hexExecutions = {}, iterationGems = [], currentHexId = '' }) {
  const lines = [];

  // ── Prior hex results ──────────────────────────────────────────────────────
  const hexOrder = [
    'stories', 'Luminaries', 'panelist', 'Consumers', 'competitors',
    'Colleagues', 'cultural', 'test', 'Grade',
  ];

  const priorHexResults = hexOrder
    .filter(hid => hid !== currentHexId && hexExecutions[hid]?.length > 0)
    .map(hid => {
      const executions = hexExecutions[hid];
      const latest = executions[executions.length - 1];
      const assessment = (latest.assessment || '').trim();
      if (!assessment) return null;
      const typeLabel = Array.isArray(latest.assessmentType)
        ? latest.assessmentType.join(', ')
        : (latest.assessmentType || 'assessment');
      // Stories get a larger window and synopsis as lead
      if (hid === 'stories') {
        const synopsis = latest.synopsis ? `Synopsis: ${latest.synopsis}\n\n` : '';
        const limit = 2000;
        const body = assessment.length > limit ? assessment.substring(0, limit) + '… [truncated]' : assessment;
        return `### Brand Story (${typeLabel})\n${synopsis}${body}`;
      }
      const truncated = assessment.length > 500
        ? assessment.substring(0, 500) + '… [truncated]'
        : assessment;
      return `### ${hid} (${typeLabel})\n${truncated}`;
    })
    .filter(Boolean);

  if (priorHexResults.length > 0) {
    lines.push(`WHAT THIS ITERATION HAS ALREADY ESTABLISHED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following hexes have already run in this iteration.
Build on their findings — do not repeat or contradict without strong evidence.

${priorHexResults.join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  // ── Gems saved this iteration ──────────────────────────────────────────────
  if (iterationGems.length > 0) {
    const grouped = {};
    for (const gem of iterationGems) {
      const key = gem.hexLabel || gem.hexId || 'General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(gem);
    }

    const gemLines = Object.entries(grouped).map(([hexLabel, gems]) => {
      const items = gems.map((g, i) =>
        `  ${i + 1}. "${g.gemText}"${g.fileName ? ` [from: ${g.fileName}]` : ''}`
      ).join('\n');
      return hexLabel + ':\n' + items;
    }).join('\n\n');

    lines.push(`GEMS SAVED THIS ITERATION — OUTPUTS THE USER MARKED AS EXEMPLARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These were saved from other hexes in this same iteration.
They show the quality and direction the user wants this work to move towards.

${gemLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  return lines.join('\n\n');
}

// ─── Gem fetcher ───────────────────────────────────────────────────────────────

/**
 * Fetches saved gems for this brand + hex from the gems table.
 * These are injected into every persona prompt as directional examples —
 * "this is the kind of output that went in the right direction."
 * Non-fatal: if the fetch fails, assessment continues without gems.
 */
async function fetchPriorGems({ brand, projectType, hexId, workspaceHost, accessToken, warehouseId, schema, limit = 5 }) {
  try {
    const conditions = [];
    if (brand) conditions.push(`brand = '${brand.replace(/'/g, "''")}'`);
    if (projectType) conditions.push(`project_type = '${projectType.replace(/'/g, "''")}'`);
    if (hexId) conditions.push(`hex_id = '${hexId.replace(/'/g, "''")}'`);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement: `
          SELECT gem_text, file_name, created_at
          FROM knowledge_base.${schema}.gems
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `,
        wait_timeout: '15s',
      }),
    });

    if (!resp.ok) {
      console.warn(`[Assessment] Gems fetch failed (${resp.status}) — continuing without gems`);
      return [];
    }

    const result = await resp.json();
    const rows = result.result?.data_array || [];
    return rows.map(row => ({ gemText: row[0], fileName: row[1], createdAt: row[2] }));
  } catch (e) {
    console.warn(`[Assessment] Gems fetch error (non-fatal): ${e.message}`);
    return [];
  }
}

/**
 * Builds the gems block injected into prompts.
 * Empty string if no gems — prompt builders check for this.
 */
/**
 * Builds the unified iteration signals block covering all three types:
 * Gems (really like), Checks (interested in), Coal (avoid).
 * These come from the user's selections across all hexes in the current iteration,
 * confirmed and ranked via the review panel after each assessment.
 */
function buildIterationSignalsBlock({ iterationGems = [], iterationChecks = [], iterationCoal = [] }) {
  const hasGems   = iterationGems.length > 0;
  const hasChecks = iterationChecks.length > 0;
  const hasCoal   = iterationCoal.length > 0;

  if (!hasGems && !hasChecks && !hasCoal) return '';

  let block = `
USER PREFERENCES FROM THIS ITERATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has reviewed and ranked their selections from previous hexes in this iteration.
Respect these preferences in your response — they reflect considered user judgment.

`;

  if (hasGems) {
    block += `💎 ELEMENTS WE REALLY LIKE (ranked by importance):
`;
    iterationGems.forEach((g, i) => {
      block += `${i + 1}. "${g.gemText || g.text}"${g.fileName ? ` [from: ${g.fileName}]` : ''} [${g.hexLabel || g.hexId}]
`;
    });
    block += `→ Build on these directions. They represent what "going well" looks like for this brand.

`;
  }

  if (hasChecks) {
    block += `✓ ELEMENTS WE'RE INTERESTED IN (ranked by importance):
`;
    iterationChecks.forEach((c, i) => {
      block += `${i + 1}. "${c.text}" [${c.hexLabel || c.hexId}]
`;
    });
    block += `→ These are worth exploring further. Don't ignore them.

`;
  }

  if (hasCoal) {
    block += `🪨 ELEMENTS TO AVOID (ranked by importance):
`;
    iterationCoal.forEach((c, i) => {
      block += `${i + 1}. "${c.text}" [${c.hexLabel || c.hexId}]
`;
    });
    block += `→ Actively steer away from these directions. Challenge any persona who moves toward them.
`;
  }

  block += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  return block;
}

function buildGemsBlock(gems) {
  if (!gems || gems.length === 0) return '';

  const gemLines = gems.map((g, i) =>
    `${i + 1}. "${g.gemText}"${g.fileName ? ` [from: ${g.fileName}]` : ''}`
  ).join('\n');

  return `
PRIOR GEMS — EXAMPLES GOING IN THE RIGHT DIRECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has saved these outputs from previous sessions as exemplary.
They represent the quality, tone, and direction they want more of.
Use them as directional calibration — not as facts to cite.

${gemLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Calls the Databricks model endpoint and logs the exact prompt sent.
 */
async function callModel({
  workspaceHost, accessToken, modelEndpoint,
  messages, maxTokens = 2000, temperature = 0.8, label = '',
  brand = '', projectType = '', hexId = '', userEmail = '',
  exampleAttachments = [], // Array of { fileName, base64, ext } for multimodal Example files
}) {
  // If document-capable model and there are Example file attachments, upgrade the last
  // user message to a multimodal content array (text + document image_url parts)
  if (exampleAttachments.length > 0) {
    const EXT_MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
    messages = messages.map((msg, i) => {
      if (i === messages.length - 1 && msg.role === 'user' && typeof msg.content === 'string') {
        const parts = [{ type: 'text', text: msg.content }];
        for (const att of exampleAttachments) {
          const mime = EXT_MIME[att.ext] || 'application/octet-stream';
          parts.push({
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${att.base64}` },
          });
        }
        return { ...msg, content: parts };
      }
      return msg;
    });
  }
  // Log exact prompt to activity_log before sending
  logEvent({
    eventType: 'prompt_sent',
    severity: 'info',
    userEmail,
    brand,
    projectType,
    hexId,
    message: `Prompt sent [${label || 'unknown'}] to ${modelEndpoint}`,
    details: {
      label,
      modelEndpoint,
      messageCount: messages.length,
      systemPrompt: messages.find(m => m.role === 'system')?.content?.substring(0, 2000) ?? null,
      userPromptPreview: messages.find(m => m.role === 'user')?.content?.substring(0, 1000) ?? null,
      // Full prompt stored for debugging — truncated to avoid DB limits
      fullPromptJson: JSON.stringify(messages).substring(0, 8000),
      maxTokens,
      temperature,
    },
  });

  const makeBody = (includeTemp) => JSON.stringify(
    includeTemp ? { messages, max_tokens: maxTokens, temperature } : { messages, max_tokens: maxTokens }
  );

  let resp = await fetch(
    `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: makeBody(true),
    }
  );

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    // Some models reject custom temperature — retry without it
    if (errData?.error?.param === 'temperature' || errData?.error?.code === 'unsupported_value') {
      console.warn(`[Assessment] Model ${modelEndpoint} rejected temperature=${temperature}, retrying without it`);
      resp = await fetch(
        `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: makeBody(false),
        }
      );
      if (!resp.ok) {
        const retryErr = await resp.json().catch(() => ({}));
        throw new Error(`Model call failed [${label}]: ${retryErr?.error?.message || retryErr?.message || resp.statusText}`);
      }
    } else {
      throw new Error(`Model call failed [${label}]: ${errData?.error?.message || errData?.message || resp.statusText}`);
    }
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content || '';
  const finishReason = result.choices?.[0]?.finish_reason || 'unknown';

  if (finishReason === 'length') {
    console.warn(`[Assessment] ⚠️ TRUNCATED [${label}] — hit maxTokens (${maxTokens}). Response: ${content.length} chars.`);
  }

  logEvent({
    eventType: 'prompt_response',
    severity: finishReason === 'length' ? 'warn' : 'info',
    userEmail, brand, projectType, hexId,
    message: `Response [${label}]: ${content.length} chars | finish_reason: ${finishReason}`,
    details: { label, modelEndpoint, responseLength: content.length, finishReason, maxTokens },
  });

  return content;
}

// ─── KB file fetcher ───────────────────────────────────────────────────────────

// Model IDs that support native document reading (PDF/DOCX/image as multimodal input)
const DOCUMENT_CAPABLE_MODELS = new Set([
  'databricks-claude-sonnet-4-6',
  'databricks-gpt-5-2',
  'databricks-gpt-5-1',
  'databricks-gpt-5',
  'databricks-gemini-3-1-pro',
  'databricks-gemini-2-5-pro',
  'databricks-gpt-5-mini',
  'databricks-gemini-3-flash',
  'databricks-gemini-2-5-flash',
  'databricks-claude-haiku-4-5',
]);

async function fetchKbFileContent(kbFile, accessToken, workspaceHost, warehouseId, fetchOriginalBinary = false) {
  const idClause = kbFile.fileId
    ? `file_id = '${kbFile.fileId.replace(/'/g, "''")}'`
    : `file_name = '${kbFile.fileName.replace(/'/g, "''")}'`;

  const metaResp = await fetch(
    `https://${workspaceHost}/api/2.0/sql/statements`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement: `SELECT file_id, file_path, file_name, file_type, file_size_bytes, cleaning_status
                    FROM knowledge_base.cohive.file_metadata
                    WHERE ${idClause} LIMIT 1`,
        wait_timeout: '30s',
      }),
    }
  );

  if (!metaResp.ok) {
    const errBody = await metaResp.text().catch(() => '');
    if (metaResp.status === 403) {
      throw new Error(
        `Access denied (403) querying knowledge_base.cohive.file_metadata for "${kbFile.fileName}". ` +
        `The service principal or user token does not have SELECT permission on this table. ` +
        `Grant: GRANT SELECT ON TABLE knowledge_base.cohive.file_metadata TO <principal>. ` +
        `Raw error: ${errBody.substring(0, 300)}`
      );
    }
    throw new Error(`Metadata query failed: ${metaResp.status} — ${errBody.substring(0, 200)}`);
  }

  const metaResult = await metaResp.json();
  const rows = metaResult.result?.data_array || [];
  if (rows.length === 0) throw new Error(`File not found in KB: "${kbFile.fileName}"`);

  const [resolvedFileId, filePath, fileName, fileType] = rows[0];
  console.log(`[Assessment] ✅ Resolved KB file: ${fileName} (type: ${fileType})`);

  // For Example files when the model supports documents, also fetch original binary
  let originalBase64 = null;
  let originalExt = null;
  if (fetchOriginalBinary && fileType === 'Example') {
    const origExt = fileName.toLowerCase().split('.').pop();
    const DOCUMENT_EXTS = new Set(['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'gif', 'webp']);
    if (DOCUMENT_EXTS.has(origExt)) {
      try {
        const origResp = await fetch(
          `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (origResp.ok) {
          const origBuffer = Buffer.from(await origResp.arrayBuffer());
          originalBase64 = origBuffer.toString('base64');
          originalExt = origExt;
          console.log(`[Assessment] 📎 Original binary fetched for Example: ${fileName} (${origBuffer.length} bytes)`);
        }
      } catch (e) {
        console.warn(`[Assessment] Could not fetch original binary for ${fileName}: ${e.message}`);
      }
    }
  }

  // ── Check for _txt.txt version (processed file) ────────────────────────────
  // If a processed text version exists, use it for faster, better extraction
  const txtFileId = `${resolvedFileId}_txt`;
  const txtMetaResp = await fetch(
    `https://${workspaceHost}/api/2.0/sql/statements`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement: `SELECT file_id, file_path, file_name
                    FROM knowledge_base.cohive.file_metadata
                    WHERE file_id = '${txtFileId.replace(/'/g, "''")}' LIMIT 1`,
        wait_timeout: '10s',
      }),
    }
  ).catch(() => null);

  if (txtMetaResp?.ok) {
    const txtResult = await txtMetaResp.json().catch(() => null);
    const txtRows = txtResult?.result?.data_array || [];
    if (txtRows.length > 0) {
      const [txtId, txtPath, txtName] = txtRows[0];
      console.log(`[Assessment] 🎯 Using processed _txt version: ${txtName}`);

      const txtFileResp = await fetch(
        `https://${workspaceHost}/api/2.0/fs/files${txtPath}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (txtFileResp.ok) {
        const txtBuffer = Buffer.from(await txtFileResp.arrayBuffer());
        let textContent = txtBuffer.toString('utf-8');

        if (textContent.length > MAX_KB_CHARS) {
          textContent = textContent.slice(0, MAX_KB_CHARS) + '\n\n[... content truncated ...]';
        }

        return { fileId: txtId, fileName: txtName, content: textContent, fileType, originalBase64, originalExt };
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const fileResp = await fetch(
    `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!fileResp.ok) throw new Error(`File download failed: ${fileResp.status}`);

  const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
  const ext = fileName.toLowerCase().split('.').pop();
  let textContent = '';

  if (['txt', 'md', 'csv'].includes(ext)) {
    textContent = fileBuffer.toString('utf-8');
  } else if (ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      textContent = (await pdfParse(fileBuffer)).text || '';
    } catch (e) {
      textContent = `[PDF extraction failed for ${fileName}: ${e.message}]`;
    }
  } else if (['docx', 'doc'].includes(ext)) {
    try {
      const mammoth = await import('mammoth');
      textContent = (await mammoth.extractRawText({ buffer: fileBuffer })).value || '';
    } catch (e) {
      textContent = `[DOCX extraction failed for ${fileName}: ${e.message}]`;
    }
  } else if (['xlsx', 'xls'].includes(ext)) {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(fileBuffer, { type: 'buffer' });
      textContent = wb.SheetNames.map(s =>
        `=== ${s} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`
      ).join('\n\n');
    } catch (e) {
      textContent = `[XLSX extraction failed for ${fileName}: ${e.message}]`;
    }
  } else {
    try { textContent = fileBuffer.toString('utf-8'); }
    catch { textContent = `[Cannot extract text from ${fileName}]`; }
  }

  if (textContent.length > MAX_KB_CHARS) {
    textContent = textContent.slice(0, MAX_KB_CHARS) + '\n\n[... content truncated ...]';
  }

  return { fileId: resolvedFileId, fileName, content: textContent, fileType, originalBase64, originalExt };
}


// ─── Prior gems fetcher ────────────────────────────────────────────────────────

/**
 * Fetches the most recent approved gems for this brand + hex from Databricks.
 * Returns up to 5 gems as positive examples to guide the current session.
 * Non-fatal — if the query fails, the assessment runs without gem context.
 */
// fetchPriorGems defined above
/**
 * Formats prior gems into a prompt block that gives personas
 * concrete positive examples of what "good" looks like for this brand/hex.
 */

// ─── Zappi Questions block builder ────────────────────────────────────────────

const ZAPPI_FIXED_EMOJIS = '😊 Excited  😐 Neutral  😟 Concerned  🤔 Curious  😤 Frustrated  💡 Inspired  ❤️ Loved  😮 Surprised';

function buildZappiQuestionsBlock(brand, projectType) {
  const pt = projectType || 'concept';
  const b = brand || 'this brand';

  return `
ZAPPI CONCEPT TESTING QUESTIONS — REQUIRED FOR EACH IDEA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After your scoring section, you MUST answer all 7 questions below for EACH idea you scored, from your segment's perspective.
All scales run 1 (lowest/worst) → 5 (highest/best).

Q1. BRAND FIT: "How would you describe this ${pt} for ${b}?"
    1 = "It could be for any brand"  →  5 = "It could only be for this brand"

Q2. STANDOUT: "How well would it stand out and grab your attention?"
    1 = "Not at all well"  →  5 = "Very well"

Q3. OVERALL EMOTION: Choose ONE emoji from the fixed set that best captures your reaction:
    ${ZAPPI_FIXED_EMOJIS}
    Then add ONE freely chosen emoji that completes your emotional response.

Q4. RELEVANCE: "How relevant to you personally was this ${pt}?"
    1 = "Not at all relevant"  →  5 = "Very relevant"

Q5. EASE OF UNDERSTANDING: "How easy or difficult was it to understand?"
    1 = "Very difficult"  →  5 = "Very easy"

Q6. PURCHASE INTENT: "What impact would this have on your likelihood of choosing ${b}?"
    1 = "Makes me much less likely"  →  5 = "Makes me much more likely to choose ${b}"

Q7. BRAND APPEAL: "How has this made you feel about ${b}?"
    1 = "Makes the brand much less appealing"  →  5 = "Makes the brand much more appealing"

Format your Zappi responses as:

**ZAPPI RESPONSES — [Idea Name]**
Q1 Brand Fit: [score]/5 — [brief rationale]
Q2 Standout: [score]/5 — [brief rationale]
Q3 Emotion: [fixed-set emoji + name] + [freely chosen emoji] — [brief explanation]
Q4 Relevance: [score]/5 — [brief rationale]
Q5 Understanding: [score]/5 — [brief rationale]
Q6 Purchase Intent: [score]/5 — [brief rationale]
Q7 Brand Appeal: [score]/5 — [brief rationale]

(Repeat for each idea scored.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      hexId,
      hexLabel,
      brand,
      projectType,
      assessmentTypes,
      userSolution,
      ideasFile,
      ideaElements = [],            // Array<{ id, label, content }> — multiple ideas to compare
      selectedPersonas,
      customPersonaData = {},   // Record<id, contentJson> for custom- prefixed personas
      kbFiles,
      userEmail = '',
      accessToken,
      workspaceHost,
      modelEndpoint = 'databricks-claude-sonnet-4-6',
      projectTypeConfigs = [],

      // v3 additions
      kbMode = 'equal-weight',      // 'hard-forbidden' | 'strong-preference' | 'equal-weight'
      requestMode = 'load-ideas',   // 'get-inspired' | 'load-ideas'
      scope = 'brand',              // 'brand' | 'category' | 'general'
      numDebateRounds = 1,
      // Iteration context — prior hex results and gems saved this session
      hexExecutions = {},           // Record<hexId, HexExecution[]> from ProcessWireframe state
      iterationGems = [],           // IterationGem[] accumulated in AssessmentModal
      iterationChecks = [],         // elements of interest
      iterationCoal = [],           // elements to avoid
      iterationDirections = [],     // user-added focus/direction notes for this iteration
      // Per-hex fact-checker model — defaults to main model if not supplied
      factCheckerModelEndpoint = '',
    } = req.body;

    // ── Parse prior persona context markers injected by CentralHexView ────────
    // When user chooses "include prior personas" or "include summary",
    // CentralHexView appends a marker to userSolution before calling onExecute.
    let cleanedUserSolution = userSolution || '';
    let priorPersonasContext = '';
    let priorSummaryContext  = '';

    const priorPersonasMatch = cleanedUserSolution.match(/\[PRIOR_PERSONAS:\s*([^\]]+)\]/);
    if (priorPersonasMatch) {
      priorPersonasContext = priorPersonasMatch[1].trim();
      cleanedUserSolution  = cleanedUserSolution.replace(/\[PRIOR_PERSONAS:[^\]]+\]/, '').trim();
    }
    const priorSummaryMatch = cleanedUserSolution.match(/\[PRIOR_SUMMARY:\n([\s\S]+?)\n\]/);
    if (priorSummaryMatch) {
      priorSummaryContext  = priorSummaryMatch[1].trim();
      cleanedUserSolution  = cleanedUserSolution.replace(/\[PRIOR_SUMMARY:\n[\s\S]+?\n\]/, '').trim();
    }

    // Extract War Games competitor marker injected by CentralHexView
    let warGamesCompetitor = '';
    const wgMatch = cleanedUserSolution.match(/\[WAR_GAMES_COMPETITOR:\s*([^\]]+)\]/);
    if (wgMatch) {
      warGamesCompetitor = wgMatch[1].trim();
      cleanedUserSolution = cleanedUserSolution.replace(/\[WAR_GAMES_COMPETITOR:[^\]]+\]\n?/, '').trim();
    }

    // Extract Zappi Questions marker (Grade hex only)
    let includeZappiQuestions = false;
    if (cleanedUserSolution.includes('[ZAPPI_QUESTIONS:true]')) {
      includeZappiQuestions = true;
      cleanedUserSolution = cleanedUserSolution.replace(/\[ZAPPI_QUESTIONS:true\]\n?/, '').trim();
    }

    const priorContextBlock = priorPersonasContext
      ? `
PRIOR ROUND CONTEXT — PERSONAS PREVIOUSLY USED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following personas were used in a previous run of this hex: ${priorPersonasContext}.
They are joining this session. Their prior positions are part of the conversation history.
Acknowledge what has already been established and build forward — don't repeat ground already covered.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : priorSummaryContext
      ? `
PRIOR ROUND SUMMARY (context only):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${priorSummaryContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : '';

    // ── Credential resolution ────────────────────────────────────────────────
    // Prefer server-side env vars (getDatabricksConfig) — same pattern as all
    // other CoHive API routes (agent.js, summarize.js, prompt.js).
    // Fall back to req.body tokens only if env vars aren't configured
    // (user-passthrough OAuth mode).
    let resolvedToken = accessToken;
    let resolvedHost = workspaceHost;
    let resolvedWarehouseId = req.body.warehouseId || '';

    try {
      const envConfig = getDatabricksConfig();
      if (envConfig.accessToken && envConfig.workspaceHost) {
        resolvedToken = envConfig.accessToken;
        resolvedHost = envConfig.workspaceHost;
        console.log(`[Assessment] Using server-side env credentials (host: ${resolvedHost})`);
      }
      if (envConfig.warehouseId) {
        resolvedWarehouseId = envConfig.warehouseId;
        console.log(`[Assessment] Using env warehouse ID: ${resolvedWarehouseId}`);
      }
    } catch (e) {
      // getDatabricksConfig throws if env vars aren't set — fall back to req.body
      console.log(`[Assessment] Env credentials not available, using req.body token`);
    }

    if (!resolvedToken || !resolvedHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!resolvedWarehouseId) {
      return res.status(400).json({ error: 'Warehouse ID not configured. Set DATABRICKS_WAREHOUSE_ID in environment variables.' });
    }

    // Use resolved credentials for all downstream calls
    const accessToken_resolved = resolvedToken;
    const workspaceHost_resolved = resolvedHost;
    const warehouseId_resolved = resolvedWarehouseId;
    if (!kbFiles || kbFiles.length === 0) {
      return res.status(400).json({ error: 'At least one knowledge base file is required' });
    }

    console.log(`[Assessment] ── CoHive v3 ────────────────────────────────────────`);
    console.log(`[Assessment] Hex: ${hexId} | Brand: ${brand} | Type: ${projectType}`);
    console.log(`[Assessment] requestMode: ${requestMode} | kbMode: ${kbMode} | scope: ${scope}`);
    console.log(`[Assessment] ideaElements: ${ideaElements.length} | debateRounds: ${numDebateRounds}`);
    console.log(`[Assessment] personas: ${selectedPersonas?.join(', ')}`);
    console.log(`[Assessment] model: ${modelEndpoint}`);

    const callModelCtx = { workspaceHost: workspaceHost_resolved, accessToken: accessToken_resolved, modelEndpoint, brand, projectType, hexId, userEmail };

    // ── Step 1: Fetch KB file content ───────────────────────────────────────
    const modelSupportsDocuments = DOCUMENT_CAPABLE_MODELS.has(modelEndpoint);
    console.log(`[Assessment] Fetching ${kbFiles.length} KB file(s)... model supportsDocuments: ${modelSupportsDocuments}`);
    const kbFilesWithContent = await Promise.all(
      kbFiles.map(f => fetchKbFileContent(
        f, accessToken_resolved, workspaceHost_resolved, warehouseId_resolved,
        // Only fetch original binary for Example files when model supports documents
        modelSupportsDocuments && (f.fileType === 'Example')
      ))
    );

    // ── Step 1b: Fetch prior gems for this brand + hex ───────────────────────
    console.log(`[Assessment] Fetching prior gems for ${brand} / ${hexId}...`);
    const priorGems = await fetchPriorGems({
      brand, projectType, hexId,
      workspaceHost: workspaceHost_resolved,
      accessToken: accessToken_resolved,
      warehouseId: warehouseId_resolved,
      schema: 'cohive',
      limit: 5,
    });
    const gemsBlock = buildGemsBlock(priorGems);
    console.log(`[Assessment] Prior gems loaded: ${priorGems.length}`);

    // Build unified iteration signals (gems/checks/coal from review panel)
    const iterationSignalsBlock = buildIterationSignalsBlock({ iterationGems, iterationChecks, iterationCoal });

    // Combine: KB gems + iteration signals + prior persona context
    // Build user direction block — additional focus/insight added mid-iteration
    const directionsBlock = iterationDirections.length > 0 ? `
ADDITIONAL DIRECTION FROM USER — APPLY TO THIS AND ALL REMAINING PROMPTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has added the following focus, insight or direction partway through this iteration.
Apply it to your response — it reflects a refined brief that supersedes or supplements the original.
${iterationDirections.map((d, i) => `${i + 1}. ${d}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : '';

    const combinedSignals = [gemsBlock, iterationSignalsBlock, priorContextBlock, directionsBlock].filter(Boolean).join('\n\n');

    // Build iteration context from this session's hex results + saved gems
    const iterationContextBlock = buildIterationContextBlock({
      hexExecutions,
      iterationGems,
      currentHexId: hexId,
    });
    const priorHexCount = Object.keys(hexExecutions).filter(
      hid => hid !== hexId && hexExecutions[hid]?.length > 0
    ).length;
    console.log(`[Assessment] Iteration signals: ${iterationGems.length} gems, ${iterationChecks.length} checks, ${iterationCoal.length} coal`);
    console.log(`[Assessment] Prior context: ${priorPersonasContext ? 'personas' : priorSummaryContext ? 'summary' : 'none'}`);
    console.log(`[Assessment] Iteration context: ${priorHexCount} prior hex(es)`);

    // ── Step 2: Build shared context ────────────────────────────────────────
    const assessmentTypeLabel = assessmentTypes?.includes('recommend') ? 'Recommend'
      : assessmentTypes?.includes('assess') ? 'Assess'
      : 'Unified';

    let ideasContent = '';
    if (ideasFile?.content) {
      try {
        const b64 = ideasFile.content.includes(',') ? ideasFile.content.split(',')[1] : ideasFile.content;
        ideasContent = Buffer.from(b64, 'base64').toString('utf-8');
      } catch { ideasContent = ideasFile.content; }
    }

    const projectTypePrompt = resolveProjectTypePrompt(projectType, projectTypeConfigs);
    // Separate example files from regular KB files for distinct prompt treatment
    const regularFiles = kbFilesWithContent.filter(f => f.fileType !== 'Example');
    const exampleFiles = kbFilesWithContent.filter(f => f.fileType === 'Example');
    const hasExampleFiles = exampleFiles.length > 0;

    const kbFileNames = kbFilesWithContent.map(f => f.fileName);
    const kbModeInstructions = getKbModeInstructions(kbMode, kbFileNames, exampleFiles.map(f => f.fileName));

    // Regular files get standard wrappers; example files get a cross-brand reference wrapper.
    // For Example files with originalBase64 (model supports documents), we store them separately
    // to attach as multimodal content in callModel below.
    const exampleFilesWithBinary = exampleFiles.filter(f => f.originalBase64);
    const exampleFilesTextOnly = exampleFiles.filter(f => !f.originalBase64);

    const kbContext = [
      ...regularFiles.map(f =>
        `--- BEGIN FILE: ${f.fileName} ---\n${f.content}\n--- END FILE: ${f.fileName} ---`
      ),
      ...exampleFilesWithBinary.map(f =>
        `--- BEGIN EXAMPLE: ${f.fileName} ---\n` +
        `[NOTE: Cross-brand reference file — quality and format standard only.\n` +
        `This is NOT about the current brand. Do NOT cite as evidence about ${brand}.\n` +
        `The original document is attached for format reference. If you can replicate its format in your response, please do so.]\n\n` +
        `${f.content}\n` +
        `--- END EXAMPLE: ${f.fileName} ---`
      ),
      ...exampleFilesTextOnly.map(f =>
        `--- BEGIN EXAMPLE: ${f.fileName} ---\n` +
        `[NOTE: Cross-brand reference file — quality and format standard only.\n` +
        `This is NOT about the current brand. Do NOT cite as evidence about ${brand}.\n` +
        `Use to understand expected quality, tone, and structure only.]\n\n` +
        `${f.content}\n` +
        `--- END EXAMPLE: ${f.fileName} ---`
      ),
    ].join('\n\n');

    // For War Games, build a competitor context block prepended to the task
    const warGamesCompetitorBlock = (projectType === 'War Games' && warGamesCompetitor)
      ? `WAR GAMES SESSION\nBrand: ${brand}\nCompetitor: ${warGamesCompetitor}\n\nWork through all 5 steps of the War Games framework defined in the project type prompt. Use the exact names "${brand}" and "${warGamesCompetitor}" throughout all 5 steps.\n\n`
      : '';

    const rawTaskDescription = buildTaskDescription({
      requestMode, assessmentTypes, brand, hexLabel, hexId,
      ideasContent, ideaElements,
      userSolution: cleanedUserSolution,   // cleaned — prior markers stripped
      projectType, projectTypePrompt, scope,
    });

    // Extract the most recent story from this iteration (if any)
    const storyExecution = hexExecutions['stories']?.slice(-1)[0] || null;
    const storyBlock = buildStoryContextBlock(storyExecution);

    // When a story exists, prepend a clear task framing so personas know what they're working on
    const storyTaskPrefix = storyBlock
      ? (requestMode === 'get-inspired'
          ? `A brand story has been written for ${brand} (see BRAND STORY section below). Your primary task is to develop it into advertising — generate specific, executable ideas for formats, channels, and executions that bring it to life.${(ideaElements?.length > 0) ? ' Also consider the loaded ideas alongside the story.' : ''}\n\n`
          : `A brand story has been written for ${brand} (see BRAND STORY section below). Treat it as advertising creative — assess what works emotionally and strategically, what's weak, and recommend specific improvements.${(ideaElements?.length > 0) ? ' Assess any loaded ideas together with the story.' : ''}\n\n`)
      : '';
    const taskDescription = storyTaskPrefix + warGamesCompetitorBlock + rawTaskDescription;

    // Shuffle personas, load full persona data
    const basePersonas = selectedPersonas?.length > 0 ? [...selectedPersonas] : ['General Expert'];
    const personaData = basePersonas.map(id => {
      if (id.startsWith('custom-') && customPersonaData[id]) {
        return { ...customPersonaData[id], id };
      }
      return getPersonaContent(id);
    });
    const shuffledPersonaData = shuffleArray(personaData);
    const allPersonaNames = shuffledPersonaData.map(p => p.name || p.identity?.name || p.id);
    const personaList = [...allPersonaNames, 'Fact-Checker'].join(', ');

    console.log(`[Assessment] Personas (shuffled): ${personaList}`);

    // Multimodal attachments for document-capable models — Example files only
    const exampleAttachments = exampleFilesWithBinary.map(f => ({
      fileName: f.fileName,
      base64: f.originalBase64,
      ext: f.originalExt,
    }));

    // Shared context passed to all prompt builders
    const promptCtx = {
      brand, projectType, hexLabel, hexId, assessmentTypeLabel,
      taskDescription, kbContext, kbFileNames, kbModeInstructions,
      projectTypePrompt, requestMode, ideaElements, scope,
      gemsBlock: combinedSignals,  // KB gems + iteration signals + prior persona context
      iterationContextBlock,       // prior hex results + iteration gems
      storyBlock,                  // full story written this iteration (if any)
      hasExampleFiles,             // true if any selected KB files are Example type
      exampleFileNames: exampleFiles.map(f => f.fileName),
      zappiQuestionsBlock: (includeZappiQuestions && hexId === 'Grade')
        ? buildZappiQuestionsBlock(brand, projectType)
        : '',
    };

    // ── Step 3: SSE setup ────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sseRound = (round) => {
      res.write(`event: round\ndata: ${JSON.stringify(round)}\n\n`);
    };

    const rounds = [];
    let fullTranscript = '';

    const pushRound = (round) => {
      rounds.push(round);
      sseRound(round);
    };

    // ── Round 0: Moderator Opening ───────────────────────────────────────────
    console.log(`[Assessment] Round 0: Moderator opening...`);
    const moderatorOpening = await callModel({
      ...callModelCtx,
      messages: [{
        role: 'user',
        content: buildModeratorOpeningPrompt({ ...promptCtx, personaList, kbMode }),
      }],
      maxTokens: 1200, temperature: 0.5,
      label: 'Moderator Opening',
    });

    const r0 = { roundNumber: 0, label: 'Moderator Opening', content: moderatorOpening, timestamp: new Date().toISOString() };
    pushRound(r0);
    fullTranscript += `## Moderator Opening\n\n${moderatorOpening}\n\n---\n\n`;
    console.log(`[Assessment] Moderator opening done (${moderatorOpening.length} chars)`);

    // ── Round 1: Parallel persona share ─────────────────────────────────────
    console.log(`[Assessment] Round 1: Firing ${shuffledPersonaData.length} personas in parallel (Promise.all)...`);

    const round1Responses = await Promise.all(
      shuffledPersonaData.map(persona =>
        callModel({
          ...callModelCtx,
          messages: [{
            role: 'user',
            content: buildRound1PersonaPrompt({ persona, ...promptCtx }),
          }],
          maxTokens: 2000, temperature: 0.85,
          label: `R1:${persona.name || persona.id}`,
          exampleAttachments,
        })
      )
    );

    let round1Content = `## Round 1 — Independent Expert Views\n\n`;
    round1Responses.forEach(r => { round1Content += `${r}\n\n`; });

    const r1 = { roundNumber: 1, label: 'Round 1 — Independent Expert Views', content: round1Content, timestamp: new Date().toISOString() };
    pushRound(r1);
    fullTranscript += `${round1Content}\n\n---\n\n`;
    console.log(`[Assessment] Round 1 complete (${round1Responses.length} parallel responses)`);

    // ── Round 2+: Debate rounds ──────────────────────────────────────────────
    // Skip debate rounds if there is only one persona — a single voice has no one to debate.
    // Skip debate for single persona OR War Games (structured sequential analysis, not debate)
    const actualDebateRounds = (shuffledPersonaData.length <= 1 || projectType === 'War Games')
      ? 0
      : Math.max(1, Math.min(numDebateRounds, MAX_DEBATE_ROUNDS));

    for (let d = 1; d <= actualDebateRounds; d++) {
      const roundNumber = d + 1;
      console.log(`[Assessment] Round ${roundNumber}: Moderator recap...`);

      const recap = await callModel({
        ...callModelCtx,
        messages: [{
          role: 'user',
          content: buildModeratorRecapPrompt({
            roundNumber, priorTranscript: fullTranscript,
            brand, personaList, taskDescription, requestMode,
          }),
        }],
        maxTokens: 1500, temperature: 0.5,
        label: `Moderator Recap R${roundNumber}`,
      });

      let debateContent = `## Round ${roundNumber} — Debate & Challenge\n\n${recap}\n\n---\n\n`;

      // Re-shuffle order each debate round to prevent anchoring
      const debateOrder = shuffleArray(shuffledPersonaData);

      console.log(`[Assessment] Round ${roundNumber}: Firing ${debateOrder.length} personas in parallel...`);
      const debateResponses = await Promise.all(
        debateOrder.map(persona =>
          callModel({
            ...callModelCtx,
            messages: [{
              role: 'user',
              content: buildDebatePersonaPrompt({
                persona, ...promptCtx,
                priorTranscript: fullTranscript,
                roundNumber, allPersonaNames,
                projectType,
              }),
            }],
            maxTokens: 2000, temperature: 0.85,
            label: `R${roundNumber}:${persona.name || persona.id}`,
            exampleAttachments,
          })
        )
      );

      debateResponses.forEach(r => { debateContent += `${r}\n\n`; });

      const rDebate = {
        roundNumber,
        label: `Round ${roundNumber} — Debate & Challenge`,
        content: debateContent,
        timestamp: new Date().toISOString(),
      };
      pushRound(rDebate);
      fullTranscript += `${debateContent}\n\n---\n\n`;
      console.log(`[Assessment] Round ${roundNumber} complete`);
    }

    // ── Fact-Checker ─────────────────────────────────────────────────────────
    const fcModelEndpoint = factCheckerModelEndpoint || callModelCtx.modelEndpoint;
    console.log(`[Assessment] Fact-Checker... model: ${fcModelEndpoint}`);
    const factCheckContent = await callModel({
      ...callModelCtx,
      modelEndpoint: fcModelEndpoint,
      messages: [{
        role: 'user',
        content: buildFactCheckerPrompt({ fullTranscript, kbFileNames, kbMode }),
      }],
      maxTokens: 1500, temperature: 0.2,
      label: 'Fact-Checker',
    });

    const fcRoundNumber = 1 + actualDebateRounds + 1; // 0=ModOpen, 1=R1, 2..n=debate, n+1=FC
    const rFC = {
      roundNumber: fcRoundNumber,
      label: 'Fact-Checker',
      content: `## Fact-Checker\n\n${factCheckContent}`,
      timestamp: new Date().toISOString(),
    };
    pushRound(rFC);
    fullTranscript += `## Fact-Checker\n\n${factCheckContent}\n\n---\n\n`;
    console.log(`[Assessment] Fact-Checker done (${factCheckContent.length} chars)`);

    // ── Moderator Synthesis ───────────────────────────────────────────────────
    console.log(`[Assessment] Moderator synthesis...`);
    const synthesisContent = await callModel({
      ...callModelCtx,
      messages: [{
        role: 'user',
        content: buildModeratorClosingPrompt({
          allTranscript: fullTranscript, brand, projectType, taskDescription,
          assessmentTypeLabel, requestMode, ideaElements,
        }),
      }],
      maxTokens: 2500, temperature: 0.5,
      label: 'Moderator Synthesis',
    });

    const rSynth = {
      roundNumber: fcRoundNumber + 1,
      label: 'Moderator Synthesis',
      content: `## Moderator Synthesis\n\n${synthesisContent}`,
      timestamp: new Date().toISOString(),
    };
    pushRound(rSynth);
    console.log(`[Assessment] Synthesis done (${synthesisContent.length} chars)`);

    // ── Neutral summarizer ────────────────────────────────────────────────────
    let summary = null;
    try {
      console.log(`[Assessment] Summarizer...`);
      logEvent({
        eventType: 'prompt_sent', severity: 'info',
        userEmail, brand, projectType, hexId,
        message: 'Summarizer prompt sent',
        details: {
          label: 'Summarizer', modelEndpoint,
          systemPrompt: SUMMARIZER_SYSTEM_PROMPT,
        },
      });

      const summaryResp = await fetch(
        `https://${workspaceHost_resolved}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken_resolved}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
              {
                role: 'user',
                content: `Summarize this multi-persona assessment for ${brand} (${assessmentTypeLabel}):\n\n${rounds.map(r => `## ${r.label}\n\n${r.content}`).join('\n\n---\n\n')}`,
              },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        }
      );

      if (summaryResp.ok) {
        summary = (await summaryResp.json()).choices?.[0]?.message?.content || null;
        console.log(`[Assessment] Summarizer done (${summary?.length || 0} chars)`);
      } else {
        console.warn(`[Assessment] Summarizer failed: ${summaryResp.status} — continuing`);
      }
    } catch (e) {
      console.warn(`[Assessment] Summarizer error (non-fatal): ${e.message}`);
    }

    // ── Citation extraction and count increment ───────────────────────────────
    const allContent = rounds.map(r => r.content).join('\n');
    const citedFileNames = [...new Set(
      [...allContent.matchAll(/\[Source:\s*([^\]]+)\]/g)].map(m => m[1].trim())
    )];
    const citedFiles = citedFileNames.map(name => {
      const match = kbFilesWithContent.find(
        f => f.fileName === name || f.fileName.toLowerCase() === name.toLowerCase()
      );
      return { fileName: name, fileId: match?.fileId || null };
    });

    // Fire-and-forget citation count increments
    citedFiles.forEach(({ fileId, fileName }) => {
      if (!fileId) return;
      fetch(`https://${workspaceHost_resolved}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken_resolved}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId_resolved,
          statement: `UPDATE knowledge_base.cohive.file_metadata
                      SET citation_count = citation_count + 1, updated_at = CURRENT_TIMESTAMP()
                      WHERE file_id = '${fileId.replace(/'/g, "''")}'`,
          wait_timeout: '10s',
        }),
      }).catch(e => console.warn(`[Assessment] Citation count update failed for ${fileName}: ${e.message}`));
    });

    // ── Log completion ────────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    logAssessment({
      userEmail, brand, projectType, hexId,
      rounds: rounds.length,
      citedFiles: citedFiles.length,
      personaCount: shuffledPersonaData.length,
      conversationMode: `${requestMode}|${kbMode}|${scope}`,
      modelEndpoint,
      durationMs,
      success: true,
    });

    console.log(`[Assessment] ✅ Complete — ${rounds.length} rounds | ${citedFiles.length} citations | ${durationMs}ms`);

    // ── SSE complete event ────────────────────────────────────────────────────
    res.write(`event: complete\ndata: ${JSON.stringify({
      success: true,
      hexId, brand, projectType,
      assessmentType: assessmentTypeLabel,
      totalRounds: rounds.length,
      citedFiles,
      summary,
      personaOrder: personaList,
      requestMode,
      kbMode,
      scope,
      durationMs,
      completedAt: new Date().toISOString(),
    })}\n\n`);

    return res.end();

  } catch (error) {
    console.error('[Assessment] Fatal error:', error);

    logError({
      userEmail: req.body?.userEmail || '',
      brand: req.body?.brand || '',
      projectType: req.body?.projectType || '',
      hexId: req.body?.hexId || '',
      error,
      context: {
        kbMode: req.body?.kbMode,
        requestMode: req.body?.requestMode,
        scope: req.body?.scope,
      },
    });

    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      return res.end();
    }

    return res.status(500).json({ error: 'Assessment failed', message: error.message });
  }
}
