import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { 
  FolderIcon, 
  ChevronRight, 
  Upload, 
  RefreshCw,
  Database,
  HardDrive,
  FolderOpen,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  listDatabricksFiles, 
  writeDatabricksFile,
  checkDatabricksHealth,
  hasCredentials,
  DATABRICKS_PATHS,
  type DatabricksFile 
} from '../utils/databricksClient';
import { getWorkspaceHost } from '../utils/databricksAuth';
import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
import { colors, spacing } from '../styles/cohive-theme';

interface DatabricksFileSaverProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  fileContent: string;
  onSaveSuccess?: (path: string) => void;
}

export function DatabricksFileSaver({ open, onClose, fileName, fileContent, onSaveSuccess }: DatabricksFileSaverProps) {
  const [currentPath, setCurrentPath] = useState(DATABRICKS_PATHS.workspace);
  const [files, setFiles] = useState<DatabricksFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [workspaceHost, setWorkspaceHost] = useState<string | null>(null);
  const [saveFileName, setSaveFileName] = useState(fileName);
  const [overwrite, setOverwrite] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check API health on mount
  useEffect(() => {
    if (open) {
      const host = getWorkspaceHost();
      setWorkspaceHost(host);
      setSaveFileName(fileName);
      setSaveSuccess(false);
      
      // Check if user is authenticated
      if (!hasCredentials()) {
        setShowLoginDialog(true);
        setIsHealthy(false);
        setError('Please sign in to your Databricks workspace to continue.');
      } else {
        checkHealth();
      }
    }
  }, [open, fileName]);

  // Load files when path changes
  useEffect(() => {
    if (open && isHealthy) {
      loadFiles();
    }
  }, [currentPath, open, isHealthy]);

  const checkHealth = async () => {
    try {
      const healthy = await checkDatabricksHealth();
      setIsHealthy(healthy);
      if (!healthy) {
        setError('Unable to connect to Databricks API. Please check your connection.');
      }
    } catch (err) {
      console.error('Health check error:', err);
      setIsHealthy(false);
      setError('Unable to connect to Databricks. Please check your authentication.');
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listDatabricksFiles(currentPath);
      // Only show directories
      const directories = response.files.filter(f => f.name.endsWith('/') || !f.name.includes('.'));
      setFiles(directories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directories');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setError(null);
  };

  const handleSave = async () => {
    if (!saveFileName.trim()) {
      setError('Please enter a filename');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const fullPath = `${currentPath}/${saveFileName}`;
      const result = await writeDatabricksFile(fullPath, fileContent, overwrite);
      
      if (result.success) {
        setSaveSuccess(true);
        onSaveSuccess?.(result.path);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const getPathParts = () => {
    return currentPath.split('/').filter(Boolean);
  };

  const goUpDirectory = () => {
    const parts = getPathParts();
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath('/' + parts.join('/'));
    }
  };

  return (
    <>
      <Dialog open={open && !showLoginDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" style={{ backgroundColor: colors.background.primary }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3" style={{ color: colors.text.primary }}>
              <Upload className="h-6 w-6" style={{ color: colors.hex.purple.light }} />
              Save to Databricks
            </DialogTitle>
            <DialogDescription style={{ color: colors.text.secondary }}>
              {workspaceHost && (
                <span className="text-xs">Connected to: {workspaceHost}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Success Message */}
          {saveSuccess && (
            <div className="p-4 rounded-lg flex items-center gap-3" style={{ backgroundColor: colors.hex.Findings + '20', borderColor: colors.hex.Findings, borderWidth: '1px' }}>
              <CheckCircle className="h-5 w-5" style={{ color: colors.hex.Findings }} />
              <span style={{ color: colors.hex.Findings }}>File saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && !saveSuccess && (
            <div className="p-4 rounded-lg flex items-center gap-3 bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Path Breadcrumb */}
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: colors.background.secondary }}>
            <Database className="h-4 w-4" style={{ color: colors.text.tertiary }} />
            <div className="flex items-center gap-1 flex-wrap text-sm">
              {getPathParts().map((part, idx, arr) => (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => {
                      const newPath = '/' + arr.slice(0, idx + 1).join('/');
                      handleNavigate(newPath);
                    }}
                    className="hover:underline"
                    style={{ color: colors.text.secondary }}
                  >
                    {part}
                  </button>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3" style={{ color: colors.text.tertiary }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNavigate(DATABRICKS_PATHS.workspace)}
              disabled={loading}
            >
              <HardDrive className="h-3 w-3 mr-1" />
              Workspace
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNavigate(DATABRICKS_PATHS.volumes)}
              disabled={loading}
            >
              <FolderOpen className="h-3 w-3 mr-1" />
              Volumes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleNavigate(DATABRICKS_PATHS.dbfs)}
              disabled={loading}
            >
              <Database className="h-3 w-3 mr-1" />
              DBFS
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={goUpDirectory}
              disabled={loading || getPathParts().length <= 1}
            >
              ↑ Up
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={loadFiles}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Directory List */}
          <ScrollArea className="flex-1 border rounded-lg" style={{ borderColor: colors.border.light }}>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.hex.purple.light }} />
                  <span className="ml-2" style={{ color: colors.text.secondary }}>Loading directories...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8" style={{ color: colors.text.tertiary }}>
                  <FolderIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No subdirectories found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleNavigate(file.path)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-opacity-50 transition-colors text-left"
                      style={{ 
                        backgroundColor: 'transparent',
                        ':hover': { backgroundColor: colors.background.secondary }
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.background.secondary}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FolderIcon className="h-5 w-5 flex-shrink-0" style={{ color: colors.hex.purple.light }} />
                      <span style={{ color: colors.text.primary }}>{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* File Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: colors.text.primary }}>
              Filename
            </label>
            <Input
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder="Enter filename..."
              disabled={saving}
            />
          </div>

          {/* Overwrite Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="overwrite"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              disabled={saving}
              className="w-4 h-4"
            />
            <label htmlFor="overwrite" className="text-sm" style={{ color: colors.text.secondary }}>
              Overwrite if file exists
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border.light }}>
            <div className="text-xs" style={{ color: colors.text.tertiary }}>
              Save location: {currentPath}/{saveFileName}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !saveFileName.trim() || !isHealthy}
                className="gap-2"
                style={{ backgroundColor: colors.hex.purple.light }}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Save to Databricks
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <DatabricksOAuthLogin
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          checkHealth();
        }}
      />
    </>
  );
}
