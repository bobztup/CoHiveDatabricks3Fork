import { useState, useEffect } from 'react';
import { AlertCircle, Database, CheckCircle } from 'lucide-react';
import { getValidSession, initiateLogin, isAuthenticated } from '../utils/databricksAuth';

interface DatabricksAuthPromptProps {
  onAuthChange?: (authenticated: boolean) => void;
}

export function DatabricksAuthPrompt({ onAuthChange }: DatabricksAuthPromptProps) {
  const [isAuth, setIsAuth] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [workspaceHost, setWorkspaceHost] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsChecking(true);
    try {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      if (onAuthChange) {
        onAuthChange(authenticated);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuth(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignIn = () => {
    if (!workspaceHost.trim()) {
      alert('Please enter your Databricks workspace host (e.g., yourcompany.cloud.databricks.com)');
      return;
    }
    
    try {
      initiateLogin(workspaceHost.trim());
    } catch (error) {
      console.error('Error initiating login:', error);
      alert('Failed to initiate login. Please check your workspace host and try again.');
    }
  };

  if (isChecking) {
    return (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-gray-700">Checking Databricks authentication...</span>
        </div>
      </div>
    );
  }

  if (isAuth) {
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <span className="text-gray-900 font-medium">Connected to Databricks</span>
            <p className="text-gray-600 text-sm mt-1">
              All workflow steps can now save data to your organization's Knowledge Base
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-gray-900 font-medium mb-1">Databricks Authentication Required</h4>
          <p className="text-gray-700 text-sm mb-3">
            CoHive integrates with Databricks to save your work, access your organization's Knowledge Base, 
            and power AI-driven insights across all workflow steps.
          </p>
          
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Sign In to Databricks
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">
                Databricks Workspace Host
              </label>
              <input
                type="text"
                value={workspaceHost}
                onChange={(e) => setWorkspaceHost(e.target.value)}
                placeholder="yourcompany.cloud.databricks.com"
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSignIn();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSignIn}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Connect
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You'll be redirected to Databricks to complete authentication
              </p>
            </div>
          )}
          
          <div className="mt-3 text-xs text-gray-600">
            <p className="mb-1">✓ Secure OAuth 2.0 authentication</p>
            <p className="mb-1">✓ Your credentials never leave Databricks</p>
            <p>✓ Access your organization's shared Knowledge Base</p>
          </div>
        </div>
      </div>
    </div>
  );
}
