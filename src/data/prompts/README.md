# CoHive Prompt System

A comprehensive, object-oriented prompt management system for the CoHive AI workflow interface.

## Architecture Overview

### Design Principles

1. **Composability**: Prompts are built from reusable parts that can be combined in different ways
2. **Type Safety**: Full TypeScript support with strong typing throughout
3. **Extensibility**: Easy to add new hexes, triggers, or assessment types
4. **Role-Based**: Automatic filtering based on user role (researcher vs non-researcher)
5. **Internationalization**: Built-in multi-language support (English first)
6. **Chain Support**: Link multiple prompts for complex workflows

### Core Components

```
/data/prompts/
├── types.ts                    # TypeScript type definitions
├── template-engine.ts          # Simple template system (no external deps)
├── core.ts                     # Base classes (PromptPart, PromptTemplate, PromptChain)
├── base-parts.ts               # Shared reusable prompt components
├── prompt-manager.ts           # Singleton manager for all prompts
├── index.ts                    # Main entry point
├── templates/
│   ├── launch.ts              # Launch hex prompts
│   ├── external-experts.ts    # External Experts hex prompts
│   ├── panel-homes.ts         # Panel Homes hex prompts
│   ├── buyers.ts              # Buyers hex prompts
│   ├── competitors.ts         # Competitors hex prompts
│   ├── colleagues.ts          # Colleagues hex prompts
│   ├── knowledge-base.ts      # Knowledge Base hex prompts
│   ├── test-against-segments.ts # Test Against Segments hex prompts
│   └── action.ts              # Action hex prompts
└── README.md                  # This file
```

## Quick Start

### Basic Usage

```typescript
import { PromptManager, PromptContext } from './data/prompts';

// Get singleton instance
const promptManager = PromptManager.getInstance();

// Create context
const context: PromptContext = {
  hexId: 'Buyers',
  trigger: 'execute',
  brand: 'Acme Corp',
  projectType: 'Product Innovation',
  userRole: 'researcher',
  assessmentType: ['unified'],
  selectedFiles: ['market-research.pdf', 'buyer-personas.pdf'],
  selectedPersonas: ['Young Professionals', 'Tech Enthusiasts'],
  questionResponses: [
    'We need to understand buyer motivations for our new product',
    'Focus on digital-first consumers aged 25-40'
  ]
};

// Generate prompt
const prompt = promptManager.generate('Buyers', 'execute', context);

// Send to Databricks
sendToDatabricks(prompt);
```

### Preview Prompts

```typescript
// Preview without full context
const preview = promptManager.preview('Competitors', 'execute', 'assess');
console.log(preview);
```

### Prompt Chains

```typescript
import { PromptChain } from './data/prompts';

// Get predefined chain
const chain = promptManager.getChain('kb_persona_action');

// Execute chain
const results = await chain.execute(context, async (prompt, stepIndex) => {
  console.log(`Executing step ${stepIndex + 1}...`);
  const result = await sendToDatabricks(prompt);
  return result;
});

console.log('Chain results:', results);
```

### Custom Chains

```typescript
// Create custom chain from template IDs
const customChain = promptManager.createCustomChain('my_custom_workflow', [
  'launch_execute',
  'buyers_execute_unified',
  'competitors_execute_unified',
  'action_execute'
]);

// Execute custom chain
const results = await customChain.execute(context, sendToDatabricks);
```

## Hex-Specific Examples

### Launch Hex

```typescript
const launchContext: PromptContext = {
  hexId: 'Launch',
  trigger: 'execute',
  brand: 'TechCo',
  projectType: 'Product Innovation',
  userRole: 'non-researcher',
  questionResponses: [
    'Launch new AI-powered productivity tool',
    'Target: small business owners and freelancers'
  ]
};

const launchPrompt = promptManager.generate('Launch', 'execute', launchContext);
```

### Buyers (with Personas)

```typescript
const buyersContext: PromptContext = {
  hexId: 'Buyers',
  trigger: 'execute',
  brand: 'RetailBrand',
  projectType: 'Customer Experience',
  userRole: 'researcher',
  assessmentType: ['unified'],
  selectedFiles: ['buyer-journey.pdf', 'purchase-behavior.pdf'],
  selectedPersonas: ['Budget-Conscious Families', 'Premium Seekers'],
  selectedL1Categories: ['Demographics'],
  selectedL2Categories: ['Income Level', 'Family Size']
};

const buyersPrompt = promptManager.generate('Buyers', 'execute', buyersContext);
```

