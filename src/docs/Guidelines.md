### Data Files

Data files are organized separately for development reference:

- **`/data/exampleResearchFiles.ts`**: Contains mock research files for Nike and Adidas brands, covering multiple project types (Creative Messaging, Product Launch, War Games, Packaging) and workflow hexagons (Luminaries, Panelist, Consumers, etc.)
  - **Note:** These mock files are NOT automatically loaded in the app. They are available for development/testing only.
  - **Production:** App automatically loads **shared organizational knowledge base files** from Databricks on first run.
  - **Knowledge Base:** All approved files from the Databricks workspace are available to all users.

- **`/data/stepContentData.ts`**: Contains content definitions for each hexagon, including titles, descriptions, and questions. Import this instead of defining step content inline.

**Usage:**
```typescript
// stepContentData is actively used in the app
import { stepContentData, type StepContent } from '../data/stepContentData';

// exampleResearchFiles available for testing only (not auto-loaded)
// import { exampleResearchFiles } from '../data/exampleResearchFiles';

// Knowledge Base loading (automatic on first run)
import { listKnowledgeBaseFiles, type KnowledgeBaseFile } from '../utils/databricksAPI';
```

**Knowledge Base Auto-Loading:**
- First-time users automatically get all approved knowledge base files from Databricks
- Files are cached locally for offline access
- Knowledge base is shared across all users in the Databricks workspace
- Manual refresh available via "Import from Databricks" button