/**
 * CoHive Databricks Setup Script
 *
 * One-time initialization for a new client deployment.
 * Creates all required tables and volumes in the client's Databricks workspace.
 *
 * Usage: POST /api/setup/init
 * Body:
 *   {
 *     schema:     string   (optional — overrides CLIENT_SCHEMA env var),
 *     brands:     string[] (required — e.g. ["Truly", "Sinless", "Twisted Tea"]),
 *     adminEmail: string   (optional — seeds an administrator row in user_roles),
 *   }
 *
 * Safe to call multiple times — all creates use IF NOT EXISTS and the seed
 * uses MERGE, so re-running will not duplicate or overwrite existing data.
 *
 * Location: api/setup/init.js
 */

import { getDatabricksConfig } from '../utils/validateEnv.js';

const esc = (s) => String(s).replace(/'/g, "''");

const DEFAULT_PROJECT_TYPES = [
  'Creative Messaging',
  'War Games',
  'Brand Essence',
  'Packaging',
  'Product Launch',
  'Manifesto',
  'Brand Architecture',
  'Campaign Strategy',
  'Consumer Insights',
];

async function runSQL(workspaceHost, accessToken, warehouseId, statement, label) {
  console.log(`[Setup] Running: ${label}`);
  const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '50s' }),
  });

  const result = await resp.json();

  if (!resp.ok) {
    throw new Error(`${label} failed: ${result.message || resp.statusText}`);
  }

  console.log(`[Setup] ✅ ${label}`);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envConfig = getDatabricksConfig();
    const { workspaceHost, accessToken, warehouseId, clientName } = envConfig;

    // schema can be overridden in the body — useful for testing a new client
    // schema inside an existing workspace before their deployment is live
    const schema = req.body?.schema?.trim() || envConfig.schema;
    const brands = Array.isArray(req.body?.brands) ? req.body.brands.filter(Boolean) : [];
    const adminEmail = req.body?.adminEmail?.trim() || '';

    if (brands.length === 0) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'brands array is required (e.g. ["Truly", "Sinless", "Twisted Tea"])',
      });
    }

    console.log(`[Setup] Initializing CoHive for: ${clientName}`);
    console.log(`[Setup] Workspace: ${workspaceHost}`);
    console.log(`[Setup] Schema: knowledge_base.${schema}`);
    console.log(`[Setup] Brands: ${brands.join(', ')}`);

    const steps = [];

    // ── Step 1: Create catalog ─────────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE CATALOG IF NOT EXISTS knowledge_base`,
      'Create catalog'
    );
    steps.push('catalog');

    // ── Step 2: Create schema ──────────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE SCHEMA IF NOT EXISTS knowledge_base.${schema}`,
      'Create schema'
    );
    steps.push('schema');

    // ── Step 3: Create volume for file storage ─────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE VOLUME IF NOT EXISTS knowledge_base.${schema}.default`,
      'Create volume'
    );
    steps.push('volume');

    // ── Step 4: Create file_metadata table ────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.file_metadata (
        file_id             STRING NOT NULL,
        file_path           STRING,
        file_name           STRING,
        scope               STRING,
        category            STRING,
        brand               STRING,
        project_type        STRING,
        file_type           STRING,
        is_approved         BOOLEAN DEFAULT FALSE,
        upload_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        uploaded_by         STRING,
        approver_email      STRING,
        approval_date       TIMESTAMP,
        approval_notes      STRING,
        tags                ARRAY<STRING>,
        citation_count      INT DEFAULT 0,
        gem_inclusion_count INT DEFAULT 0,
        file_size_bytes     BIGINT,
        content_summary     STRING,
        insight_type        STRING,
        input_method        STRING,
        cleaning_status     STRING DEFAULT 'pending',
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_file_metadata PRIMARY KEY (file_id)
      )`,
      'Create file_metadata table'
    );
    steps.push('file_metadata table');

    // ── Step 5: Create gems table ──────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.gems (
        gem_id           STRING NOT NULL,
        gem_text         STRING,
        file_id          STRING,
        file_name        STRING,
        assessment_type  STRING,
        hex_id           STRING,
        hex_label        STRING,
        brand            STRING,
        project_type     STRING,
        created_by       STRING,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_gems PRIMARY KEY (gem_id)
      )`,
      'Create gems table'
    );
    steps.push('gems table');

    // ── Step 6: Create users table ─────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.users (
        user_email  STRING NOT NULL,
        role        STRING DEFAULT 'analyst',
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        last_login  TIMESTAMP,
        CONSTRAINT pk_users PRIMARY KEY (user_email)
      )`,
      'Create users table'
    );
    steps.push('users table');

    // ── Step 7: Create activity_log table ──────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.activity_log (
        log_id       STRING NOT NULL,
        event_type   STRING,
        severity     STRING DEFAULT 'info',
        user_email   STRING,
        brand        STRING,
        project_type STRING,
        hex_id       STRING,
        message      STRING,
        details      STRING,
        duration_ms  INT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_activity_log PRIMARY KEY (log_id)
      )`,
      'Create activity_log table'
    );
    steps.push('activity_log table');

    // ── Step 8: Create shared_config table ────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.shared_config (
        config_id     STRING NOT NULL,
        config_type   STRING NOT NULL,
        config_value  STRING NOT NULL,
        display_order INT DEFAULT 0,
        is_active     BOOLEAN DEFAULT TRUE,
        created_by    STRING,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_shared_config PRIMARY KEY (config_id)
      )`,
      'Create shared_config table'
    );
    steps.push('shared_config table');

    // ── Step 9: Seed brands and project types ──────────────────────────────
    const brandRows = brands.map((b, i) => {
      const id = `brand_${b.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      return `SELECT '${esc(id)}' AS config_id, 'brand' AS config_type, '${esc(b)}' AS config_value, ${i + 1} AS display_order`;
    });

    const projectTypeRows = DEFAULT_PROJECT_TYPES.map((pt, i) => {
      const id = `project_${pt.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      return `SELECT '${esc(id)}' AS config_id, 'project_type' AS config_type, '${esc(pt)}' AS config_value, ${i + 1} AS display_order`;
    });

    const allRows = [...brandRows, ...projectTypeRows].join('\n         UNION ALL ');

    await runSQL(workspaceHost, accessToken, warehouseId,
      `MERGE INTO knowledge_base.${schema}.shared_config AS target
       USING (
         ${allRows}
       ) AS source
       ON target.config_id = source.config_id
       WHEN NOT MATCHED THEN INSERT (config_id, config_type, config_value, display_order, created_by)
       VALUES (source.config_id, source.config_type, source.config_value, source.display_order, 'system')`,
      'Seed brands and project types'
    );
    steps.push('seed brands and project types');

    // ── Step 10: Create user_roles table ──────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.user_roles (
        id          STRING NOT NULL,
        match_type  STRING NOT NULL,
        match_value STRING NOT NULL,
        role        STRING NOT NULL,
        created_by  STRING,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        is_active   BOOLEAN DEFAULT TRUE,
        CONSTRAINT pk_user_roles PRIMARY KEY (id)
      )`,
      'Create user_roles table'
    );
    steps.push('user_roles table');

    // ── Step 11: Create project_type_configs table ─────────────────────────
    // Stores client-specific custom AI prompts per project type.
    // Built-in prompts live in src/data/systemProjectTypes.ts.
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.project_type_configs (
        config_id    STRING NOT NULL,
        project_type STRING NOT NULL,
        prompt       STRING NOT NULL,
        created_by   STRING NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_by   STRING,
        updated_at   TIMESTAMP,
        is_active    BOOLEAN DEFAULT TRUE,
        CONSTRAINT pk_project_type_configs PRIMARY KEY (config_id)
      )`,
      'Create project_type_configs table'
    );
    steps.push('project_type_configs table');

    // ── Step 12: Create custom_personas table ─────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.custom_personas (
        persona_id   STRING NOT NULL,
        name         STRING,
        hex_ids      STRING,
        content_json STRING,
        created_by   STRING,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        is_active    BOOLEAN DEFAULT TRUE,
        CONSTRAINT pk_custom_personas PRIMARY KEY (persona_id)
      )`,
      'Create custom_personas table'
    );
    steps.push('custom_personas table');

    // ── Step 13: Seed admin user_roles row (optional) ─────────────────────
    if (adminEmail) {
      const adminId = `admin_${adminEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await runSQL(workspaceHost, accessToken, warehouseId,
        `MERGE INTO knowledge_base.${schema}.user_roles AS target
         USING (
           SELECT '${esc(adminId)}' AS id,
                  'email'           AS match_type,
                  '${esc(adminEmail.toLowerCase())}' AS match_value,
                  'administrator'   AS role
         ) AS source
         ON target.id = source.id
         WHEN NOT MATCHED THEN INSERT (id, match_type, match_value, role, created_by)
         VALUES (source.id, source.match_type, source.match_value, source.role, 'system')`,
        `Seed admin role for ${adminEmail}`
      );
      steps.push(`admin role for ${adminEmail}`);
    }

    console.log(`[Setup] ✅ All steps complete for ${clientName} (schema: knowledge_base.${schema})`);

    return res.status(200).json({
      success: true,
      clientName,
      schema: `knowledge_base.${schema}`,
      workspaceHost,
      brandsSeeded: brands,
      projectTypesSeeded: DEFAULT_PROJECT_TYPES,
      stepsCompleted: steps,
      message: `CoHive successfully initialized for ${clientName}. All tables and volumes are ready.`,
    });

  } catch (error) {
    console.error('[Setup] Error:', error);
    return res.status(500).json({ error: 'Setup failed', message: error.message });
  }
}
