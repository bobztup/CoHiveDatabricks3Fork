/**
 * External Experts (Luminaries) Hex Prompts
 * Analyze insights from external experts and thought leaders
 */

import { PromptTemplate, TextPart, DynamicPart, ConditionalPart } from '../core';
import { BaseParts } from '../base-parts';

export const ExternalExpertsPrompts = {
  /**
   * Execute - Assess mode
   */
  executeAssess: new PromptTemplate({
    id: 'external_experts_execute_assess',
    hexId: 'External Experts',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== EXTERNAL EXPERTS ANALYSIS - ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Analyze the selected knowledge base files through the lens of external expert perspectives.
Focus on identifying thought leadership insights, industry trends, and expert opinions.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new DynamicPart('assessment_instructions', (ctx) => {
        const personaCount = ctx.selectedPersonas?.length || 0;
        
        return `Assessment Instructions:
- Evaluate content against ${personaCount} selected external expert persona${personaCount !== 1 ? 's' : ''}
- Identify alignment with expert perspectives
- Highlight contrarian or novel viewpoints
- Note gaps in expert coverage
- Assess credibility and authority of sources`;
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Recommend mode
   */
  executeRecommend: new PromptTemplate({
    id: 'external_experts_execute_recommend',
    hexId: 'External Experts',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== EXTERNAL EXPERTS ANALYSIS - RECOMMENDATIONS ==='
      }),
      
      new TextPart('intro', {
        en: `Generate recommendations based on external expert perspectives and thought leadership insights.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- What external experts would advise for this project
- Emerging trends and opportunities from thought leaders
- Best practices from industry experts
- Strategic implications based on expert consensus
- Areas where expert opinion diverges (include multiple perspectives)`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Unified mode (both assess and recommend)
   */
  executeUnified: new PromptTemplate({
    id: 'external_experts_execute_unified',
    hexId: 'External Experts',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== EXTERNAL EXPERTS ANALYSIS - UNIFIED ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Perform a comprehensive analysis combining assessment and recommendations from external expert perspectives.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. ASSESSMENT PHASE:
   - Evaluate knowledge base against expert perspectives
   - Identify alignment and gaps with thought leadership
   - Assess source credibility and authority

2. RECOMMENDATION PHASE:
   - Generate expert-backed recommendations
   - Synthesize insights across multiple expert viewpoints
   - Prioritize actions based on expert consensus
   - Flag areas of expert disagreement for further investigation

3. SYNTHESIS:
   - Combine assessment findings with recommendations
   - Provide a cohesive narrative linking expert insights to actions
   - Identify the most influential expert perspectives for this project`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Save - Store expert analysis
   */
  save: new PromptTemplate({
    id: 'external_experts_save',
    hexId: 'External Experts',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE EXTERNAL EXPERTS ANALYSIS ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      
      new TextPart('save_instructions', {
        en: `Generate a comprehensive External Experts Analysis Report:
- Executive summary of key expert insights
- Detailed findings for each expert persona analyzed
- Thought leadership trends identified
- Strategic recommendations backed by expert perspectives
- Citations and source references

Format as a structured markdown document.`
      })
    ]
  }),

  /**
   * Download - Export expert analysis
   */
  download: new PromptTemplate({
    id: 'external_experts_download',
    hexId: 'External Experts',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT EXTERNAL EXPERTS DATA ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      
      new DynamicPart('export_data', (ctx) => {
        return `Generate a downloadable report with:
- Analysis metadata (date, project, personas analyzed)
- Complete findings and recommendations
- Source files analyzed: ${ctx.selectedFiles?.join(', ') || 'None'}
- Personas evaluated: ${ctx.selectedPersonas?.join(', ') || 'None'}
- Raw data and supporting evidence

Format as JSON with all analysis results and metadata.`;
      })
    ]
  })
};