### Competitors (War Games Mode)

```typescript
const competitorsContext: PromptContext = {
  hexId: 'Competitors',
  trigger: 'execute',
  projectType: 'War Games', // Triggers special War Games logic
  brand: 'OurCompany',
  selectedCompetitor: 'CompetitorX',
  selectedFiles: ['competitive-intel.pdf'],
  assessmentType: ['unified']
};

const competitorsPrompt = promptManager.generate('Competitors', 'execute', competitorsContext);
```

### Knowledge Base (New Synthesis)

```typescript
const kbContext: PromptContext = {
  hexId: 'Knowledge Base',
  trigger: 'execute',
  brand: 'ClientBrand',
  projectType: 'Brand Strategy',
  synthesisSelections: {
    projects: ['Project A', 'Project B'],
    hexes: ['Buyers', 'Competitors', 'External Experts'],
    executions: ['exec-001', 'exec-002', 'exec-003']
  }
};

const synthesisPrompt = promptManager.generate('Knowledge Base', 'execute', kbContext);
```

### Action (Findings)

```typescript
const actionContext: PromptContext = {
  hexId: 'Action',
  trigger: 'execute',
  brand: 'BrandName',
  projectType: 'Product Innovation',
  userRole: 'non-researcher',
  allHexResponses: {
    'Launch': { /* data */ },
    'Buyers': { /* data */ },
    'Competitors': { /* data */ },
    'External Experts': { /* data */ }
  },
  chainResults: [
    'Launch analysis results...',
    'Buyer analysis results...',
    'Competitor analysis results...',
    'Expert analysis results...'
  ]
};

const findingsPrompt = promptManager.generate('Action', 'execute', actionContext);
```

## Assessment Types

All persona hexes and some special hexes support three assessment modes:

1. **Assess** - Evaluate knowledge base against criteria
2. **Recommend** - Generate recommendations
3. **Unified** - Combined assessment + recommendations

Specify in context:
```typescript
assessmentType: ['assess']     // Assessment only
assessmentType: ['recommend']  // Recommendations only
assessmentType: ['unified']    // Both (default for most cases)
```

## Role-Based Content

Prompts automatically filter content based on user role:

```typescript
// Researcher sees detailed analytical instructions
userRole: 'researcher'

// Non-researcher sees simplified, actionable instructions
userRole: 'non-researcher'
```

Parts can be role-restricted:
```typescript
new TextPart('researcher_only', {
  en: 'Advanced statistical analysis required...'
}, ['researcher'])  // Only shown to researchers
```

## Custom Prompt Parts

### TextPart - Static Text

```typescript
import { TextPart } from './data/prompts';

const header = new TextPart('my_header', {
  en: 'ANALYSIS HEADER',
  es: 'ENCABEZADO DE ANÁLISIS'  // Future multi-language
});
```

### DynamicPart - Computed Content

```typescript
import { DynamicPart } from './data/prompts';

const dynamicSection = new DynamicPart(
  'file_list',
  (ctx, locale) => {
    if (!ctx.selectedFiles || ctx.selectedFiles.length === 0) {
      return '';
    }
    return `Analyzing ${ctx.selectedFiles.length} files:\n- ${ctx.selectedFiles.join('\n- ')}`;
  }
);
```

### ConditionalPart - Conditional Logic

```typescript
import { ConditionalPart, TextPart } from './data/prompts';

const warGamesCheck = new ConditionalPart(
  'war_games',
  ctx => ctx.projectType === 'War Games',
  new TextPart('war_games_mode', { en: 'WAR GAMES MODE ACTIVE' }),
  new TextPart('standard_mode', { en: 'Standard competitive analysis' })
);
```

### TemplatePart - Template Strings

```typescript
import { TemplatePart } from './data/prompts';

const templateSection = new TemplatePart(
  'summary',
  {
    en: 'Analyzing {{brand}} for {{projectType}} project.\nFiles: {{fileCount}}'
  },
  (ctx) => ({
    brand: ctx.brand || 'Unknown',
    projectType: ctx.projectType || 'Unknown',
    fileCount: ctx.selectedFiles?.length || 0
  })
);
```

