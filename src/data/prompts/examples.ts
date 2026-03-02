/**
 * CoHive Prompt System - Runnable Examples
 * 
 * These examples demonstrate the prompt system in action.
 * Run these to test and understand the system.
 */

import { PromptManager, PromptContext } from './index';

// Initialize prompt manager
const promptManager = PromptManager.getInstance();

console.log('=== CoHive Prompt System Examples ===\n');

// Example 1: Simple Launch Hex
console.log('--- Example 1: Launch Hex ---');
const launchContext: PromptContext = {
  hexId: 'Launch',
  trigger: 'execute',
  brand: 'Acme Corporation',
  projectType: 'Product Innovation',
  userRole: 'researcher',
  questionResponses: [
    'We are launching a new smart home device targeting tech-savvy millennials',
    'Key objectives: assess market fit, identify competitive advantages'
  ]
};

const launchPrompt = promptManager.generate('Launch', 'execute', launchContext);
console.log(launchPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// Example 2: Buyers with Personas (Unified Mode)
console.log('--- Example 2: Buyers Hex (Unified) ---');
const buyersContext: PromptContext = {
  hexId: 'Buyers',
  trigger: 'execute',
  brand: 'RetailCo',
  projectType: 'Customer Experience',
  userRole: 'non-researcher',
  assessmentType: ['unified'],
  selectedFiles: ['buyer-journey-map.pdf', 'purchase-behavior-study.pdf'],
  selectedPersonas: [
    'Tech-Savvy Millennials',
    'Budget-Conscious Families',
    'Premium Lifestyle Seekers'
  ],
  selectedL1Categories: ['Demographics', 'Psychographics'],
  selectedL2Categories: ['Age Group', 'Income Level', 'Values'],
  questionResponses: [
    'Focus on understanding the complete buyer journey from awareness to purchase',
    'Identify key friction points and opportunities for conversion optimization'
  ]
};

const buyersPrompt = promptManager.generate('Buyers', 'execute', buyersContext);
console.log(buyersPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// Example 3: Competitors in War Games Mode
console.log('--- Example 3: Competitors (War Games) ---');
const competitorsWarGamesContext: PromptContext = {
  hexId: 'Competitors',
  trigger: 'execute',
  brand: 'OurCompany',
  projectType: 'War Games',
  userRole: 'researcher',
  assessmentType: ['unified'],
  selectedCompetitor: 'MajorCompetitor Inc.',
  selectedFiles: ['competitive-intelligence.pdf', 'market-positioning.pdf'],
  questionResponses: [
    'Model potential competitive responses to our new product launch',
    'Assess our defensive strategies and identify vulnerabilities'
  ]
};

const competitorsPrompt = promptManager.generate('Competitors', 'execute', competitorsWarGamesContext);
console.log(competitorsPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// Example 4: Knowledge Base - New Synthesis
console.log('--- Example 4: Knowledge Base (Synthesis) ---');
const kbSynthesisContext: PromptContext = {
  hexId: 'Knowledge Base',
  trigger: 'execute',
  brand: 'GlobalBrand',
  projectType: 'Brand Strategy',
  userRole: 'researcher',
  synthesisSelections: {
    projects: ['Q1 Market Research', 'Q2 Customer Insights', 'Competitor Analysis 2024'],
    hexes: ['Buyers', 'External Experts', 'Competitors'],
    executions: ['exec-2024-001', 'exec-2024-002', 'exec-2024-003']
  },
  questionResponses: [
    'Synthesize insights across all Q1-Q2 research to identify overarching trends',
    'Focus on actionable strategic recommendations for brand repositioning'
  ]
};

const kbSynthesisPrompt = promptManager.generate('Knowledge Base', 'execute', kbSynthesisContext);
console.log(kbSynthesisPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// Example 5: Action Hex - Final Findings
console.log('--- Example 5: Action Hex (Findings) ---');
const actionContext: PromptContext = {
  hexId: 'Action',
  trigger: 'execute',
  brand: 'TechStartup',
  projectType: 'Product Innovation',
  userRole: 'non-researcher',
  allHexResponses: {
    'Launch': {
      summary: 'Project initialized for smart home device launch',
      timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000
    },
    'Buyers': {
      summary: 'Identified three key buyer personas with distinct purchase drivers',
      keyInsights: ['Price sensitivity', 'Feature preferences', 'Brand loyalty']
    },
    'Competitors': {
      summary: 'Competitive landscape shows gaps in mid-market segment',
      threats: ['Established players', 'Price competition'],
      opportunities: ['Feature differentiation', 'Customer service']
    },
    'External Experts': {
      summary: 'Industry experts predict growth in smart home adoption',
      trends: ['AI integration', 'Privacy concerns', 'Interoperability']
    }
  },
  chainResults: [
    'Launch analysis completed with clear project objectives',
    'Buyer personas validated with strong market fit signals',
    'Competitive analysis reveals strategic positioning opportunities',
    'Expert insights confirm market timing and feature priorities'
  ],
  questionResponses: [
    'Synthesize all findings into executive recommendations',
    'Prioritize next steps for product launch'
  ]
};

const actionPrompt = promptManager.generate('Action', 'execute', actionContext);
console.log(actionPrompt);
console.log('\n' + '='.repeat(80) + '\n');

// Example 6: Preview Mode
console.log('--- Example 6: Preview Mode ---');
const previewAssess = promptManager.preview('External Experts', 'execute', 'assess');
console.log('Preview (External Experts - Assess):');
console.log(previewAssess.substring(0, 500) + '...\n');

// Example 7: List Available Templates
console.log('--- Example 7: Available Templates ---');
const templates = promptManager.listTemplates();
console.log(`Total templates: ${templates.length}`);
console.log('Sample templates:');
templates.slice(0, 10).forEach(t => console.log(`  - ${t}`));
console.log('  ...\n');

// Example 8: List Available Chains
console.log('--- Example 8: Available Chains ---');
const chains = promptManager.listChains();
console.log('Predefined chains:');
chains.forEach(c => console.log(`  - ${c}`));
console.log('\n');

// Example 9: Role-Based Filtering
console.log('--- Example 9: Role-Based Content ---');
const researcherContext: PromptContext = {
  hexId: 'Panel Homes',
  trigger: 'execute',
  brand: 'ConsumerBrand',
  projectType: 'Customer Experience',
  userRole: 'researcher',
  assessmentType: ['assess'],
  selectedFiles: ['panel-data.csv'],
  selectedPersonas: ['Suburban Families']
};

const nonResearcherContext: PromptContext = {
  ...researcherContext,
  userRole: 'non-researcher'
};

const researcherPrompt = promptManager.generate('Panel Homes', 'execute', researcherContext);
const nonResearcherPrompt = promptManager.generate('Panel Homes', 'execute', nonResearcherContext);

console.log('Researcher version includes:');
if (researcherPrompt.includes('statistical rigor')) {
  console.log('  ✓ Statistical analysis requirements');
}
if (researcherPrompt.includes('methodological')) {
  console.log('  ✓ Methodological considerations');
}

console.log('\nNon-researcher version includes:');
if (nonResearcherPrompt.includes('actionable')) {
  console.log('  ✓ Actionable recommendations focus');
}
if (nonResearcherPrompt.includes('plain language')) {
  console.log('  ✓ Plain language emphasis');
}
console.log('\n');

// Example 10: Chain Preview
console.log('--- Example 10: Chain Preview ---');
const chain = promptManager.getChain('kb_persona_action');
if (chain) {
  const chainPreviews = chain.preview({
    hexId: 'Knowledge Base',
    brand: 'ChainExample',
    projectType: 'Brand Strategy',
    userRole: 'researcher'
  });
  
  console.log('Chain steps:');
  chainPreviews.forEach((preview, idx) => {
    console.log(`\nStep ${idx + 1}:`);
    console.log(preview.substring(0, 300) + '...');
  });
}

console.log('\n' + '='.repeat(80));
console.log('Examples complete! ✓');
console.log('='.repeat(80));

// Export examples for use in other files
export const examples = {
  launchContext,
  buyersContext,
  competitorsWarGamesContext,
  kbSynthesisContext,
  actionContext
};
