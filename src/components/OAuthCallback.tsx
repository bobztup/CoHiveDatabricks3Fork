import React, { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../utils/databricksAuth';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { colors } from '../styles/cohive-theme';

interface OAuthCallbackProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function OAuthCallback({ onSuccess, onError }: OAuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setStatus('loading');
      setMessage('Exchanging authorization code...');

      const session = await handleOAuthCallback().catch(err => {
        console.error('OAuth callback error:', err);
        throw new Error(err?.message || 'Failed to complete authentication');
      });

      if (session) {
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        // Wait a moment before redirecting
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Full OAuth error:', error);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setMessage(errorMessage);
      
      // Wait before calling onError to show the error message
      setTimeout(() => {
        onError(errorMessage);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
      <div className="max-w-md w-full p-8 rounded-lg border" style={{ 
        backgroundColor: colors.background.secondary,
        borderColor: colors.border.light 
      }}>
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 animate-spin" style={{ color: colors.hex.purple.light }} />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-16 w-16" style={{ color: colors.hex.Findings }} />
          )}
          {status === 'error' && (
            <AlertCircle className="h-16 w-16" style={{ color: '#ef4444' }} />
          )}

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold" style={{ color: colors.text.primary }}>
              {status === 'loading' && 'Authenticating...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              {message}
            </p>
          </div>

          {/* Additional info for error state */}
          {status === 'error' && (
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: colors.hex.purple.light }}
            >
              Return to CoHive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}