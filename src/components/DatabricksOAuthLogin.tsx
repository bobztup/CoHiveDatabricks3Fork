import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Database, LogIn, AlertCircle, Info } from 'lucide-react';
import { colors } from '../styles/cohive-theme';
import { initiateLogin } from '../utils/databricksAuth';

interface DatabricksOAuthLoginProps {
  open: boolean;
  onClose: () => void;
  currentStep?: string;
}

export function DatabricksOAuthLogin({ open, onClose, currentStep }: DatabricksOAuthLoginProps) {
  const [workspaceHost, setWorkspaceHost] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setError(null);

    // Validate workspace host
    if (!workspaceHost.trim()) {
      setError('Please enter your Databricks workspace URL');
      return;
    }

    // Clean up the host (remove protocol if included)
    let cleanHost = workspaceHost.trim();
    cleanHost = cleanHost.replace(/^https?:\/\//, '');
    cleanHost = cleanHost.replace(/\/$/, '');

    // Basic validation
    if (!cleanHost.includes('.')) {
      setError('Please enter a valid Databricks workspace URL');
      return;
    }

    try {
      // Initiate OAuth flow with current step
      initiateLogin(cleanHost, currentStep);
    } catch (err) {
      setError('Failed to initiate login. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ backgroundColor: colors.background.primary }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3" style={{ color: colors.text.primary }}>
            <Database className="h-6 w-6" style={{ color: colors.hex.purple.light }} />
            Connect to Databricks
          </DialogTitle>
          <DialogDescription style={{ color: colors.text.secondary }}>
            Sign in with your Databricks workspace to access files and run research synthesis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workspace Host Input */}
          <div className="space-y-2">
            <Label htmlFor="workspace-host" className="flex items-center gap-2">
              <Database className="h-4 w-4" style={{ color: colors.text.secondary }} />
              Databricks Workspace URL
            </Label>
            <Input
              id="workspace-host"
              placeholder="e.g., adb-1234567890123456.7.azuredatabricks.net"
              value={workspaceHost}
              onChange={(e) => setWorkspaceHost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <p className="text-xs" style={{ color: colors.text.tertiary }}>
              Enter your Databricks workspace URL (without https://)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: colors.background.secondary }}>
            <div className="flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0" style={{ color: colors.hex.purple.light }} />
              <div className="space-y-2">
                <h4 className="font-medium text-sm" style={{ color: colors.text.primary }}>
                  How OAuth Login Works:
                </h4>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: colors.text.secondary }}>
                  <li>You'll be redirected to your Databricks workspace</li>
                  <li>Sign in with your Databricks account</li>
                  <li>Authorize CoHive to access your files</li>
                  <li>You'll be redirected back to CoHive</li>
                  <li>Your session is managed securely by Databricks</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="p-3 rounded-lg border" style={{ 
            backgroundColor: colors.background.tertiary,
            borderColor: colors.border.light 
          }}>
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              🔒 <strong>Secure Authentication:</strong> Your credentials are stored and managed by Databricks. 
              CoHive only receives a temporary access token that expires automatically.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.border.light }}>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={handleLogin}
            disabled={!workspaceHost.trim()}
            className="gap-2"
            style={{ backgroundColor: colors.hex.purple.light }}
          >
            <LogIn className="h-4 w-4" />
            Sign in with Databricks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}