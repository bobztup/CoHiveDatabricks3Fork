import { getRoleForEmail } from '../utils/userRole.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, accessToken, workspaceHost } = req.query;

  if (!userEmail || !accessToken || !workspaceHost) {
    return res.status(400).json({ error: 'Missing required fields: userEmail, accessToken, workspaceHost' });
  }

  const schema = process.env.CLIENT_SCHEMA || 'cohive';
  const warehouseId = process.env.DATABRICKS_WAREHOUSE_ID || '';

  const role = await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
  return res.status(200).json({ role });
}
