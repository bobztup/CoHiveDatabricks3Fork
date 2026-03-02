/**
 * Databricks OAuth Token Exchange API Route
 * CRITICAL: This must run server-side to keep client_secret secure
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, workspaceHost, grantType = 'authorization_code', refreshToken } = req.body;

  // Validate required environment variables
  if (!process.env.DATABRICKS_CLIENT_ID || !process.env.DATABRICKS_CLIENT_SECRET) {
    console.error('Missing OAuth credentials in environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error. Please contact support.' 
    });
  }

  // Validate input based on grant type
  if (grantType === 'authorization_code') {
    if (!code || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code and workspaceHost' 
      });
    }
  } else if (grantType === 'refresh_token') {
    if (!refreshToken || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required parameters: refreshToken and workspaceHost' 
      });
    }
  } else {
    return res.status(400).json({ error: 'Invalid grant_type' });
  }

  try {
    const tokenUrl = `https://${workspaceHost}/oidc/v1/token`;
    
    // Build request body based on grant type
    const params = new URLSearchParams({
      client_id: process.env.DATABRICKS_CLIENT_ID,
      client_secret: process.env.DATABRICKS_CLIENT_SECRET,
      grant_type: grantType,
    });

    if (grantType === 'authorization_code') {
      params.append('code', code);
      params.append('redirect_uri', process.env.DATABRICKS_REDIRECT_URI || '');
    } else if (grantType === 'refresh_token') {
      params.append('refresh_token', refreshToken);
    }

    console.log(`[OAuth] Exchanging ${grantType} for workspace: ${workspaceHost}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OAuth] Token exchange failed:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: 'Failed to exchange code for token',
        details: errorText 
      });
    }

    const tokenData = await response.json();

    console.log('[OAuth] Token exchange successful');

    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('[OAuth] Token exchange error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during token exchange',
      message: error.message 
    });
  }
}
