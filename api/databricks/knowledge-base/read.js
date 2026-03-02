/**
 * Knowledge Base Read API
 *
 * Reads file content from Databricks Volume and extracts text.
 * Supports: PDF (pdf-parse), DOCX/DOC (mammoth), XLSX (xlsx), TXT, CSV, MD
 *
 * Location: /api/databricks/knowledge-base/read.js
 *
 * Required in package.json dependencies:
 *   "pdf-parse": "^1.1.1",
 *   "mammoth": "^1.6.0",
 *   "xlsx": "^0.18.5"
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, fileName: hintFileName, accessToken, workspaceHost } = req.body;

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!fileId && !hintFileName) {
      return res.status(400).json({ error: 'fileId or fileName required' });
    }

    const warehouseId = '52742af9db71826d';

    // ── Step 1: Get file metadata from Unity Catalog ──────────────────────
    const metadataQuery = fileId
      ? `SELECT file_id, file_path, file_name, file_type, file_size_bytes
         FROM knowledge_base.cohive.file_metadata
         WHERE file_id = '${fileId.replace(/'/g, "''")}'
         LIMIT 1`
      : `SELECT file_id, file_path, file_name, file_type, file_size_bytes
         FROM knowledge_base.cohive.file_metadata
         WHERE file_name = '${hintFileName.replace(/'/g, "''")}'
         LIMIT 1`;

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
          statement: metadataQuery,
          wait_timeout: '30s',
        }),
      }
    );

    if (!metaResp.ok) {
      const err = await metaResp.json().catch(() => ({}));
      throw new Error(`Metadata query failed: ${err.message || metaResp.statusText}`);
    }

    const metaResult = await metaResp.json();
    const rows = metaResult.result?.data_array || [];

    if (rows.length === 0) {
      return res.status(404).json({ error: `File not found: ${fileId || hintFileName}` });
    }

    const [resolvedFileId, filePath, fileName, fileType, fileSizeBytes] = rows[0];
    console.log(`[KB Read] Found: ${fileName} at ${filePath} (${fileSizeBytes} bytes)`);

    // ── Step 2: Download raw bytes from Databricks Volume ─────────────────
    // filePath is stored as /Volumes/... — use the Files API
    const fileUrl = `https://${workspaceHost}/api/2.0/fs/files${filePath}`;

    const fileResp = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!fileResp.ok) {
      throw new Error(`File download failed: ${fileResp.status} ${fileResp.statusText}`);
    }

    const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
    console.log(`[KB Read] Downloaded ${fileBuffer.length} bytes`);

    // ── Step 3: Extract text based on file type ───────────────────────────
    const ext = fileName.toLowerCase().split('.').pop();
    let textContent = '';
    let extractionMethod = 'unknown';

    if (['txt', 'md', 'csv'].includes(ext)) {
      // Plain text
      textContent = fileBuffer.toString('utf-8');
      extractionMethod = 'plaintext';

    } else if (ext === 'pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(fileBuffer);
        textContent = parsed.text || '';
        extractionMethod = 'pdf-parse';
        console.log(`[KB Read] PDF extracted: ${textContent.length} chars, ${parsed.numpages} pages`);
      } catch (pdfErr) {
        console.error('[KB Read] PDF parse error:', pdfErr.message);
        // Fall back to raw base64 so the AI at least has something
        textContent = `[PDF: ${fileName} — text extraction failed: ${pdfErr.message}]\n\nRaw content (base64):\n${fileBuffer.toString('base64').slice(0, 2000)}...`;
        extractionMethod = 'pdf-fallback';
      }

    } else if (['docx', 'doc'].includes(ext)) {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = result.value || '';
        extractionMethod = 'mammoth';
        console.log(`[KB Read] DOCX extracted: ${textContent.length} chars`);
        if (result.messages?.length) {
          console.warn('[KB Read] Mammoth warnings:', result.messages.map(m => m.message).join('; '));
        }
      } catch (docErr) {
        console.error('[KB Read] DOCX parse error:', docErr.message);
        textContent = `[Word Document: ${fileName} — text extraction failed: ${docErr.message}]`;
        extractionMethod = 'docx-fallback';
      }

    } else if (['xlsx', 'xls'].includes(ext)) {
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(fileBuffer, { type: 'buffer' });
        const lines = [];
        wb.SheetNames.forEach(sheetName => {
          lines.push(`=== Sheet: ${sheetName} ===`);
          const ws = wb.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(ws);
          lines.push(csv);
        });
        textContent = lines.join('\n\n');
        extractionMethod = 'xlsx';
        console.log(`[KB Read] XLSX extracted: ${textContent.length} chars`);
      } catch (xlsxErr) {
        console.error('[KB Read] XLSX parse error:', xlsxErr.message);
        textContent = `[Excel File: ${fileName} — text extraction failed: ${xlsxErr.message}]`;
        extractionMethod = 'xlsx-fallback';
      }

    } else if (['pptx', 'ppt'].includes(ext)) {
      // PowerPoint files require the jszip package for XML extraction.
      // Since jszip is not guaranteed to be available, we return a clear
      // message rather than a misleading error. Users should convert PPTX
      // to PDF or export slide text as a .txt file before uploading.
      textContent = `[PowerPoint file: ${fileName}]\n\nPowerPoint text extraction is not supported in this environment. To use this file in assessments, please:\n1. Export the slides as a PDF and upload the PDF instead, or\n2. Copy the slide text into a .txt file and upload that.\n\nFile size: ${fileSizeBytes} bytes`;
      extractionMethod = 'pptx-unsupported';
      console.log(`[KB Read] PPTX not supported — returning guidance message for ${fileName}`);

    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      // Return as base64 for potential vision processing
      textContent = `[Image: ${fileName}]\ndata:image/${ext};base64,${fileBuffer.toString('base64')}`;
      extractionMethod = 'image-base64';

    } else if (['mp3', 'webm', 'wav', 'm4a'].includes(ext)) {
      textContent = `[Audio file: ${fileName} — ${fileSizeBytes} bytes. Audio transcription not yet supported.]`;
      extractionMethod = 'audio-stub';

    } else if (['mp4', 'mov', 'avi'].includes(ext)) {
      textContent = `[Video file: ${fileName} — ${fileSizeBytes} bytes. Video transcription not yet supported.]`;
      extractionMethod = 'video-stub';

    } else {
      // Try as plain text
      try {
        textContent = fileBuffer.toString('utf-8');
        extractionMethod = 'utf8-fallback';
      } catch {
        textContent = `[Binary file: ${fileName} — ${fileSizeBytes} bytes. Cannot extract text content.]`;
        extractionMethod = 'binary';
      }
    }

    // Truncate very large content to avoid hitting Claude context limits
    const MAX_CHARS = 80000;
    let truncated = false;
    if (textContent.length > MAX_CHARS) {
      textContent = textContent.slice(0, MAX_CHARS);
      truncated = true;
      console.log(`[KB Read] Content truncated to ${MAX_CHARS} chars`);
    }

    return res.status(200).json({
      success: true,
      fileId: resolvedFileId,
      fileName,
      fileType,
      filePath,
      content: textContent,
      extractionMethod,
      fileSizeBytes,
      truncated,
    });

  } catch (error) {
    console.error('[KB Read] Error:', error);
    return res.status(500).json({
      error: 'File read failed',
      message: error.message,
    });
  }
}
