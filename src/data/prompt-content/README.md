# CoHive Prompt Content Files

This folder contains rich, detailed prompt templates and prompt elements used throughout the CoHive workflow hexes.

## 📁 File Structure

Each prompt or prompt element has its own JSON file:
```
/data/prompt-content/
  ├── README.md (this file)
  ├── _TEMPLATE.json
  ├── launch-discovery.json
  ├── buyers-analysis.json
  ├── element-brand-context.json
  ├── element-output-format.json
  └── ... (more prompts and elements)
```

## 🎯 Why Separate Files?

**Benefits:**
- ✅ Non-technical users can edit prompts without touching code
- ✅ Supports very rich, detailed prompt content
- ✅ Easy to version control and track changes
- ✅ Can be edited in any text editor
- ✅ Each prompt can evolve independently
- ✅ Reusable elements can be shared across prompts

## 📝 Types of Files

### Full Prompt Templates
Complete prompts for specific hex actions (e.g., `launch-discovery.json`, `buyers-unified-analysis.json`)

### Prompt Elements
Reusable components that can be combined (e.g., `element-brand-context.json`, `element-output-format.json`)

## 📝 How to Add a New Prompt

### Step 1: Create the JSON File

Create a new file: `{hex-id}-{action}.json` or `element-{name}.json`

**Full Prompt Example:** `buyers-unified-analysis.json`

```json
{
  "id": "buyers-unified-analysis",
  "type": "full-prompt",
  "name": "Buyers Unified Analysis",
  "description": "Complete prompt for unified buyer persona analysis",
  "hexId": "Buyers",
  "trigger": "execute",
  "assessmentType": "unified",
  "sections": [
    {
      "id": "header",
      "title": "Analysis Header",
      "content": "=== BUYER PERSONA ANALYSIS ===\n\nYou are analyzing buyer behavior and preferences.",
      "order": 1
    },
    {
      "id": "instructions",
      "title": "Main Instructions",
      "content": "Analyze the selected files and personas to provide insights on:\n- Purchase motivations\n- Decision-making factors\n- Pain points and concerns\n- Preferred communication channels",
      "order": 2
    },
    {
      "id": "output",
      "title": "Output Format",
      "content": "Provide your response in the following format:\n\n## Key Insights\n[Your insights here]\n\n## Recommendations\n[Your recommendations here]",
      "order": 3
    }
  ],
  "variables": [
    "{{brand}}",
    "{{projectType}}",
    "{{selectedFiles}}",
    "{{selectedPersonas}}"
  ],
  "roleSpecific": {
    "researcher": "Include detailed statistical analysis and methodology notes.",
    "non-researcher": "Focus on actionable insights and clear recommendations."
  },
  "metadata": {
    "lastUpdated": "2025-02-08",
    "author": "CoHive Team",
    "version": "1.0"
  }
}
```

**Prompt Element Example:** `element-brand-context.json`

```json
{
  "id": "element-brand-context",
  "type": "element",
  "name": "Brand Context",
  "description": "Reusable element that provides brand and project context",
  "content": "BRAND: {{brand}}\nPROJECT TYPE: {{projectType}}\nPROJECT GOAL: {{projectGoal}}",
  "variables": [
    "{{brand}}",
    "{{projectType}}",
    "{{projectGoal}}"
  ],
  "usageNotes": "Place at the beginning of prompts to establish context",
  "metadata": {
    "lastUpdated": "2025-02-08",
    "author": "CoHive Team",
    "version": "1.0"
  }
}
```

### Step 2: Reference in Code

Import and use in your prompt system:

```typescript
import promptContent from './data/prompt-content/buyers-unified-analysis.json';
import brandElement from './data/prompt-content/element-brand-context.json';
```

## 📋 JSON Structure

### Full Prompt Template

```json
{
  "id": "unique-prompt-id",
  "type": "full-prompt",
  "name": "Display Name",
  "description": "What this prompt does",
  "hexId": "Which hex uses this",
  "trigger": "execute|save|download",
  "assessmentType": "assess|recommend|unified",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "content": "Section content...",
      "order": 1,
      "conditional": "optional-condition"
    }
  ],
  "variables": ["{{var1}}", "{{var2}}"],
  "roleSpecific": {
    "researcher": "Extra content for researchers",
    "non-researcher": "Simplified content"
  },
  "chainable": true,
  "metadata": {
    "lastUpdated": "YYYY-MM-DD",
    "author": "Your name",
    "version": "1.0"
  }
}
```

### Prompt Element

