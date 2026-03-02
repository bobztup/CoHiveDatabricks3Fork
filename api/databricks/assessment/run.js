/**
 * Assessment Run API
 *
 * Runs a multi-round AI collaboration assessment using personas and KB files.
 * - Fetches file content directly from Databricks (never trusts frontend content)
 * - System prompt and KB content stay server-side, never sent to client
 * - Returns only the AI-generated round outputs to the frontend
 *
 * Location: api/databricks/assessment/run.js
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      hexId,
      hexLabel,
      brand,
      projectType,
      assessmentTypes,
      userSolution,
      ideasFile,
      selectedPersonas,
      kbFiles,
      userEmail,
      accessToken,
      workspaceHost,
    } = req.body;

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!kbFiles || kbFiles.length === 0) {
      return res.status(400).json({ error: 'At least one knowledge base file is required' });
    }

    console.log(`[Assessment] Starting — hex: ${hexId}, brand: ${brand}`);
    console.log(`[Assessment] Types: ${assessmentTypes?.join(', ')}`);
    console.log(`[Assessment] Personas: ${selectedPersonas?.join(', ')}`);
    console.log(`[Assessment] KB files: ${kbFiles?.map(f => f.fileName).join(', ')}`);

    const warehouseId = '52742af9db71826d';
    const modelEndpoint = 'databricks-claude-sonnet-4-6';

    // ── Step 1: Fetch actual file content from Databricks ─────────────────
    const kbFilesWithContent = await Promise.all(
      kbFiles.map(async (kbFile) => {
        try {
          console.log(`[Assessment] Fetching: ${kbFile.fileName} (id: ${kbFile.fileId})`);

          const idClause = kbFile.fileId
            ? `file_id = '${kbFile.fileId.replace(/'/g, "''")}'`
            : `file_name = '${kbFile.fileName.replace(/'/g, "''")}'`;

          const metaResp = await fetch(
            `https://${workspaceHost}/api/2.0/sql/statements`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                warehouse_id: warehouseId,
                statement: `SELECT file_id, file_path, file_name, file_type, file_size_bytes
                            FROM knowledge_base.cohive.file_metadata
                            WHERE ${idClause} LIMIT 1`,
                wait_timeout: '30s',
              }),
            }
          );

          if (!metaResp.ok) {
            throw new Error(`Metadata query failed: ${metaResp.statusText}`);
          }

          const metaResult = await metaResp.json();
          const rows = metaResult.result?.data_array || [];

          if (rows.length === 0) {
            throw new Error(`File not found in knowledge base: "${kbFile.fileName}". Please re-select your files and try again.`);
          }

          const [resolvedFileId, filePath, fileName, fileType, fileSizeBytes] = rows[0];

          const fileResp = await fetch(
            `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!fileResp.ok) {
            throw new Error(`File download failed: ${fileResp.status} ${fileResp.statusText}`);
          }

          const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
          console.log(`[Assessment] Downloaded ${fileBuffer.length} bytes for ${fileName}`);

          const ext = fileName.toLowerCase().split('.').pop();
          let textContent = '';

          if (['txt', 'md', 'csv'].includes(ext)) {
            textContent = fileBuffer.toString('utf-8');

          } else if (ext === 'pdf') {
            try {
              const pdfParse = (await import('pdf-parse')).default;
              const parsed = await pdfParse(fileBuffer);
              textContent = parsed.text || '';
              console.log(`[Assessment] PDF: ${textContent.length} chars`);
            } catch (e) {
              textContent = `[PDF extraction failed for ${fileName}: ${e.message}]`;
            }

          } else if (['docx', 'doc'].includes(ext)) {
            try {
              const mammoth = await import('mammoth');
              const result = await mammoth.extractRawText({ buffer: fileBuffer });
              textContent = result.value || '';
              console.log(`[Assessment] DOCX: ${textContent.length} chars`);
            } catch (e) {
              textContent = `[DOCX extraction failed for ${fileName}: ${e.message}]`;
            }

          } else if (['xlsx', 'xls'].includes(ext)) {
            try {
              const XLSX = await import('xlsx');
              const wb = XLSX.read(fileBuffer, { type: 'buffer' });
              const lines = [];
              wb.SheetNames.forEach(sheet => {
                lines.push(`=== ${sheet} ===`);
                lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheet]));
              });
              textContent = lines.join('\n\n');
            } catch (e) {
              textContent = `[XLSX extraction failed for ${fileName}: ${e.message}]`;
            }

          } else {
            try {
              textContent = fileBuffer.toString('utf-8');
            } catch {
              textContent = `[Cannot extract text from ${fileName}]`;
            }
          }

          if (textContent.length > 80000) {
            textContent = textContent.slice(0, 80000) + '\n\n[... content truncated ...]';
          }

          return { fileId: resolvedFileId, fileName, content: textContent };

        } catch (err) {
          console.error(`[Assessment] Error loading ${kbFile.fileName}:`, err.message);
          // Re-throw so the whole assessment fails rather than running with incomplete data
          throw err;
        }
      })
    );

    // ── Step 2: Build prompts (server-side only, never returned to client) ─
    const assessmentTypeLabel = assessmentTypes?.includes('recommend') ? 'Recommend'
      : assessmentTypes?.includes('assess') ? 'Assess'
      : 'Unified';

    // Decode ideas file (base64 data URL) if the user chose "Load Current Ideas"
    let ideasContent = '';
    if (ideasFile?.content) {
      try {
        const b64 = ideasFile.content.includes(',')
          ? ideasFile.content.split(',')[1]
          : ideasFile.content;
        ideasContent = Buffer.from(b64, 'base64').toString('utf-8');
        console.log(`[Assessment] Ideas file decoded: ${ideasContent.length} chars from ${ideasFile.fileName}`);
      } catch (e) {
        console.warn('[Assessment] Could not decode ideas file:', e.message);
        ideasContent = ideasFile.content;
      }
    }

    let taskDescription = '';
    if (assessmentTypes?.includes('recommend')) {
      taskDescription = `Generate creative, specific recommendations for ${brand} in the context of ${hexLabel || hexId}. Ground every recommendation in the knowledge base files.`;
      if (ideasContent) {
        taskDescription += `\n\nCurrent ideas/work to build on:\n${ideasContent}`;
      }
    } else if (assessmentTypes?.includes('assess')) {
      const contentToAssess = ideasContent || userSolution || 'No content provided';
      taskDescription = `Critically assess the following content and provide detailed, constructive feedback:\n\n${contentToAssess}`;
    } else {
      taskDescription = `Collaborate to produce a unified, actionable recommendation for ${brand} in the ${hexLabel || hexId} context.`;
      if (ideasContent) {
        taskDescription += `\n\nCurrent ideas/work to assess and build on:\n${ideasContent}`;
      } else if (userSolution) {
        taskDescription += `\n\nSolution to consider: "${userSolution}"`;
      }
    }

    const personaList = selectedPersonas?.length > 0
      ? selectedPersonas.join(', ') + ', Fact-Checker'
      : 'General Expert, Fact-Checker';

    const kbContext = kbFilesWithContent
      .map(f => `--- BEGIN FILE: ${f.fileName} ---\n${f.content}\n--- END FILE: ${f.fileName} ---`)
      .join('\n\n');

    const systemPrompt = `You are facilitating a multi-persona collaborative assessment for ${brand}.

KNOWLEDGE BASE:
${kbContext}

CITATION RULES (strictly enforced):
- Every factual claim MUST be cited: [Source: exact_filename.ext]
- Only cite files listed above
- Label uncited general knowledge as [General Knowledge]
- Fact-Checker persona verifies all citations every round

ASSESSMENT TYPE: ${assessmentTypeLabel}
BRAND: ${brand}
PROJECT TYPE: ${projectType || 'General'}
CONTEXT: ${hexLabel || hexId}

FORMAT every round exactly like this:
## Round [N]

**[Persona Name]:** [Contribution with inline citations]
[Source: filename.ext]

**Fact-Checker:** [Verifies each citation — confirms it exists in the KB and accurately reflects the source]

---

Run minimum 2 rounds. When output is complete and high-quality, end with [COLLABORATION COMPLETE].`;

    const initialPrompt = `Begin a multi-round collaborative assessment. Each persona reviews the knowledge base and contributes their expert perspective.

Always include a "Fact-Checker" whose only job is verifying every citation exists in the KB and accurately reflects the source.

Task: ${taskDescription}
Personas: ${personaList}

Begin Round 1 now.`;

    // ── Step 3: Run multi-round collaboration ──────────────────────────────
    const rounds = [];
    let conversationHistory = [{ role: 'user', content: initialPrompt }];
    let roundNumber = 1;
    let isComplete = false;
    const maxRounds = 3;

    while (!isComplete && roundNumber <= maxRounds) {
      console.log(`[Assessment] Claude round ${roundNumber}...`);

      const aiResp = await fetch(
        `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
            max_tokens: 3000,
            temperature: 0.8,
          }),
        }
      );

      if (!aiResp.ok) {
        const errData = await aiResp.json().catch(() => ({}));
        throw new Error(`AI call failed (round ${roundNumber}): ${errData.message || aiResp.statusText}`);
      }

      const aiResult = await aiResp.json();
      const roundContent = aiResult.choices?.[0]?.message?.content || '';

      // Only store the AI output — prompts and KB content are never included
      rounds.push({
        roundNumber,
        content: roundContent,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Assessment] Round ${roundNumber} done (${roundContent.length} chars)`);

      if (roundContent.includes('[COLLABORATION COMPLETE]') || roundNumber >= maxRounds) {
        isComplete = true;
      } else {
        conversationHistory = [
          ...conversationHistory,
          { role: 'assistant', content: roundContent },
          {
            role: 'user',
            content: `Good work on Round ${roundNumber}. Continue with Round ${roundNumber + 1}. Deepen the analysis, build on previous contributions, and cite all KB references as [Source: filename.ext]. If the output is complete and high-quality, end with [COLLABORATION COMPLETE].`,
          },
        ];
      }

      roundNumber++;
    }

    // ── Step 4: Extract cited files ────────────────────────────────────────
    const allContent = rounds.map(r => r.content).join('\n');
    const citationMatches = [...allContent.matchAll(/\[Source:\s*([^\]]+)\]/g)];
    const citedFileNames = [...new Set(citationMatches.map(m => m[1].trim()))];

    const citedFiles = citedFileNames.map(name => {
      const match = kbFilesWithContent.find(
        f => f.fileName === name || f.fileName.toLowerCase() === name.toLowerCase()
      );
      return { fileName: name, fileId: match?.fileId || null };
    });

    console.log(`[Assessment] Complete — ${rounds.length} rounds, ${citedFiles.length} citations`);

    // Return ONLY AI outputs. System prompt, KB content, and conversation
    // scaffolding are never included in the response to the browser.
    return res.status(200).json({
      success: true,
      hexId,
      brand,
      projectType,
      assessmentType: assessmentTypeLabel,
      rounds,
      totalRounds: rounds.length,
      citedFiles,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Assessment] Error:', error);
    return res.status(500).json({
      error: 'Assessment failed',
      message: error.message,
    });
  }
}
