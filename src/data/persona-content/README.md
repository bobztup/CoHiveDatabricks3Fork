# CoHive Persona Content Files

This folder contains rich, detailed content for each persona used in the CoHive workflow hexes.

## 📁 File Structure

Each persona has its own JSON file named by its ID:
```
/data/persona-content/
  ├── README.md (this file)
  ├── luminaries-tech-cto.json
  ├── panelist-millennial-parent.json
  ├── consumers-b2b-smb.json
  └── ... (more personas)
```

## 🎯 Why Separate Files?

**Benefits:**
- ✅ Non-technical users can edit persona details without touching code
- ✅ Supports very rich, detailed content (multiple paragraphs, lists, metadata)
- ✅ Easy to version control and track changes
- ✅ Can be edited in any text editor
- ✅ Each persona can evolve independently

## 📝 How to Add a New Persona

### Step 1: Create the JSON File

Create a new file: `{persona-id}.json`

**Example:** `luminaries-finance-cfo.json`

```json
{
  "id": "luminaries-finance-cfo",
  "name": "Chief Financial Officer",
  "description": "Brief one-sentence description",
  "context": "Longer context for AI - who they are, what they do, how they think",
  "detailedProfile": "Multi-paragraph rich description...",
  "demographics": {
    "ageRange": "45-65",
    "education": "MBA or equivalent",
    "experience": "20+ years in finance"
  },
  "psychographics": {
    "values": ["Financial discipline", "Risk management"],
    "interests": ["Market trends", "Strategic planning"],
    "concerns": ["Economic uncertainty", "Cash flow"],
    "motivations": ["Building shareholder value"]
  },
  "suggestedPrompts": [
    "What are the financial implications?",
    "How should we model the ROI?"
  ],
  "exampleQuotes": [
    "Show me the numbers.",
    "What's the payback period?"
  ],
  "keyInsights": [
    "CFOs prioritize ROI over features",
    "They need to justify expenses to the board"
  ],
  "metadata": {
    "lastUpdated": "2025-01-29",
    "author": "Your Name"
  }
}
```

### Step 2: Register in personas.ts

Open `/data/personas.ts` and add the persona reference to the appropriate hex:

```typescript
roles: [
  { id: 'luminaries-finance-cfo', name: 'Chief Financial Officer' }
]
```

That's it! The system will automatically load the content from your JSON file.

## 📋 JSON File Template

### Required Fields

```json
{
  "id": "unique-persona-id",
  "name": "Display Name",
  "description": "One-sentence summary",
  "context": "Background for Databricks AI",
  "suggestedPrompts": [
    "Question 1?",
    "Question 2?"
  ]
}
```

### Optional But Recommended Fields

```json
{
  "detailedProfile": "Rich multi-paragraph description of this persona. Can include background, typical day, decision-making process, etc.",
  
  "demographics": {
    "ageRange": "30-50",
    "income": "$80k-$150k",
    "education": "Bachelor's degree",
    "location": "Urban/suburban",
    "occupation": "Marketing Manager"
  },
  
  "psychographics": {
    "values": ["What they care about"],
    "interests": ["What they're interested in"],
    "concerns": ["What worries them"],
    "motivations": ["What drives their decisions"],
    "painPoints": ["What frustrates them"],
    "decisionMakingStyle": "How they make decisions"
  },
  
  "exampleQuotes": [
    "Things this persona would say",
    "Helps make them feel real"
  ],
  
  "keyInsights": [
    "Important facts about this persona",
    "How to communicate with them",
    "What influences their decisions"
  ],
  
  "typicalPurchaseBehavior": {
    "researchProcess": "How they research products",
    "purchaseChannels": ["Where they buy"],
    "influencers": ["Who influences them"],
    "priceSensitivity": "High/Medium/Low"
  },
  
  "metadata": {
    "lastUpdated": "2025-01-29",
    "author": "Author name",
    "version": "1.0",
    "sources": ["Where this info came from"],
    "reviewCycle": "How often to review"
  }
}
```

## 🎨 Best Practices

### 1. Be Specific and Detailed
- ❌ "Cares about quality"
- ✅ "Prioritizes durability over initial cost, expects products to last 5+ years"

### 2. Use Real Language
Include example quotes that sound authentic:
- "I don't have time to figure this out right now"
- "Show me the data before we make this decision"

### 3. Include Context for AI
The `context` field is used by Databricks to understand the persona:
```json
"context": "A small business owner is budget-conscious, wears multiple hats, values ROI over features, and makes quick decisions with limited time. They've likely been burned by complex enterprise software before."
```

### 4. Think About Their Day
What does a typical day look like? What pressures do they face? What information do they trust?

### 5. Update Regularly
Set a review cycle and keep personas current with changing demographics and behaviors.

## 🔍 Examples to Reference

**Rich, detailed examples:**
- `luminaries-tech-cto.json` - Professional expert persona
- `panelist-millennial-parent.json` - Consumer persona with demographics

**These show:**
- Deep psychographic insights
- Multiple example quotes
- Detailed decision-making patterns
- Real concerns and motivations
- Metadata and versioning

## 🛠️ Editing Tips

### Use a JSON Validator
Before saving, validate your JSON:
- [JSONLint.com](https://jsonlint.com/)
- VS Code (shows errors automatically)

### Common Mistakes
```json
// ❌ Trailing comma on last item
"values": ["Item 1", "Item 2",]

// ✅ No trailing comma
"values": ["Item 1", "Item 2"]

// ❌ Unescaped quotes
"quote": "They said "this is wrong""

// ✅ Escaped quotes
"quote": "They said \"this is correct\""
```

### Multi-line Text
For long descriptions, use `\n` for line breaks:
```json
"detailedProfile": "First paragraph.\n\nSecond paragraph after blank line.\n\nThird paragraph."
```

## 📊 What Gets Sent to Databricks

When a user selects a persona, this data is sent to Databricks:

**Sent to AI:**
- `name` - Who they're talking to
- `context` - Background about this persona
- `detailedProfile` - Full persona details
- `suggestedPrompts` - Example questions

**Used in UI:**
- `description` - Shown in dropdown
- `name` - Displayed as selection
- `suggestedPrompts` - Can show to user as suggestions

## 🔄 Version Control

Keep track of changes:
```json
"metadata": {
  "lastUpdated": "2025-01-29",
  "author": "Jane Smith",
  "version": "2.1",
  "changeLog": "Updated income range based on new census data"
}
```

## 📚 Research Sources

Good places to research persona details:
- **Demographics:** US Census, Pew Research, Nielsen
- **Psychographics:** Consumer surveys, social listening
- **Industry:** Trade publications, LinkedIn insights
- **Behavior:** User research, customer interviews
- **Quotes:** Actual customer feedback, reviews, forums

## 💡 Need Help?

**Questions:**
- How detailed should I be? → Very! Rich details make better AI responses
- Can I add custom fields? → Yes! Add any fields that are useful
- What if I don't know something? → Leave it out or mark as "TBD"
- Should I include sources? → Yes, in metadata.sources

**Examples:**
Look at existing persona files for inspiration on structure and depth.

---

**Last Updated:** January 29, 2025  
**Maintained By:** CoHive Team
