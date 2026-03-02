# CoHive API Documentation

## Overview

CoHive uses **Vercel Serverless Functions** as the backend API layer to communicate with Databricks. All API endpoints are located in the `/api` directory and are deployed as serverless functions on Vercel.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   CoHive    │─────▶│   Vercel     │─────▶│ Databricks  │
│  Frontend   │      │   API Layer  │      │   Backend   │
└─────────────┘      └──────────────┘      └─────────────┘
```

**Flow:**
1. Frontend makes request to `/api/*` endpoint
2. Vercel serverless function receives request
3. Function proxies request to Databricks with OAuth token
4. Databricks processes and returns response
5. Vercel function forwards response to frontend

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Description:** Verifies the API is running

**Response:**
```json
{
  "status": "healthy",
  "service": "CoHive API",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 2. List Databricks Files

**Endpoint:** `GET /api/databricks-list-files`

**Description:** List files from Databricks workspace, volumes, or DBFS

**Query Parameters:**
- `path` (required): The path to list (e.g., `/Workspace/Shared`, `/Volumes/catalog/schema/volume`, `dbfs:/FileStore`)
- `fileTypes` (optional): Comma-separated file extensions to filter (e.g., `pdf,docx,txt`)
- `accessToken` (required): Databricks OAuth access token
- `workspaceHost` (required): Databricks workspace hostname (e.g., `your-workspace.cloud.databricks.com`)

**Example Request:**
```javascript
const response = await fetch('/api/databricks-list-files?path=/Workspace/Shared&fileTypes=pdf,docx&accessToken=YOUR_TOKEN&workspaceHost=your-workspace.cloud.databricks.com');
```

**Response:**
```json
{
  "path": "/Workspace/Shared",
  "files": [
    {
      "name": "research_document.pdf",
      "path": "/Workspace/Shared/research_document.pdf",
      "type": "workspace",
      "size": 1024000,
      "modified_at": 1707393600000
    }
  ],
  "count": 1
}
```

---

### 3. Read Databricks File

**Endpoint:** `POST /api/databricks-read-file`

**Description:** Read content from a Databricks file

**Request Body:**
```json
{
  "path": "/Workspace/Shared/document.txt",
  "encoding": "text",
  "accessToken": "YOUR_TOKEN",
  "workspaceHost": "your-workspace.cloud.databricks.com"
}
```

**Parameters:**
- `path` (required): Full path to the file
- `encoding` (optional): `text` or `base64` (default: `text`)
- `accessToken` (required): Databricks OAuth access token
- `workspaceHost` (required): Databricks workspace hostname

**Response:**
```json
{
  "path": "/Workspace/Shared/document.txt",
  "name": "document.txt",
  "content": "File content here...",
  "encoding": "text"
}
```

---

### 4. Execute Databricks AI Request

**Endpoint:** `POST /api/databricks-execute`

**Description:** Send prompts to Databricks for AI processing

**Request Body:**
```json
{
  "prompt": "Analyze this market research...",
  "hexId": "Consumers",
  "brand": "Nike",
  "projectType": "Creative Messaging",
  "accessToken": "YOUR_TOKEN",
  "workspaceHost": "your-workspace.cloud.databricks.com"
}
```

**Parameters:**
- `prompt` (required): The AI prompt to send to Databricks
- `hexId` (optional): The workflow step ID
- `brand` (optional): Brand name
- `projectType` (optional): Project type
- `accessToken` (required): Databricks OAuth access token
- `workspaceHost` (required): Databricks workspace hostname

**Response:**
```json
{
  "success": true,
  "result": {
    "recommendations": "...",
    "insights": "..."
  },
  "timestamp": 1707393600000
}
```

---

## Authentication

All API endpoints (except `/api/health`) require:

1. **OAuth Access Token:** Obtained through Databricks OAuth 2.0 flow
2. **Workspace Host:** Your Databricks workspace hostname

The frontend handles OAuth authentication and passes the token to API endpoints.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or expired token)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

---

## Local Development

To test API endpoints locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run local development server
vercel dev
```

This starts a local server that simulates the Vercel environment.

---

## Deployment

API endpoints are automatically deployed to Vercel when you push to your repository:

```bash
# Deploy to Vercel
vercel --prod
```

---

## Environment Variables

Set these in your Vercel project settings:

- `VITE_DATABRICKS_CLIENT_ID` - Databricks OAuth client ID
- `VITE_DATABRICKS_REDIRECT_URI` - OAuth redirect URI

---

## File Structure

```
/api
├── health.ts                    # Health check endpoint
├── databricks-list-files.ts     # List files endpoint
├── databricks-read-file.ts      # Read file endpoint
└── databricks-execute.ts        # Execute AI request endpoint
```

---

## Security Notes

- ✅ **No credentials stored** - Access tokens are passed from frontend
- ✅ **CORS enabled** - API can be called from your domain
- ✅ **Token validation** - Databricks validates all tokens
- ✅ **Serverless** - Each request runs in isolated environment
- ✅ **Auto-scaling** - Vercel handles traffic automatically

---

## Migration from Python Backend

The original Python Flask API (`/api/databricks_files.py`) has been replaced with Vercel TypeScript serverless functions. The new API provides:

- ✅ Better performance with serverless architecture
- ✅ Automatic scaling
- ✅ Lower costs (pay-per-request)
- ✅ TypeScript type safety
- ✅ Edge deployment for low latency

---

**Version:** 1.0.0  
**Last Updated:** February 2026