## Custom Templates

Create your own prompt templates:

```typescript
import { PromptTemplate, TextPart, DynamicPart } from './data/prompts';
import { BaseParts } from './data/prompts';

const myCustomPrompt = new PromptTemplate({
  id: 'custom_analysis',
  hexId: 'Buyers',
  trigger: 'execute',
  parts: [
    new TextPart('header', { en: '=== CUSTOM ANALYSIS ===' }),
    BaseParts.projectContext,
    BaseParts.selectedFiles,
    new DynamicPart('custom_logic', (ctx) => {
      // Your custom logic here
      return `Custom content for ${ctx.brand}`;
    }),
    BaseParts.outputFormat
  ],
  separator: '\n\n'  // How to join parts (default)
});

// Register it
const promptManager = PromptManager.getInstance();
promptManager.register(myCustomPrompt);
```

## Template Engine

Simple template utilities without external dependencies:

```typescript
import { template, conditionalTemplate, formatList } from './data/prompts';

// Basic variable replacement
const result = template('Hello {{name}}!', { name: 'World' });
// "Hello World!"

// Conditional sections
const result2 = conditionalTemplate(
  'Start\n{{#if showDetails}}Details here{{/if}}\nEnd',
  { showDetails: true }
);

// Format lists
const list = formatList(['Item 1', 'Item 2', 'Item 3'], '• ');
// "• Item 1\n• Item 2\n• Item 3"
```

## Debugging

### List All Templates

```typescript
const allTemplates = promptManager.listTemplates();
console.log('Available templates:', allTemplates);
```

### List All Chains

```typescript
const allChains = promptManager.listChains();
console.log('Available chains:', allChains);
```

### Get Template by ID

```typescript
const template = promptManager.getById('buyers_execute_unified');
if (template) {
  console.log('Found template:', template.id, template.hexId, template.trigger);
}
```

## Extending the System

### Adding a New Hex

1. Create `/data/prompts/templates/my-new-hex.ts`
2. Define prompts for execute, save, download, recommend
3. Import and register in `prompt-manager.ts`

```typescript
// my-new-hex.ts
export const MyNewHexPrompts = {
  execute: new PromptTemplate({
    id: 'my_hex_execute',
    hexId: 'My New Hex',
    trigger: 'execute',
    parts: [/* ... */]
  }),
  // ... other triggers
};

// prompt-manager.ts
import { MyNewHexPrompts } from './templates/my-new-hex';

private registerAllTemplates() {
  // ... existing registrations
  Object.values(MyNewHexPrompts).forEach(t => this.register(t));
}
```

### Adding Multi-Language Support

Update any TextPart or TemplatePart:

```typescript
new TextPart('greeting', {
  en: 'Welcome to the analysis',
  es: 'Bienvenido al análisis',
  fr: 'Bienvenue à l\'analyse'
})
```

Then use with locale:

```typescript
const prompt = promptManager.generate('Buyers', 'execute', context, 'es');
```

## Best Practices

1. **Reuse BaseParts**: Use shared parts from `base-parts.ts` for consistency
2. **Type Safety**: Always use proper TypeScript types for context
3. **Error Handling**: Check for null returns from `.get()` and `.getById()`
4. **Naming Convention**: Use `hexname_trigger_assessmenttype` format for IDs
5. **Role Awareness**: Consider both researcher and non-researcher experiences
6. **Chain Wisely**: Use chains for related multi-step workflows
7. **Test Previews**: Use `.preview()` to test prompts before full integration

## Troubleshooting

### "No prompt template found" Warning

This means no template matches the hex/trigger/assessmentType combination.

**Solution**: Check available templates with `.listTemplates()` or add a new template.

### Empty Prompt Generated

Check that context has required fields populated and parts aren't all filtered out by role.

### Chain Not Found

Verify chain ID with `.listChains()` or create custom chain with `.createCustomChain()`.

## Future Enhancements

- [ ] Prompt versioning and A/B testing
- [ ] Prompt performance analytics
- [ ] Visual prompt builder UI
- [ ] Export/import prompt definitions
- [ ] Prompt validation and linting
- [ ] Integration with Supabase for dynamic prompts

---

**Maintained by**: CoHive Development Team  
**Last Updated**: December 2024
