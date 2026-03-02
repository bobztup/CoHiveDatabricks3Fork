export default async function handler(req, res) {
  const { accessToken, workspaceHost } = req.query;
  
  if (!accessToken || !workspaceHost) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const response = await fetch(
      `https://${workspaceHost}/api/2.0/preview/scim/v2/Me`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch user' });
    }

    const userData = await response.json();
    const email = userData.emails?.[0]?.value || userData.userName || 'unknown@databricks.com';
    const name = userData.displayName || email.split('@')[0];

    return res.status(200).json({ email, name });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