```json
{
  "id": "element-unique-id",
  "type": "element",
  "name": "Element Name",
  "description": "What this element provides",
  "content": "Element content with {{variables}}",
  "variables": ["{{var1}}"],
  "usageNotes": "How to use this element",
  "tags": ["category", "type"],
  "metadata": {
    "lastUpdated": "YYYY-MM-DD",
    "author": "Your name",
    "version": "1.0"
  }
}
```

## 🎨 Best Practices

### 1. Be Clear and Specific
- ❌ "Analyze the data"
- ✅ "Analyze buyer purchase patterns, focusing on decision triggers, preferred channels, and objection handling"

### 2. Use Consistent Formatting
```
=== SECTION HEADER ===

Content here...

## Subsection
More content...
```

### 3. Make Elements Reusable
Create elements that can work across multiple prompts:
- `element-brand-context.json`
- `element-output-format.json`
- `element-file-list.json`
- `element-persona-context.json`

### 4. Version Control
Update metadata when you make changes:
```json
"metadata": {
  "lastUpdated": "2025-02-08",
  "author": "Jane Smith",
  "version": "2.1",
  "changeLog": "Added section for competitive context"
}
```

### 5. Use Variables Wisely
Common variables:
- `{{brand}}` - Brand name
- `{{projectType}}` - Project type
- `{{selectedFiles}}` - List of files
- `{{selectedPersonas}}` - List of personas
- `{{questionResponses}}` - User's answers
- `{{timestamp}}` - Current timestamp

## 🔧 Conditional Content

Use conditional sections for different scenarios:

```json
{
  "sections": [
    {
      "id": "war-games-mode",
      "content": "WAR GAMES MODE: Competitive analysis activated",
      "conditional": "projectType === 'War Games'"
    },
    {
      "id": "standard-mode",
      "content": "Standard analysis mode",
      "conditional": "projectType !== 'War Games'"
    }
  ]
}
```

## 🔗 Chaining Prompts

For multi-step workflows, mark prompts as chainable:

```json
{
  "chainable": true,
  "chainOutput": {
    "format": "structured",
    "includeMetadata": true
  },
  "nextPrompts": ["action-synthesis"]
}
```

## 📊 Common Prompt Patterns

### Analysis Prompts
Structure: Context → Files → Instructions → Output Format

### Recommendation Prompts
Structure: Context → Current State → Goals → Recommendations Format

### Synthesis Prompts
Structure: Context → Multiple Inputs → Synthesis Instructions → Output

### Assessment Prompts
Structure: Context → Criteria → Evaluation Instructions → Scoring Format

## 💡 Tips for Writing Effective Prompts

1. **Start with Context**: Always establish brand, project, and goal upfront
2. **Be Explicit**: Don't assume the AI knows what you want
3. **Structure Output**: Specify exactly how you want responses formatted
4. **Consider Roles**: Tailor content for researcher vs non-researcher
5. **Use Examples**: Include examples of good responses when helpful
6. **Test Iteratively**: Try prompts and refine based on actual results

## 🔍 Examples to Reference

**Full Prompts:**
- `launch-discovery.json` - Simple prompt with basic structure
- `buyers-unified-analysis.json` - Complex prompt with multiple sections

**Elements:**
- `element-brand-context.json` - Basic context element
- `element-output-format.json` - Reusable output format
- `element-file-list.json` - Dynamic file listing

## 🛠️ Editing Tips

### Use a JSON Validator
Before saving, validate your JSON:
- [JSONLint.com](https://jsonlint.com/)
- VS Code (shows errors automatically)

### Common Mistakes
```json
// ❌ Trailing comma
"sections": [
  {"id": "one"},
  {"id": "two"},
]

// ✅ No trailing comma
"sections": [
  {"id": "one"},
  {"id": "two"}
]

// ❌ Unescaped newlines
"content": "Line 1
Line 2"

// ✅ Escaped newlines
"content": "Line 1\nLine 2"
```

## 📚 Integration with Code

These prompt files are loaded by the prompt system:

```typescript
import { loadPromptContent } from './data/prompts';

// Load specific prompt
const buyersPrompt = loadPromptContent('buyers-unified-analysis');

// Load element
const brandContext = loadPromptContent('element-brand-context');

// Combine elements
const fullPrompt = combinePromptElements([
  brandContext,
  buyersPrompt,
  outputFormat
], context);
```

## 🔄 Workflow

1. **Create** prompt/element JSON file
2. **Validate** JSON syntax
3. **Test** with sample data
4. **Integrate** with code
5. **Deploy** and monitor
6. **Refine** based on results

---

**Last Updated:** February 8, 2025  
**Maintained By:** CoHive Team
