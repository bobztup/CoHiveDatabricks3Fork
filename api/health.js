/**
 * Vercel Serverless Function: Health Check
 * Simple endpoint to verify the API is running
 */

export default async function handler(req, res) {
  const checks = {
    api: 'healthy',
    databricks: process.env.DATABRICKS_CLIENT_ID ? 'configured' : 'missing',
    warehouse: process.env.WAREHOUSE_ID ? 'configured' : 'missing',
  };
  
  return res.status(200).json({
    status: 'healthy',
    service: 'CoHive API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  });
}
