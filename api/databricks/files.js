/**
 * Databricks API Proxy
 * Proxies requests to Databricks API to avoid CORS issues
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

  const { accessToken, workspaceHost, endpoint, method = 'GET', body } = req.body;

  // Validate required parameters
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  if (!workspaceHost) {
    return res.status(400).json({ error: 'Missing workspace host' });
  }

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing API endpoint' });
  }

  try {
    const url = `https://${workspaceHost}${endpoint}`;
    
    console.log(`[Databricks API] ${method} ${endpoint}`);

    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Only add body for non-GET requests
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle non-JSON responses (like file downloads)
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Databricks API] Request failed:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: `Databricks API error: ${response.statusText}`,
        details: errorText,
        status: response.status
      });
    }

    // Return JSON response
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(200).json(data);
    }

    // Return text for non-JSON responses
    const text = await response.text();
    return res.status(200).json({ content: text });

  } catch (error) {
    console.error('[Databricks API] Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
