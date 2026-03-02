/**
 * Vercel Serverless Function: Execute Databricks AI Request
 * Handles sending prompts to Databricks for AI processing
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, hexId, brand, projectType, accessToken, workspaceHost } = req.body;

    // Validate required fields
    if (!prompt || !accessToken || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required fields: prompt, accessToken, workspaceHost' 
      });
    }

    // TODO: Replace with actual Databricks AI endpoint
    // This is a placeholder for the Databricks API call
    const databricksUrl = `https://${workspaceHost}/api/2.0/serving-endpoints/YOUR_ENDPOINT_NAME/invocations`;

    const response = await fetch(databricksUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          prompt,
          hexId,
          brand,
          projectType,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.message || `Databricks API error: ${response.statusText}`,
      });
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      result,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Databricks execution error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
