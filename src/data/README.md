# CoHive Data Files

This directory contains example/test data and content definitions used throughout the CoHive application.

## Purpose

These files separate large data structures from application logic, making the codebase:
- **Cleaner**: Application logic isn't cluttered with test data
- **More maintainable**: Data can be updated without touching component code
- **More testable**: Mock data is in one place and easy to modify
- **Better organized**: Related data grouped logically

## Files

### Example/Test Data

#### `exampleResearchFiles.ts`
Mock research files available for development and testing reference.

**Contains:**
- Research files for Nike and Adidas brands
- Multiple project types: Creative Messaging, Product Launch, War Games, Packaging
- Workflow hexagon files: Luminaries, Panelist, Consumers, Competitors, Colleagues, Social Voices, Grade
- 13 example files total

**⚠️ IMPORTANT:** These files are **NOT automatically loaded** in the production app. They exist for:
- Development testing
- Documentation examples  
- Unit tests reference
- Feature demonstrations

**Production Behavior:** App starts with **empty research files**. Users must:
- Upload their own research files, OR
- Load files from Databricks, OR
- Import a saved project

**Usage (Development/Testing Only):**
```typescript
// Mock data is NOT imported in production builds
// Uncomment only for local testing
// import { exampleResearchFiles } from '../data/exampleResearchFiles';

// Filter by brand (for testing)
// import { getExampleFilesByBrand } from '../data/exampleResearchFiles';
// const nikeFiles = getExampleFilesByBrand('Nike');
```

---

### Content Definitions

#### `stepContentData.ts`
Content definitions for each hexagon in the workflow.

**Contains:**
- Step IDs, titles, descriptions
- Question arrays for each step
- 13 step definitions total

**Used by:** `/components/ProcessWireframe.tsx`

**Usage:**
```typescript
import { stepContentData, type StepContent } from '../data/stepContentData';

// Get all steps
const allSteps = stepContentData;

// Find specific step
import { getStepContent } from '../data/stepContentData';
const enterStep = getStepContent('Enter');

// Get steps with questions
import { getStepsWithQuestions } from '../data/stepContentData';
const activeSteps = getStepsWithQuestions();
```

---

### Other Data Directories

#### `prompts/`
AI prompt templates and builders for generating Databricks queries.

#### `persona-content/`
Persona definitions for Luminaries, Consumers, Panelists, etc.

#### `agent-content/`
Agent configurations for competitive analysis, brand strategy, etc.

---

## Best Practices

### When to Add Data Here

Move data to this directory when:
- **Large arrays** (>10 items) are cluttering component code
- **Test/example data** needed for demonstration
- **Configuration data** shared across multiple components
- **Content definitions** that rarely change

### When to Keep Data Inline

Keep data inline when:
- **Small arrays** (<5 items)
- **Component-specific state** that doesn't need sharing
- **Dynamically generated** data
- **User-generated** content

### File Naming

- Use camelCase: `exampleResearchFiles.ts`
- Be descriptive: `stepContentData.ts` not `data.ts`
- Include type: `Data`, `Config`, `Content` in the name

### Adding New Data Files

1. Create file in `/data/`
2. Export data with clear names
3. Include TypeScript interfaces
4. Add helper functions if useful
5. Document in this README
6. Update Guidelines.md if needed

---

## Migration Notes

**v30 (Current):** Example data and step content moved from inline definitions in ProcessWireframe.tsx to separate files for better organization and maintainability.

---

## Support

For questions about data structure or organization, refer to:
- **Guidelines:** `/guidelines/Guidelines.md`
- **API Docs:** `/docs/API_DOCUMENTATION.md`
- **Databricks Integration:** `/docs/DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md`