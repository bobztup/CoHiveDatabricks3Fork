import { useState, useEffect } from 'react';
import { Download, Trash2, ChevronDown, RefreshCw, Filter, X } from 'lucide-react';
import { listKnowledgeBaseFiles, deleteKnowledgeBaseFile, downloadKnowledgeBaseFile, downloadFile, KnowledgeBaseFile } from '../utils/databricksAPI';
import { getValidSession } from '../utils/databricksAuth';
import { AlertCircle } from 'lucide-react';

interface ReviewViewProps {
  projectFiles: any[];
  onDeleteFiles: (fileNames: string[]) => void;
}

type SortOption = 'date' | 'brand' | 'projectType' | 'fileType';

export function ReviewView({ projectFiles, onDeleteFiles }: ReviewViewProps) {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Filter states
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterProjectType, setFilterProjectType] = useState<string>('');
  const [filterFileType, setFilterFileType] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // Available filter options (populated from actual data)
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProjectTypes, setAvailableProjectTypes] = useState<string[]>([]);
  const [availableFileTypes, setAvailableFileTypes] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Get current user email on mount and check authentication
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const session = await getValidSession();
        if (session) {
          // Extract email from token or use workspace host as identifier
          setCurrentUserEmail(session.workspaceHost);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };
    loadUserEmail();
  }, []);

  // Fetch files from Databricks
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      // If not showing all users, filter by current user
      if (!showAllUsers) {
        params.uploadedBy = currentUserEmail;
      }
      
      // Apply filters
      if (filterBrand) params.brand = filterBrand;
      if (filterProjectType) params.projectType = filterProjectType;
      if (filterFileType) params.fileType = filterFileType;
      if (filterUser && showAllUsers) params.uploadedBy = filterUser;
      if (filterDateRange.start) params.startDate = filterDateRange.start;
      if (filterDateRange.end) params.endDate = filterDateRange.end;
      
      // Set sort options
      if (sortBy === 'date') {
        params.sortBy = 'upload_date';
        params.sortOrder = 'DESC';
      } else {
        params.sortBy = 'file_name';
        params.sortOrder = 'ASC';
      }
      
      const fetchedFiles = await listKnowledgeBaseFiles(params);
      setFiles(fetchedFiles);
      
      // Extract unique values for filter dropdowns
      const brands = [...new Set(fetchedFiles.map(f => f.brand).filter(Boolean))];
      const projectTypes = [...new Set(fetchedFiles.map(f => f.projectType).filter(Boolean))];
      const fileTypes = [...new Set(fetchedFiles.map(f => f.fileType).filter(Boolean))];
      const users = [...new Set(fetchedFiles.map(f => f.uploadedBy).filter(Boolean))];
      
      setAvailableBrands(brands as string[]);
      setAvailableProjectTypes(projectTypes as string[]);
      setAvailableFileTypes(fileTypes as string[]);
      setAvailableUsers(users as string[]);
      
    } catch (error) {
      console.error('Error fetching files:', error);
      alert('Failed to load files from Databricks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch files on mount and when filters/sort change
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchFiles();
    }
  }, [showAllUsers, sortBy, currentUserEmail, authChecked, isAuthenticated]);

  // Apply filters
  const handleApplyFilters = () => {
    fetchFiles();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterBrand('');
    setFilterProjectType('');
    setFilterFileType('');
    setFilterUser('');
    setFilterDateRange({ start: '', end: '' });
    fetchFiles();
  };

  // Sort files based on selected option
  const getSortedFiles = () => {
    const filesCopy = [...files];
    
    switch (sortBy) {
      case 'date':
        return filesCopy.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      case 'brand':
        return filesCopy.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
      case 'projectType':
        return filesCopy.sort((a, b) => (a.projectType || '').localeCompare(b.projectType || ''));
      case 'fileType':
        return filesCopy.sort((a, b) => a.fileType.localeCompare(b.fileType));
      default:
        return filesCopy;
    }
  };

  const sortedFiles = getSortedFiles();

  // Toggle individual file selection
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(f => f.fileId)));
    }
  };

  // Download selected files
  const handleDownload = async () => {
    const filesToDownload = sortedFiles.filter(f => selectedFiles.has(f.fileId));
    
    if (filesToDownload.length === 0) {
      alert('No files selected for download');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    
    for (const file of filesToDownload) {
      try {
        const result = await downloadKnowledgeBaseFile(file.fileId, file.fileName);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to download ${file.fileName}:`, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error('Error downloading file:', error);
      }
    }
    
    if (errorCount > 0) {
      alert(`Downloaded ${successCount} file(s). ${errorCount} file(s) failed to download.`);
    } else {
      alert(`✅ Successfully downloaded ${successCount} file(s) to your computer!`);
    }
  };

  // Delete selected files
  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This cannot be undone.`)) {
      return;
    }
    
    const filesToDelete = sortedFiles.filter(f => selectedFiles.has(f.fileId));
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of filesToDelete) {
      try {
        const result = await deleteKnowledgeBaseFile(
          file.fileId,
          currentUserEmail,
          'marketing-manager' // TODO: Get actual user role
        );
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error('Failed to delete:', file.fileName, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error('Error deleting file:', error);
      }
    }
    
    if (successCount > 0) {
      alert(`Successfully deleted ${successCount} file(s)`);
      setSelectedFiles(new Set());
      fetchFiles(); // Refresh the list
    }
    
    if (errorCount > 0) {
      alert(`Failed to delete ${errorCount} file(s). Check console for details.`);
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'date': return 'Date';
      case 'brand': return 'Brand';
      case 'projectType': return 'Project Type';
      case 'fileType': return 'File Type';
      default: return 'Sort';
    }
  };

  return (
    <div className="space-y-4">
      {/* Authentication Warning */}
      {authChecked && !isAuthenticated && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-gray-900 font-medium mb-1">Databricks Authentication Required</h4>
              <p className="text-gray-700 text-sm mb-2">
                You need to sign in to Databricks to view and manage your files. This feature requires authentication to access your organization's Knowledge Base.
              </p>
              <p className="text-gray-600 text-sm">
                Please complete the Databricks OAuth flow to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Only show the rest of the UI if authenticated */}
      {authChecked && isAuthenticated && (
        <>
          {/* Header with Show All Users Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 text-xl">
              {showAllUsers ? 'All Files' : 'My Files'} ({sortedFiles.length})
            </h3>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showAllUsers}
                  onChange={(e) => {
                    setShowAllUsers(e.target.checked);
                    if (!e.target.checked) {
                      setFilterUser(''); // Clear user filter when unchecking
                    }
                  }}
                  className="w-4 h-4"
                />
                Show All Users' Files
              </label>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-gray-900">Filters</span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>

            {showFilters && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Brand Filter */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Brand</label>
                    <select
                      value={filterBrand}
                      onChange={(e) => setFilterBrand(e.target.value)}
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Brands</option>
                      {availableBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project Type Filter */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Project Type</label>
                    <select
                      value={filterProjectType}
                      onChange={(e) => setFilterProjectType(e.target.value)}
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      {availableProjectTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* File Type Filter */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">File Type</label>
                    <select
                      value={filterFileType}
                      onChange={(e) => setFilterFileType(e.target.value)}
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All File Types</option>
                      {availableFileTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* User Filter (only shown when Show All Users is checked) */}
                  {showAllUsers && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">User</label>
                      <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">All Users</option>
                        {availableUsers.map(user => (
                          <option key={user} value={user}>{user}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filterDateRange.start}
                      onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filterDateRange.end}
                      onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Filter Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons and Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={fetchFiles}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 flex items-center gap-2 text-sm disabled:opacity-50"
                title="Refresh files"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Action Buttons - Only show when files are selected */}
              {selectedFiles.size > 0 && (
                <>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
                    title="Download selected files"
                  >
                    <Download className="w-4 h-4" />
                    Download ({selectedFiles.size})
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm"
                    title="Delete selected files"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedFiles.size})
                  </button>
                </>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="px-3 py-1.5 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 flex items-center gap-2 text-sm"
              >
                Sort by: {getSortLabel()}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showSortMenu && (
                <>
                  {/* Backdrop to close menu when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSortMenu(false)}
                  />
                  
                  <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50 min-w-[180px]">
                    <button
                      onClick={() => {
                        setSortBy('date');
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        sortBy === 'date' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      Date
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('brand');
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        sortBy === 'brand' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      Brand
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('projectType');
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        sortBy === 'projectType' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      Project Type
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('fileType');
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        sortBy === 'fileType' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      File Type
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Files Table */}
          {loading ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading files...
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
              No files found. {!showAllUsers && "Try enabling 'Show All Users' Files' or adjusting your filters."}
            </div>
          ) : (
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 flex items-center gap-4 text-sm text-gray-900">
                <div className="w-8 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                    title="Select all"
                  />
                </div>
                <div className="flex-1 min-w-0">File Name</div>
                <div className="w-28">Brand</div>
                <div className="w-32">Project Type</div>
                <div className="w-24">File Type</div>
                {showAllUsers && <div className="w-32">User</div>}
                <div className="w-28">Upload Date</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {sortedFiles.map((file) => {
                  const isCurrentUser = file.uploadedBy === currentUserEmail;
                  return (
                    <div
                      key={file.fileId}
                      className={`px-4 py-2 flex items-center gap-4 text-sm hover:bg-gray-50 ${
                        selectedFiles.has(file.fileId) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.fileId)}
                          onChange={() => toggleFileSelection(file.fileId)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-gray-900 truncate" title={file.fileName}>
                        {file.fileName}
                        {file.iterationType && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({file.iterationType})
                          </span>
                        )}
                      </div>
                      <div className="w-28 text-gray-700 truncate" title={file.brand || 'N/A'}>
                        {file.brand || 'N/A'}
                      </div>
                      <div className="w-32 text-gray-700 truncate" title={file.projectType || 'N/A'}>
                        {file.projectType || 'N/A'}
                      </div>
                      <div className="w-24 text-gray-700 truncate" title={file.fileType}>
                        {file.fileType}
                      </div>
                      {showAllUsers && (
                        <div className="w-32 text-gray-700 truncate" title={file.uploadedBy}>
                          {isCurrentUser ? (
                            <span className="text-blue-600">You</span>
                          ) : (
                            file.uploadedBy
                          )}
                        </div>
                      )}
                      <div className="w-28 text-gray-600">
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selection Info */}
          {selectedFiles.size > 0 && (
            <div className="text-sm text-gray-600">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </>
      )}
    </div>
  );
}