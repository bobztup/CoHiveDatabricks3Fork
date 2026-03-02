/**
 * Knowledge Base Hex Prompts
 * Synthesis and analysis of knowledge base content
 */

import { PromptTemplate, TextPart, ConditionalPart, DynamicPart } from '../core';
import { BaseParts } from '../base-parts';

export const KnowledgeBasePrompts = {
  /**
   * Execute - New Synthesis mode
   */
  executeNewSynthesis: new PromptTemplate({
    id: 'knowledge_base_execute_synthesis',
    hexId: 'Knowledge Base',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== KNOWLEDGE BASE - NEW SYNTHESIS ==='
      }),
      
      new TextPart('intro', {
        en: `Create a new synthesis from selected projects, hexes, and execution history.
This synthesizes insights across multiple prior analyses.`
      }),
      
      BaseParts.projectContext,
      BaseParts.synthesisContext,
      
      new TextPart('synthesis_instructions', {
        en: `Synthesis Requirements:
- Aggregate insights across selected scope
- Identify patterns and themes across analyses
- Synthesize key findings and recommendations
- Highlight consistencies and contradictions
- Generate meta-insights from combined data
- Create cohesive narrative linking all sources`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      
      new TextPart('output_format_synthesis', {
        en: `Output Format:
{
  "synthesis_summary": "High-level synthesis of all selected sources",
  "key_themes": ["Theme 1", "Theme 2", ...],
  "cross_cutting_insights": ["Insight 1", "Insight 2", ...],
  "patterns": {
    "consistent": ["Pattern 1", ...],
    "contradictory": ["Pattern 1", ...]
  },
  "recommendations": ["Rec 1", "Rec 2", ...],
  "knowledge_gaps": ["Gap 1", "Gap 2", ...],
  "confidence": "high|medium|low"
}`
      })
    ]
  }),

  /**
   * Execute - Standard file analysis (Assess)
   */
  executeAssess: new PromptTemplate({
    id: 'knowledge_base_execute_assess',
    hexId: 'Knowledge Base',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== KNOWLEDGE BASE ANALYSIS - ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Assess the selected knowledge base files for insights and patterns.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new TextPart('assessment_instructions', {
        en: `Assessment Instructions:
- Analyze content quality and completeness
- Identify key insights and findings
- Evaluate relevance to project objectives
- Assess data credibility and sources
- Note methodological strengths and limitations`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Generate recommendations
   */
  executeRecommend: new PromptTemplate({
    id: 'knowledge_base_execute_recommend',
    hexId: 'Knowledge Base',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== KNOWLEDGE BASE ANALYSIS - RECOMMENDATIONS ==='
      }),
      
      new TextPart('intro', {
        en: `Generate recommendations based on knowledge base content.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new TextPart('recommendation_instructions', {
        en: `Recommendation Focus:
- Strategic insights derived from knowledge base
- Action items based on research findings
- Additional research needs and knowledge gaps
- Methodology improvements for future research
- Knowledge base enhancement opportunities`
      }),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Unified analysis
   */
  executeUnified: new PromptTemplate({
    id: 'knowledge_base_execute_unified',
    hexId: 'Knowledge Base',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== KNOWLEDGE BASE ANALYSIS - UNIFIED ASSESSMENT ==='
      }),
      
      new TextPart('intro', {
        en: `Comprehensive knowledge base analysis with assessment and recommendations.`
      }),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new TextPart('unified_instructions', {
        en: `Unified Analysis Requirements:
1. CONTENT ASSESSMENT
   - Evaluate quality, completeness, and relevance
   - Extract key insights and findings
   - Assess methodology and data credibility

2. STRATEGIC RECOMMENDATIONS
   - Generate actionable insights
   - Identify research gaps and opportunities
   - Recommend knowledge base enhancements

3. SYNTHESIS
   - Integrate findings into cohesive narrative
   - Prioritize insights by business impact
   - Create research-backed action plan`
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
    id: 'knowledge_base_save',
    hexId: 'Knowledge Base',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE KNOWLEDGE BASE ANALYSIS ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.chainContext,
      
      new DynamicPart('save_context', (ctx) => {
        if (ctx.synthesisSelections) {
          return `Synthesis Analysis Report based on selected scope`;
        }
        return `Knowledge Base Analysis Report`;
      }),
      
      new TextPart('save_instructions', {
        en: `Generate a comprehensive report:
- Executive summary of key findings
- Detailed analysis by source/section
- Strategic insights and recommendations
- Knowledge gaps and future research needs
- Methodological notes

Format as a structured markdown document.`
      })
    ]
  }),

  /**
   * Download
   */
  download: new PromptTemplate({
    id: 'knowledge_base_download',
    hexId: 'Knowledge Base',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT KNOWLEDGE BASE DATA ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.chainContext,
      
      new DynamicPart('export_data', (ctx) => {
        const isSynthesis = !!ctx.synthesisSelections;
        
        return `Generate a downloadable report:
- Analysis metadata (date, project, type)
- ${isSynthesis ? 'Synthesis scope and sources' : 'Files analyzed'}
- Complete findings and recommendations
- Supporting data and evidence
${isSynthesis ? '- Cross-analysis insights and patterns' : ''}

Format as JSON with all analysis results.`;
      })
    ]
  })
};
