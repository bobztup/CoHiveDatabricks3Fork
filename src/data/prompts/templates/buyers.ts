/**
 * Buyers (Consumers) Hex Prompts
 * Analyze buyer personas and consumer insights
 */

import { PromptTemplate, TextPart } from '../core';
import { BaseParts } from '../base-parts';

export const BuyersPrompts = {
  /**
   * Execute - Assess mode
   */
  executeAssess: new PromptTemplate({
    id: 'buyers_execute_assess',
    hexId: 'Buyers',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== BUYER PERSONA ANALYSIS - ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Analyze the knowledge base through buyer persona perspectives.
Focus on purchase behavior, decision-making, and buyer journeys.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('assessment_instructions', {
        en: `Assessment Instructions:
- Evaluate content against selected buyer personas
- Identify purchase drivers and barriers
- Analyze buyer journey touchpoints and pain points
- Assess decision-making criteria and influences
- Map buyer needs, wants, and preferences`
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
    id: 'buyers_execute_recommend',
    hexId: 'Buyers',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== BUYER PERSONA ANALYSIS - RECOMMENDATIONS ==='
      }),
      
      new TextPart('intro', {
        en: `Generate recommendations based on buyer insights and consumer perspectives.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- Buyer journey optimization opportunities
- Purchase conversion strategies
- Messaging and positioning for buyer segments
- Channel and touchpoint recommendations
- Buyer experience improvements
- Pricing and value proposition adjustments`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Unified mode
   */
  executeUnified: new PromptTemplate({
    id: 'buyers_execute_unified',
    hexId: 'Buyers',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== BUYER PERSONA ANALYSIS - UNIFIED ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Comprehensive buyer analysis combining assessment and strategic recommendations.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. BUYER ASSESSMENT
   - Evaluate knowledge base against buyer personas
   - Map complete buyer journeys and touchpoints
   - Identify purchase drivers, barriers, and motivations

2. CONVERSION RECOMMENDATIONS
   - Optimize buyer journey for conversion
   - Strategic messaging and positioning
   - Channel and experience improvements

3. SYNTHESIS
   - Integrate buyer insights with growth strategies
   - Prioritize initiatives by buyer segment value
   - Create actionable buyer-centric roadmap`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Save
   */
  save: new PromptTemplate({
    id: 'buyers_save',
    hexId: 'Buyers',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE BUYER ANALYSIS ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      
      new TextPart('save_instructions', {
        en: `Generate a Buyer Persona Analysis Report:
- Executive summary of buyer insights
- Detailed buyer journey maps
- Purchase behavior analysis
- Strategic recommendations by segment
- Conversion optimization opportunities

Format as a structured markdown document.`
      })
    ]
  }),

  /**
   * Download
   */
  download: new PromptTemplate({
    id: 'buyers_download',
    hexId: 'Buyers',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT BUYER DATA ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      
      new TextPart('export_instructions', {
        en: `Generate a downloadable buyer analysis report:
- Analysis metadata (date, project, buyer personas)
- Complete buyer insights and journey maps
- Purchase behavior data and patterns
- Recommendations and optimization strategies
- Supporting research and evidence

Format as JSON with all analysis results.`
      })
    ]
  })
};
