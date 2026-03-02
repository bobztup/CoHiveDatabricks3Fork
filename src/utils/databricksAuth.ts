/**
 * Databricks OAuth Authentication
 * Handles OAuth 2.0 flow with Databricks for secure authentication
 */

interface DatabricksOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

interface DatabricksTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface DatabricksSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  workspaceHost: string;
  userEmail?: string; // User's email address
  userName?: string;  // User's display name
}

const OAUTH_CONFIG: DatabricksOAuthConfig = {
  clientId: import.meta.env.VITE_DATABRICKS_CLIENT_ID || '',
  redirectUri: import.meta.env.VITE_DATABRICKS_REDIRECT_URI || (typeof window !== 'undefined' ? `${window.location.origin}/oauth/callback` : ''),
  scopes: ['all-apis', 'offline_access'], // offline_access for refresh token
};

const SESSION_KEY = 'cohive_databricks_session';

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(workspaceHost: string): string {
  const state = generateRandomState();
  localStorage.setItem('oauth_state', state);
  localStorage.setItem('oauth_workspace_host', workspaceHost);

  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: OAUTH_CONFIG.redirectUri,
    scope: OAUTH_CONFIG.scopes.join(' '),
    state: state,
  });

  return `https://${workspaceHost}/oidc/v1/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  workspaceHost: string
): Promise<DatabricksSession> {
  try {
    console.log('Exchanging authorization code for token...');
    
    // Use server-side API route to securely exchange code for token
    const response = await fetch('/api/databricks/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        workspaceHost,
        grantType: 'authorization_code',
      }),
    }).catch(err => {
      console.error('Network error during token exchange:', err);
      throw new Error('Unable to connect to Databricks. Please check your network connection.');
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Token exchange failed:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to exchange authorization code for token');
    }

    const tokenData: DatabricksTokenResponse = await response.json();
    console.log('Token received, expires in:', tokenData.expires_in, 'seconds');

    const session: DatabricksSession = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      workspaceHost,
    };

    // Store session
    saveSession(session);
    console.log('Session saved to sessionStorage');
    
    // Verify session was saved
    const savedSession = getSession();
    if (!savedSession) {
      console.error('Failed to verify saved session!');
      throw new Error('Session was not saved correctly');
    }
    console.log('Session verified successfully');

    return session;
  } catch (error) {
    console.error('Failed to exchange code for token:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<DatabricksSession | null> {
  const session = getSession();
  
  if (!session?.refreshToken) {
    return null;
  }

  try {
    // Use server-side API route to securely refresh token
    const response = await fetch('/api/databricks/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: session.refreshToken,
        workspaceHost: session.workspaceHost,
        grantType: 'refresh_token',
      }),
    }).catch(err => {
      console.error('Network error during token refresh:', err);
      return null;
    });

    if (!response || !response.ok) {
      console.error('Token refresh failed:', response?.status);
      clearSession();
      return null;
    }

    const tokenData: DatabricksTokenResponse = await response.json();

    const newSession: DatabricksSession = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || session.refreshToken,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      workspaceHost: session.workspaceHost,
    };

    saveSession(newSession);
    return newSession;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearSession();
    return null;
  }
}

/**
 * Get current valid session (refreshing if needed)
 */
export async function getValidSession(): Promise<DatabricksSession | null> {
  try {
    const session = getSession();

    if (!session) {
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiresIn = session.expiresAt - Date.now();
    const needsRefresh = expiresIn < 5 * 60 * 1000;

    if (needsRefresh && session.refreshToken) {
      return await refreshAccessToken();
    }

    return session;
  } catch (error) {
    console.error('Error getting valid session:', error);
    return null;
  }
}

/**
 * Get stored session
 */
export function getSession(): DatabricksSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load session:', error);
  }
  return null;
}

/**
 * Save session
 */
function saveSession(session: DatabricksSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Clear session
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('oauth_workspace_host');
  sessionStorage.removeItem('oauth_return_step');
  sessionStorage.removeItem('oauth_return_path');
}

/**
 * Check if URL has OAuth callback parameters
 */
export function hasOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return !!(params.get('code') && params.get('state'));
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const session = getSession();
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    clearSession();
    return false;
  }
  // Also check if explicitly logged out
  if (localStorage.getItem('cohive_logged_out') === 'true') {
    clearSession();
    localStorage.removeItem('cohive_logged_out');
    return false;
  }
  return true;
}

/**
 * Initiate OAuth login flow
 */
export function initiateLogin(workspaceHost: string, returnToStep?: string): void {
  // Clear any stale OAuth state
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('oauth_workspace_host');
  
  // Store the current step to return to after OAuth
  if (returnToStep) {
    sessionStorage.setItem('oauth_return_step', returnToStep);
  }
  
  // Store that we're on the app/hex page (not landing page)
  sessionStorage.setItem('oauth_return_path', '/');
  
  const authUrl = getAuthorizationUrl(workspaceHost);
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(): Promise<DatabricksSession | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  const storedState = localStorage.getItem('oauth_state');
  const workspaceHost = localStorage.getItem('oauth_workspace_host');

  if (!code || !state || !storedState || !workspaceHost) {
    throw new Error('Invalid OAuth callback');
  }

  if (state !== storedState) {
    throw new Error('OAuth state mismatch');
  }

  // Exchange code for token
  const session = await exchangeCodeForToken(code, workspaceHost);

  // Clean up
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('oauth_workspace_host');

  return session;
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.setItem('cohive_logged_out', 'true');
  clearSession();
  localStorage.removeItem('cohive_databricks_session');
  window.location.href = '/';
}

/**
 * Generate random state for OAuth
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get workspace host from session
 */
export function getWorkspaceHost(): string | null {
  const session = getSession();
  return session?.workspaceHost || null;
}

/**
 * Fetch current user information from Databricks
 */
export async function fetchCurrentUser(): Promise<{ email: string; name: string } | null> {
  try {
    const session = await getValidSession();
    if (!session) return null;

    const response = await fetch(
      `/api/databricks/user?accessToken=${session.accessToken}&workspaceHost=${session.workspaceHost}`
    );

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status);
      return null;
    }

    const userData = await response.json();
    
    // Update session with user info
    const updatedSession: DatabricksSession = {
      ...session,
      userEmail: userData.email,
      userName: userData.name,
    };
    saveSession(updatedSession);

    return { email: userData.email, name: userData.name };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Get current user's email (from session or fetch if needed)
 */
export async function getCurrentUserEmail(): Promise<string> {
  const session = getSession();
  
  // If email is already in session, return it
  if (session?.userEmail) {
    return session.userEmail;
  }

  // Otherwise fetch user info
  const userInfo = await fetchCurrentUser();
  return userInfo?.email || 'unknown@databricks.com';
}

/**
 * Get current user's name (from session or fetch if needed)
 */
export async function getCurrentUserName(): Promise<string> {
  const session = getSession();
  
  // If name is already in session, return it
  if (session?.userName) {
    return session.userName;
  }

  // Otherwise fetch user info
  const userInfo = await fetchCurrentUser();
  return userInfo?.name || 'Unknown User';
}