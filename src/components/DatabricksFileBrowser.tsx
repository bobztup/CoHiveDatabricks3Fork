import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  FolderIcon, 
  FileIcon, 
  ChevronRight, 
  Download, 
  Search,
  RefreshCw,
  Database,
  HardDrive,
  FolderOpen,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  Settings,
  BookOpen
} from 'lucide-react';
import { 
  listDatabricksFiles, 
  readDatabricksFile, 
  checkDatabricksHealth,
  hasCredentials,
  DATABRICKS_PATHS,
  RESEARCH_FILE_TYPES,
  type DatabricksFile 
} from '../utils/databricksClient';
import { 
  listKnowledgeBaseFiles, 
  downloadKnowledgeBaseFile,
  type KnowledgeBaseFile 
} from '../utils/databricksAPI';
import { logout, getWorkspaceHost } from '../utils/databricksAuth';
import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
import { colors, spacing } from '../styles/cohive-theme';

interface DatabricksFileBrowserProps {
  open: boolean;
  onClose: () => void;
  onFilesSelected: (files: Array<{ name: string; content: string; source: string }>, autoApprove: boolean) => void;
}

export function DatabricksFileBrowser({ open, onClose, onFilesSelected }: DatabricksFileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(DATABRICKS_PATHS.workspace);
  const [files, setFiles] = useState<DatabricksFile[]>([]);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([]);
  const [viewMode, setViewMode] = useState<'filesystem' | 'knowledge-base'>('knowledge-base');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [importing, setImporting] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [workspaceHost, setWorkspaceHost] = useState<string | null>(null);

  // Check API health on mount
  useEffect(() => {
    if (open) {
      const host = getWorkspaceHost();
      setWorkspaceHost(host);
      
      // Check if user is authenticated
      if (!hasCredentials()) {
        setShowLoginDialog(true);
        setIsHealthy(false);
        setError('Please sign in to your Databricks workspace to continue.');
      } else {
        checkHealth();
      }
    }
  }, [open]);

  // Load files when view mode or path changes
  useEffect(() => {
    if (open && isHealthy) {
      if (viewMode === 'knowledge-base') {
        loadKnowledgeBaseFiles();
      } else {
        loadFilesystemFiles();
      }
    }
  }, [currentPath, viewMode, open, isHealthy]);

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

  const loadFilesystemFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listDatabricksFiles(currentPath, RESEARCH_FILE_TYPES);
      setFiles(response.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeBaseFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading Knowledge Base files...');
      const kbFiles = await listKnowledgeBaseFiles({
        // Load ALL files (both approved and pending)
        sortBy: 'upload_date',
        sortOrder: 'DESC',
      });
      console.log(`Loaded ${kbFiles.length} Knowledge Base files`);
      setKnowledgeBaseFiles(kbFiles);
    } catch (err) {
      console.error('Failed to load Knowledge Base files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Knowledge Base files');
      setKnowledgeBaseFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleImportSelected = async () => {
    if (selectedFiles.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const importedFiles = [];
      
      if (viewMode === 'knowledge-base') {
        // Import from Knowledge Base
        for (const fileId of selectedFiles) {
          try {
            const kbFile = knowledgeBaseFiles.find(f => f.fileId === fileId);
            if (kbFile) {
              const result = await downloadKnowledgeBaseFile(kbFile.fileId, kbFile.fileName);
              if (result.success) {
                importedFiles.push({
                  name: kbFile.fileName,
                  content: '', // Content is downloaded directly by downloadKnowledgeBaseFile
                  source: `Knowledge Base: ${kbFile.fileType} - ${kbFile.fileName}`
                });
              }
            }
          } catch (err) {
            console.error(`Failed to download Knowledge Base file:`, err);
          }
        }
      } else {
        // Import from filesystem
        for (const filePath of selectedFiles) {
          try {
            const fileData = await readDatabricksFile(filePath, 'text');
            importedFiles.push({
              name: fileData.name,
              content: fileData.content,
              source: `Databricks: ${filePath}`
            });
          } catch (err) {
            console.error(`Failed to read file ${filePath}:`, err);
          }
        }
      }

      if (importedFiles.length > 0) {
        onFilesSelected(importedFiles, autoApprove);
        setSelectedFiles(new Set());
        onClose();
      } else {
        setError('Failed to import any files. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import files');
    } finally {
      setImporting(false);
    }
  };

  const filteredFilesystemFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredKnowledgeBaseFiles = knowledgeBaseFiles.filter(file =>
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'workspace':
        return <FolderOpen className="h-4 w-4" />;
      case 'volume':
        return <Database className="h-4 w-4" />;
      case 'dbfs':
        return <HardDrive className="h-4 w-4" />;
      default:
        return <FolderIcon className="h-4 w-4" />;
    }
  };

  const handleLogout = () => {
    logout();
    setWorkspaceHost(null);
    setShowLoginDialog(true);
    setIsHealthy(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <DatabricksOAuthLogin
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          if (!hasCredentials()) {
            onClose(); // Close the file browser if user cancels login
          }
        }}
      />

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col" style={{ backgroundColor: colors.background.primary }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3" style={{ color: colors.text.primary }}>
              <Database className="h-6 w-6" style={{ color: colors.hex.purple.light }} />
              Import from Databricks
            </DialogTitle>
            <DialogDescription style={{ color: colors.text.secondary }}>
              {viewMode === 'knowledge-base' 
                ? 'Select files from the Knowledge Base (Wisdom, Research, Synthesis, Findings)'
                : 'Select research files from your Databricks workspace, volumes, or DBFS'
              }
            </DialogDescription>
          </DialogHeader>

          {/* View Mode Selector */}
          <div className="flex gap-2 mb-4 pb-4 border-b" style={{ borderColor: colors.border.light }}>
            <Button
              variant={viewMode === 'knowledge-base' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('knowledge-base');
                setSelectedFiles(new Set());
              }}
              className="gap-2"
              style={viewMode === 'knowledge-base' ? { backgroundColor: colors.hex.purple.light } : {}}
            >
              <BookOpen className="h-4 w-4" />
              Knowledge Base
            </Button>
            <Button
              variant={viewMode === 'filesystem' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('filesystem');
                setSelectedFiles(new Set());
              }}
              className="gap-2"
              style={viewMode === 'filesystem' ? { backgroundColor: colors.hex.purple.light } : {}}
            >
              <Database className="h-4 w-4" />
              File System
            </Button>
          </div>

          {/* Location Selector (only for filesystem mode) */}
          {viewMode === 'filesystem' && (
            <div className="flex gap-2 mb-4">
              <Button
                variant={currentPath.startsWith('/Workspace') ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPath(DATABRICKS_PATHS.workspace)}
                className="gap-2"
                style={currentPath.startsWith('/Workspace') ? { backgroundColor: colors.hex.purple.light } : {}}
              >
                <FolderOpen className="h-4 w-4" />
                Workspace
              </Button>
              <Button
                variant={currentPath.startsWith('/Volumes') ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPath(DATABRICKS_PATHS.volumes)}
                className="gap-2"
                style={currentPath.startsWith('/Volumes') ? { backgroundColor: colors.hex.purple.light } : {}}
              >
                <Database className="h-4 w-4" />
                Volumes
              </Button>
              <Button
                variant={currentPath.startsWith('dbfs:') ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPath(DATABRICKS_PATHS.dbfs)}
                className="gap-2"
                style={currentPath.startsWith('dbfs:') ? { backgroundColor: colors.hex.purple.light } : {}}
              >
                <HardDrive className="h-4 w-4" />
                DBFS
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadFilesystemFiles}
                disabled={loading}
                className="ml-auto gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}

          {viewMode === 'knowledge-base' && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                📚 Showing all files from Knowledge Base (approved and pending)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadKnowledgeBaseFiles}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}

          {/* Current Path & Search */}
          <div className="space-y-3">
            {viewMode === 'filesystem' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text.secondary }}>
                <FolderIcon className="h-4 w-4" />
                <span className="font-mono">{currentPath}</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colors.text.secondary }} />
              <Input
                placeholder={viewMode === 'knowledge-base' ? "Search by filename, brand, or category..." : "Search files..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#fee', color: '#c33' }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm">{error}</span>
              </div>
              {!hasCredentials() && (
                <Button
                  size="sm"
                  onClick={() => setShowLoginDialog(true)}
                  className="gap-2"
                  style={{ backgroundColor: colors.hex.purple.light }}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          )}

          {/* File List */}
          <ScrollArea className="flex-1 border rounded-lg" style={{ borderColor: colors.border.light }}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.hex.purple.light }} />
              </div>
            ) : viewMode === 'knowledge-base' ? (
              // Knowledge Base Files
              filteredKnowledgeBaseFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <BookOpen className="h-12 w-12" style={{ color: colors.text.tertiary }} />
                  <p className="text-sm" style={{ color: colors.text.secondary }}>
                    {searchTerm ? 'No files match your search' : 'No files found in Knowledge Base'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredKnowledgeBaseFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.fileId);
                    return (
                      <div
                        key={file.fileId}
                        onClick={() => toggleFileSelection(file.fileId)}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                        style={{
                          borderColor: isSelected ? colors.hex.purple.light : colors.border.light,
                          backgroundColor: isSelected ? colors.background.tertiary : colors.background.secondary
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFileSelection(file.fileId)}
                          className="h-4 w-4 rounded"
                          style={{ accentColor: colors.hex.purple.light }}
                        />
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon className="h-5 w-5 flex-shrink-0" style={{ color: colors.hex.purple.light }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: colors.text.primary }}>
                              {file.fileName}
                            </p>
                            <div className="flex items-center gap-2 text-xs" style={{ color: colors.text.secondary }}>
                              <span>{file.fileType}</span>
                              {file.brand && <span>• {file.brand}</span>}
                              {file.category && <span>• {file.category}</span>}
                              <span>• {formatDate(file.uploadDate)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="gap-1">
                            {file.fileType}
                          </Badge>
                          {!file.isApproved && (
                            <Badge 
                              variant="outline" 
                              className="gap-1 bg-yellow-50 text-yellow-800 border-yellow-300"
                            >
                              Pending Approval
                            </Badge>
                          )}
                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                            {formatFileSize(file.fileSizeBytes)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Filesystem Files
              filteredFilesystemFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <FileIcon className="h-12 w-12" style={{ color: colors.text.tertiary }} />
                  <p className="text-sm" style={{ color: colors.text.secondary }}>
                    {searchTerm ? 'No files match your search' : 'No files found in this location'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredFilesystemFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.path);
                    return (
                      <div
                        key={file.path}
                        onClick={() => toggleFileSelection(file.path)}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                        style={{
                          borderColor: isSelected ? colors.hex.purple.light : colors.border.light,
                          backgroundColor: isSelected ? colors.background.tertiary : colors.background.secondary
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFileSelection(file.path)}
                          className="h-4 w-4 rounded"
                          style={{ accentColor: colors.hex.purple.light }}
                        />
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileIcon className="h-5 w-5 flex-shrink-0" style={{ color: colors.hex.purple.light }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: colors.text.primary }}>
                              {file.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: colors.text.secondary }}>
                              {file.path}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="gap-1">
                            {getLocationIcon(file.type)}
                            {file.type}
                          </Badge>
                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border.light }}>
            <div className="flex items-center gap-4">
              <div className="text-sm" style={{ color: colors.text.secondary }}>
                {selectedFiles.size > 0 ? (
                  <span className="font-medium" style={{ color: colors.hex.purple.light }}>
                    {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>Select files to import</span>
                )}
              </div>
              
              {/* Auto-approve checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: colors.hex.purple.light }}
                />
                <span className="text-sm" style={{ color: colors.text.primary }}>
                  Auto-approve imported files
                </span>
              </label>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImportSelected}
                disabled={selectedFiles.size === 0 || importing}
                className="gap-2"
                style={{ backgroundColor: colors.hex.purple.light }}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}