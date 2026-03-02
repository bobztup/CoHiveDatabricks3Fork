/**
 * Colleagues Hex Prompts
 * Analyze internal stakeholder perspectives
 */

import { PromptTemplate, TextPart } from '../core';
import { BaseParts } from '../base-parts';

export const ColleaguesPrompts = {
  executeAssess: new PromptTemplate({
    id: 'colleagues_execute_assess',
    hexId: 'Colleagues',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== COLLEAGUES ANALYSIS - ASSESSMENT ===' }),
      new TextPart('intro', { en: `Analyze the knowledge base through internal stakeholder (colleagues) perspectives.` }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('assessment_instructions', {
        en: `Assessment Instructions:
- Evaluate content against selected colleague personas
- Identify organizational alignment and gaps
- Assess internal capability and resource availability
- Note stakeholder concerns and priorities
- Evaluate feasibility from internal perspective`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  executeRecommend: new PromptTemplate({
    id: 'colleagues_execute_recommend',
    hexId: 'Colleagues',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== COLLEAGUES ANALYSIS - RECOMMENDATIONS ===' }),
      new TextPart('intro', { en: `Generate recommendations based on internal stakeholder perspectives.` }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- Internal alignment and change management strategies
- Resource allocation and capability building
- Stakeholder engagement and communication plans
- Organizational structure and process improvements
- Cross-functional collaboration opportunities`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  executeUnified: new PromptTemplate({
    id: 'colleagues_execute_unified',
    hexId: 'Colleagues',
    trigger: 'execute',
    parts: [
      new TextPart('header', { en: '=== COLLEAGUES ANALYSIS - UNIFIED ASSESSMENT ===' }),
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. INTERNAL ASSESSMENT
   - Organizational readiness and capability
   - Stakeholder alignment and concerns
   - Resource availability and constraints

2. INTERNAL RECOMMENDATIONS
   - Change management strategies
   - Resource and capability development
   - Stakeholder engagement plans

3. SYNTHESIS
   - Integrate internal perspectives with external insights
   - Balance stakeholder needs with business objectives
   - Create feasible implementation approach`
      }),
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  save: new PromptTemplate({
    id: 'colleagues_save',
    hexId: 'Colleagues',
    trigger: 'save',
    parts: [
      new TextPart('header', { en: '=== SAVE COLLEAGUES ANALYSIS ===' }),
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      new TextPart('save_instructions', {
        en: `Generate a Colleagues Analysis Report:
- Internal stakeholder insights
- Organizational readiness assessment
- Change management recommendations
- Resource and capability requirements
- Stakeholder engagement strategy

Format as a structured markdown document.`
      })
    ]
  }),

  download: new PromptTemplate({
    id: 'colleagues_download',
    hexId: 'Colleagues',
    trigger: 'download',
    parts: [
      new TextPart('header', { en: '=== EXPORT COLLEAGUES DATA ===' }),
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      new TextPart('export_instructions', {
        en: `Generate downloadable internal analysis report with all colleague insights, recommendations, and supporting data. Format as JSON.`
      })
    ]
  })
};
