/**
 * Competitors Hex Prompts
 * Competitive analysis with War Games support
 */

import { PromptTemplate, TextPart, DynamicPart, ConditionalPart } from '../core';
import { BaseParts } from '../base-parts';

export const CompetitorsPrompts = {
  /**
   * Execute - Standard competitive analysis
   */
  execute: new PromptTemplate({
    id: 'competitors_execute',
    hexId: 'Competitors',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== COMPETITIVE ANALYSIS ==='
      }),
      
      new ConditionalPart(
        'war_games_check',
        ctx => ctx.projectType === 'War Games',
        
        // War Games Mode
        new DynamicPart('war_games_analysis', (ctx) => {
          return `WAR GAMES MODE - Competitive Scenario Analysis

This is a War Games project focused on strategic competitive scenarios.

Competitor: ${ctx.selectedCompetitor || 'Not specified'}

Analysis Instructions:
- Simulate competitive responses and counter-strategies
- Model potential competitive moves and their implications
- Evaluate defensive and offensive strategic options
- Assess competitive vulnerabilities and strengths
- Generate scenario-based recommendations

Focus on strategic gameplay and competitive dynamics rather than standard market analysis.`;
        }),
        
        // Standard Mode
        new DynamicPart('standard_analysis', (ctx) => {
          return `Standard Competitive Analysis

Competitor: ${ctx.selectedCompetitor || 'Not specified'}
Analysis Type: ${ctx.competitorAnalysisType || 'Not specified'}

Analysis Instructions:
- Evaluate competitive positioning and market share
- Analyze competitive strengths and weaknesses
- Identify competitive threats and opportunities
- Assess competitive strategies and tactics
- Benchmark against industry standards`;
        })
      ),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Execute - Assess mode
   */
  executeAssess: new PromptTemplate({
    id: 'competitors_execute_assess',
    hexId: 'Competitors',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== COMPETITIVE ANALYSIS - ASSESSMENT ==='
      }),
      
      new ConditionalPart(
        'war_games_mode',
        ctx => ctx.projectType === 'War Games',
        new TextPart('war_games_assess', {
          en: `WAR GAMES ASSESSMENT MODE

Assess competitive scenarios and strategic positioning.`
        }),
        new TextPart('standard_assess', {
          en: `Assess competitive landscape and market positioning.`
        })
      ),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new DynamicPart('competitor_context', (ctx) => {
        const parts: string[] = [];
        
        if (ctx.selectedCompetitor) {
          parts.push(`Competitor: ${ctx.selectedCompetitor}`);
        }
        
        if (ctx.competitorAnalysisType && ctx.projectType !== 'War Games') {
          parts.push(`Analysis Type: ${ctx.competitorAnalysisType}`);
        }
        
        return parts.join('\n');
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
    id: 'competitors_execute_recommend',
    hexId: 'Competitors',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== COMPETITIVE ANALYSIS - RECOMMENDATIONS ==='
      }),
      
      new ConditionalPart(
        'war_games_mode',
        ctx => ctx.projectType === 'War Games',
        new TextPart('war_games_recommend', {
          en: `WAR GAMES RECOMMENDATIONS

Generate strategic recommendations for competitive scenarios:
- Counter-strategy options
- Defensive positioning recommendations
- Offensive move opportunities
- Risk mitigation strategies
- Scenario-specific action plans`
        }),
        new TextPart('standard_recommend', {
          en: `Generate competitive strategy recommendations:
- Competitive positioning opportunities
- Differentiation strategies
- Market entry/expansion recommendations
- Competitive response strategies
- Partnership and alliance opportunities`
        })
      ),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new DynamicPart('competitor_context', (ctx) => {
        return ctx.selectedCompetitor 
          ? `Competitor: ${ctx.selectedCompetitor}` 
          : '';
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
    id: 'competitors_execute_unified',
    hexId: 'Competitors',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== COMPETITIVE ANALYSIS - UNIFIED ASSESSMENT ==='
      }),
      
      new ConditionalPart(
        'war_games_mode',
        ctx => ctx.projectType === 'War Games',
        new TextPart('war_games_unified', {
          en: `WAR GAMES UNIFIED ANALYSIS

Comprehensive competitive scenario analysis combining assessment and strategic recommendations.`
        }),
        new TextPart('standard_unified', {
          en: `Comprehensive competitive analysis combining assessment and recommendations.`
        })
      ),
      
      BaseParts.projectContext,
      BaseParts.selectedFiles,
      
      new DynamicPart('competitor_context', (ctx) => {
        const parts: string[] = [];
        
        if (ctx.selectedCompetitor) {
          parts.push(`Competitor: ${ctx.selectedCompetitor}`);
        }
        
        if (ctx.competitorAnalysisType && ctx.projectType !== 'War Games') {
          parts.push(`Analysis Type: ${ctx.competitorAnalysisType}`);
        }
        
        return parts.join('\n');
      }),
      
      new ConditionalPart(
        'war_games_instructions',
        ctx => ctx.projectType === 'War Games',
        new TextPart('war_games_unified_instructions', {
          en: `Unified War Games Analysis:
1. SCENARIO ASSESSMENT
   - Current competitive scenario evaluation
   - Strategic positioning analysis
   - Threat and opportunity identification

2. STRATEGIC RECOMMENDATIONS
   - Counter-strategy options with risk/reward analysis
   - Tactical move recommendations
   - Resource allocation suggestions

3. SYNTHESIS
   - Integrated strategic roadmap
   - Prioritized action plans
   - Contingency strategies`
        }),
        new TextPart('standard_unified_instructions', {
          en: `Unified Competitive Analysis:
1. COMPETITIVE ASSESSMENT
   - Market positioning evaluation
   - Competitive strength/weakness analysis
   - Threat and opportunity identification

2. STRATEGIC RECOMMENDATIONS
   - Positioning and differentiation strategies
   - Market response recommendations
   - Partnership opportunities

3. SYNTHESIS
   - Integrated competitive strategy
   - Prioritized action plans
   - Success metrics and KPIs`
        })
      ),
      
      BaseParts.questionResponses,
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Save - Store competitive analysis
   */
  save: new PromptTemplate({
    id: 'competitors_save',
    hexId: 'Competitors',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE COMPETITIVE ANALYSIS ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.chainContext,
      
      new ConditionalPart(
        'war_games_save',
        ctx => ctx.projectType === 'War Games',
        new TextPart('war_games_save_format', {
          en: `Generate a War Games Competitive Analysis Report:
- Executive summary of competitive scenarios
- Strategic assessment of competitive dynamics
- Recommended counter-strategies and tactical moves
- Risk analysis and contingency plans
- Scenario simulations and outcomes

Format as a structured markdown document.`
        }),
        new TextPart('standard_save_format', {
          en: `Generate a Competitive Analysis Report:
- Executive summary of competitive landscape
- Detailed competitor profiles and positioning
- Strategic recommendations and action plans
- Market dynamics and trends
- Success metrics and KPIs

Format as a structured markdown document.`
        })
      )
    ]
  }),

  /**
   * Download - Export competitive data
   */
  download: new PromptTemplate({
    id: 'competitors_download',
    hexId: 'Competitors',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT COMPETITIVE ANALYSIS DATA ==='
      }),
      
      BaseParts.projectContext,
      
      new DynamicPart('export_data', (ctx) => {
        const isWarGames = ctx.projectType === 'War Games';
        
        return `Generate a downloadable competitive analysis report:
- Analysis metadata (date, project, competitor)
- ${isWarGames ? 'War Games scenario analysis' : 'Competitive landscape assessment'}
- Complete findings and recommendations
- Competitor: ${ctx.selectedCompetitor || 'Not specified'}
${!isWarGames && ctx.competitorAnalysisType ? `- Analysis Type: ${ctx.competitorAnalysisType}` : ''}
- Source files analyzed: ${ctx.selectedFiles?.join(', ') || 'None'}
- Supporting data and evidence

Format as JSON with all analysis results and metadata.`;
      })
    ]
  })
};
