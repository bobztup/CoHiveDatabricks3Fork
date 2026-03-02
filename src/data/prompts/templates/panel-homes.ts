/**
 * Panel Homes (Panelist) Hex Prompts
 * Analyze insights from panel home perspectives
 */

import { PromptTemplate, TextPart } from '../core';
import { BaseParts } from '../base-parts';

export const PanelHomesPrompts = {
  /**
   * Execute - Assess mode
   */
  executeAssess: new PromptTemplate({
    id: 'panel_homes_execute_assess',
    hexId: 'Panel Homes',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== PANEL HOMES ANALYSIS - ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Analyze the knowledge base through the lens of panel home perspectives.
Focus on household-level insights, behaviors, and patterns.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('assessment_instructions', {
        en: `Assessment Instructions:
- Evaluate content against selected panel home personas
- Identify household behavior patterns and trends
- Analyze home environment and context factors
- Assess lifestyle and consumption patterns
- Note demographic and psychographic insights`
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
    id: 'panel_homes_execute_recommend',
    hexId: 'Panel Homes',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== PANEL HOMES ANALYSIS - RECOMMENDATIONS ==='
      }),
      
      new TextPart('intro', {
        en: `Generate recommendations based on panel home insights and household perspectives.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- Product/service adaptations for household contexts
- Messaging strategies for panel home segments
- Distribution and accessibility opportunities
- Usage occasion and context optimization
- Family/household decision-making considerations`
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
    id: 'panel_homes_execute_unified',
    hexId: 'Panel Homes',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== PANEL HOMES ANALYSIS - UNIFIED ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Comprehensive analysis combining panel home assessment and recommendations.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.selectedPersonas,
      
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. HOUSEHOLD ASSESSMENT
   - Evaluate knowledge base against panel home personas
   - Identify household behavior patterns
   - Analyze contextual factors (home environment, family dynamics)

2. STRATEGIC RECOMMENDATIONS
   - Generate household-focused strategies
   - Optimize for home usage contexts
   - Address family decision-making dynamics

3. SYNTHESIS
   - Integrate household insights with strategic actions
   - Prioritize recommendations by household segment
   - Identify cross-household patterns and opportunities`
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
    id: 'panel_homes_save',
    hexId: 'Panel Homes',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE PANEL HOMES ANALYSIS ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      
      new TextPart('save_instructions', {
        en: `Generate a Panel Homes Analysis Report:
- Executive summary of household insights
- Detailed findings by panel home persona
- Behavioral patterns and trends
- Strategic recommendations
- Household segment profiles

Format as a structured markdown document.`
      })
    ]
  }),

  /**
   * Download
   */
  download: new PromptTemplate({
    id: 'panel_homes_download',
    hexId: 'Panel Homes',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT PANEL HOMES DATA ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedPersonas,
      BaseParts.chainContext,
      
      new TextPart('export_instructions', {
        en: `Generate a downloadable report with:
- Analysis metadata (date, project, personas)
- Complete household insights and recommendations
- Panel home profiles and characteristics
- Supporting data and evidence

Format as JSON with all analysis results.`
      })
    ]
  })
};
