/**
 * Test Against Segments (Grade/Cultural Voices/Social Voices) Hex Prompts
 * Segment-based testing and validation
 */

import { PromptTemplate, TextPart } from '../core';
import { BaseParts } from '../base-parts';

export const TestAgainstSegmentsPrompts = {
  executeAssess: new PromptTemplate({
    id: 'test_segments_execute_assess',
    hexId: 'Test Against Segments',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== TEST AGAINST SEGMENTS - ASSESSMENT ===' }),
      new TextPart('intro', {
        en: `Test and validate insights against specific market segments, cultural contexts, and social dynamics.`
      }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('assessment_instructions', {
        en: `Assessment Instructions:
- Test validity across selected segments
- Evaluate cultural relevance and sensitivity
- Assess social dynamics and influence patterns
- Identify segment-specific adaptations needed
- Note performance variations by segment`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  executeRecommend: new PromptTemplate({
    id: 'test_segments_execute_recommend',
    hexId: 'Test Against Segments',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== TEST AGAINST SEGMENTS - RECOMMENDATIONS ===' }),
      new TextPart('intro', { en: `Generate segment-specific recommendations and adaptations.` }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- Segment-specific strategy adaptations
- Cultural customization requirements
- Social influence and virality opportunities
- Segment prioritization and targeting
- Launch sequencing by segment`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  executeUnified: new PromptTemplate({
    id: 'test_segments_execute_unified',
    hexId: 'Test Against Segments',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== TEST AGAINST SEGMENTS - UNIFIED ASSESSMENT ===' }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. SEGMENT TESTING
   - Validate insights across all segments
   - Assess cultural fit and adaptations
   - Evaluate social dynamics and influence

2. SEGMENT RECOMMENDATIONS
   - Segment-specific strategies
   - Prioritization and targeting approach
   - Cultural and social optimization

3. SYNTHESIS
   - Integrate segment insights into unified strategy
   - Balance universal vs. customized approaches
   - Create segment-aware implementation plan`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  save: new PromptTemplate({
    id: 'test_segments_save',
    hexId: 'Test Against Segments',
    trigger: 'save',
    parts: [
      new TextPart('header', { en: '=== SAVE SEGMENT TESTING ANALYSIS ===' }),
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      new TextPart('save_instructions', {
        en: `Generate a Segment Testing Report:
- Segment validation results
- Cultural and social insights
- Segment-specific recommendations
- Prioritization framework
- Implementation roadmap by segment

Format as a structured markdown document.`
      })
    ]
  }),

  download: new PromptTemplate({
    id: 'test_segments_download',
    hexId: 'Test Against Segments',
    trigger: 'download',
    parts: [
      new TextPart('header', { en: '=== EXPORT SEGMENT TESTING DATA ===' }),
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      new TextPart('export_instructions', {
        en: `Generate downloadable segment testing report with all validation results, segment insights, and recommendations. Format as JSON.`
      })
    ]
  })
};
