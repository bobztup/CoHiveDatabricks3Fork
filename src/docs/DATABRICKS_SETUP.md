# Databricks OAuth Integration Setup

CoHive uses **Databricks OAuth 2.0** for secure authentication. All credentials are stored and managed by Databricks - never in the browser or third-party servers.

## How It Works

1. **User initiates login**: User enters their Databricks workspace URL
2. **OAuth redirect**: User is redirected to Databricks for authentication
3. **Databricks authentication**: User signs in with their Databricks account
4. **Authorization**: User authorizes CoHive to access their workspace
5. **Token exchange**: Databricks provides a temporary access token
6. **Session management**: Token is stored in sessionStorage (expires when browser closes)
7. **Auto-refresh**: Tokens are automatically refreshed using refresh tokens

## For Users: Connecting to Databricks

### Step 1: Configure OAuth App in Databricks

Before using CoHive, your Databricks administrator needs to register CoHive as an OAuth application:

1. Log in to your Databricks workspace as an admin
2. Go to **Settings** → **Developer** → **OAuth**
3. Click **Add App**
4. Configure the OAuth app:
   - **App Name**: CoHive
   - **Redirect URLs**: `https://your-cohive-domain.com/oauth/callback`
   - **Scopes**: Select `all-apis` and `offline_access`
5. Click **Save**
6. Copy the **Client ID** (you'll need this)

### Step 2: Configure Environment Variables

Add these environment variables to your `.env` file:

```env
VITE_DATABRICKS_CLIENT_ID=your_databricks_client_id_here
VITE_DATABRICKS_REDIRECT_URI=https://your-cohive-domain.com/oauth/callback
```

For local development:
```env
VITE_DATABRICKS_CLIENT_ID=your_databricks_client_id_here
VITE_DATABRICKS_REDIRECT_URI=http://localhost:3000/oauth/callback
```

### Step 3: Sign In to CoHive

1. Open CoHive
2. Click to browse Databricks files (or use any Databricks feature)
3. Enter your **Databricks workspace URL**:
   - Example: `adb-1234567890123456.7.azuredatabricks.net`
   - Don't include `https://`
4. Click **Sign in with Databricks**
5. You'll be redirected to your Databricks workspace
6. Sign in with your Databricks credentials
7. Click **Authorize** to grant CoHive access
8. You'll be redirected back to CoHive
9. Start browsing files!

### Step 4: Browse Your Files

Once authenticated, you can:
- Browse files from **Workspace**, **Unity Catalog Volumes**, and **DBFS**
- Import research documents for synthesis
- Access all Databricks features within CoHive

## Security Features

### ✅ What's Secure:

- **OAuth 2.0 standard**: Industry-standard secure authentication
- **Credentials in Databricks**: All credentials managed by Databricks
- **Temporary tokens**: Access tokens expire automatically
- **Refresh tokens**: Seamless re-authentication without re-login
- **SessionStorage**: Tokens cleared when browser closes
- **No third-party storage**: CoHive never stores your credentials
- **Scoped access**: Only requested permissions are granted

### 🔒 How Tokens Work:

- **Access Token**: Short-lived (~1 hour), used for API calls
- **Refresh Token**: Long-lived, used to get new access tokens
- **Auto-refresh**: Tokens refresh automatically before expiry
- **Session-only**: All tokens cleared when you close the browser

### ⚠️ Important Security Notes:

- Use only on trusted devices
- Close your browser when done on shared computers
- Access tokens are stored in sessionStorage (not localStorage)
- Tokens expire when browser session ends
- Re-authentication required after browser close

## Troubleshooting

### "OAuth configuration missing" error
- Verify `VITE_DATABRICKS_CLIENT_ID` is set in your environment
- Check that the OAuth app is registered in Databricks
- Restart your development server after adding environment variables

### "Invalid redirect URI" error
- Ensure `VITE_DATABRICKS_REDIRECT_URI` matches the redirect URL in your Databricks OAuth app
- Check for trailing slashes (should not have one)
- Verify protocol matches (http vs https)

### "Authorization failed" error
- Check that your Databricks account has necessary permissions
- Verify the OAuth app has correct scopes (`all-apis`, `offline_access`)
- Try logging out and logging in again

### "Token expired" error
- This should auto-refresh automatically
- If it persists, log out and log back in
- Check browser console for detailed error messages

### How to logout
- Click the logout button in the Databricks file browser
- Or manually clear sessionStorage: Developer Tools → Application → Session Storage → Clear

## API Endpoints Used

CoHive uses these Databricks REST API endpoints:

### OAuth Endpoints:
- `/oidc/v1/authorize` - Initiate OAuth flow
- `/oidc/v1/token` - Exchange code for token / Refresh token

### Data Access Endpoints:
- **Workspace API**: `/api/2.0/workspace/list`, `/api/2.0/workspace/export`
- **Files API**: `/api/2.0/fs/directories`, `/api/2.0/fs/files`
- **DBFS API**: `/api/2.0/dbfs/list`, `/api/2.0/dbfs/read`

## Required OAuth Scopes

Your Databricks OAuth app needs these scopes:
- `all-apis` - Access to all Databricks REST APIs
- `offline_access` - Ability to refresh tokens

## For Administrators

### Setting Up OAuth App

1. **Create OAuth App** in Databricks workspace settings
2. **Configure redirect URLs**:
   - Production: `https://your-cohive-domain.com/oauth/callback`
   - Development: `http://localhost:3000/oauth/callback`
3. **Set scopes**: `all-apis`, `offline_access`
4. **Share Client ID** with CoHive users/developers
5. **Document workspace URL** for users

### User Permissions

Users need these Databricks permissions:
- Read access to Workspace files
- Read access to Unity Catalog Volumes (if using)
- Read access to DBFS (if using)

### Monitoring

- Monitor OAuth app usage in Databricks admin console
- Review authorized users and tokens
- Revoke tokens if needed for security

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   CoHive    │────1───→│   Databricks     │────2───→│ User Signs In   │
│   (Client)  │         │  OAuth Server    │         │ & Authorizes    │
└─────────────┘         └──────────────────┘         └─────────────────┘
       ↑                          │                            │
       │                          3. Auth Code                 │
       └──────────────────────────┘                           │
       │                                                       │
       4. Exchange Code for Token                             │
       ↓                                                       │
┌─────────────┐                                               │
│ Session     │                                               │
│ Storage     │←──────────────5. Store Tokens─────────────────┘
└─────────────┘
       │
       6. API Calls with Access Token
       ↓
┌──────────────────────┐
│ Databricks REST API  │
│ (Workspace/DBFS/etc) │
└──────────────────────┘
```

---

**Current Status**: ✅ OAuth 2.0 authentication with Databricks  
**Credential Storage**: Databricks only (via OAuth tokens)  
**Session Management**: Auto-refresh with refresh tokens
