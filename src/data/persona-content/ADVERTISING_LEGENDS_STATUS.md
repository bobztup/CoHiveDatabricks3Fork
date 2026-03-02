# Advertising Legends Persona Content

## Completed Personas

The following advertising legend personas have been fully documented:

### Golden Age (1950s-1970s)
- ✅ **David Ogilvy** - Scientific & Research-Driven approach
- ✅ **Bill Bernbach** - Creative Revolution, human truth
- ✅ **Leo Burnett** - Inherent Drama & Iconography
- ✅ **George Lois** - Big Ideas and cultural provocation

### Modern Masters (1980s-2000s)
- ✅ **Dan Wieden** - Purposeful storytelling and "Just Do It"

### Contemporary Voices (2010s-Present)
- ✅ **Byron Sharp** - Evidence-based marketing scientist
- ✅ **Rory Sutherland** - Behavioral economics and psychological magic

## Personas to Create

Based on `/imports/ogilvy-vs-bernbach-ad-theory.md`, the following personas still need JSON files:

### Golden Age (1950s-1970s)

**Scientific & Research-Driven:**
- Claude Hopkins - "Salesmanship in print," testing and direct response
- Rosser Reeves - USP (Unique Selling Proposition) and repetition
- Russell Colley - DAGMAR communication model

**Creative Revolution:**
- Mary Wells Lawrence - Theatricality and total brand experience
- Howard Gossage - Interactive advertising and social purpose

### Modern Masters (1980s-2000s)

**Brand Builders & Strategists:**
- Lee Clow - Media Arts, Apple's "1984," visual purity
- Sir John Hegarty - Singular ideas with wit, style, and craft
- Jeff Goodby - Empathy, observation, narrative storytelling
- Rich Silverstein - Visual intelligence and conceptual sharpness

**Disruptors & Provocateurs:**
- Alex Bogusky - Culturally disruptive, participatory ideas
- Dave Trott - Predatory Thinking, brutal simplicity

### Contemporary Voices (2010s-Present)

**System Thinkers:**
- Tiffany Rolfe - Living Creative Systems, brand ecosystems
- Margaret Johnson - Human-Centric Innovation in AI Era

**Modern Craft:**
- Greg Hahn - Mischief Principle, smart simplicity

### Alternative Perspectives

**Design & Visual Language:**
- Paula Scher - Typography as Identity, visual architecture

### Fictional Icons
- Don Draper - Seductive storyteller, emotional myths

## File Structure

Each persona JSON should include:

- **id**: kebab-case ID matching personas.ts
- **name**: Display name
- **description**: One-sentence summary
- **context**: Detailed background for AI embodiment
- **detailedProfile**: Multi-paragraph rich description
- **psychographics**: values, philosophies, dislikes, praises
- **voiceCharacteristics**: tone, style, speechPattern
- **evaluationCriteria**: alwaysAsks, reactsToEarlyIdeas, scoringRubric
- **suggestedPrompts**: Questions to ask this persona
- **exampleQuotes**: Actual quotes or characteristic statements
- **keyInsights**: Important facts and approaches
- **famousWork**: Notable campaigns, books, achievements
- **metadata**: era, philosophy, agency, books, legacy

## Source Document

All persona details are in: `/imports/ogilvy-vs-bernbach-ad-theory.md`

This comprehensive document includes:
- Core theories and advertising philosophies
- What makes a great ad (for each legend)
- View on creativity
- Persona details for reviews
- Voice guidelines
- Scoring rubrics
- Signature questions they always ask
- How they react to early-stage ideas

## Creating New Personas

1. Read the legend's section in `/imports/ogilvy-vs-bernbach-ad-theory.md`
2. Copy `_TEMPLATE.json` structure
3. Fill in all fields with information from the document
4. Include ALL elements: theories, voice, reactions, quotes, etc.
5. Save as `{persona-id}.json` in this directory
6. The ID must match the `id` field in `/data/personas.ts`

## Usage in CoHive

When a user selects a legend in the Luminaries hex:
1. The system looks up the persona by ID
2. Loads the JSON content from this directory
3. Sends the full context to Databricks AI
4. AI embodies that legend's voice, theories, and evaluation style
5. Provides feedback as that advertising legend would

---

**Last Updated:** 2026-03-01
**Status:** 7 of 24 personas completed (29%)
