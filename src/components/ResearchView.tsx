import { useState } from 'react';
import { DatabricksFileBrowser } from './DatabricksFileBrowser';
import { Database, X } from 'lucide-react';

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string; // Optional: actual file content from Databricks
  source?: string; // Optional: source path in Databricks
}

interface EditSuggestion {
  id: string;
  researchFileId: string;
  fileName: string;
  suggestedBy: string;
  suggestion: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'implemented';
}

interface ResearchViewProps {
  role: 'researcher' | 'non-researcher';
  brand: string;
  projectType: string;
  researchFiles: ResearchFile[];
  editSuggestions: EditSuggestion[];
  onAddSuggestion: (fileId: string, suggestion: string) => void;
  onUpdateSuggestionStatus: (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => void;
  onToggleApproval: (fileId: string) => void;
  canApproveResearch: boolean;
  onCreateResearchFile: (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => void;
}

export function ResearchView({ 
  role, 
  brand, 
  projectType, 
  researchFiles,
  editSuggestions,
  onAddSuggestion,
  onUpdateSuggestionStatus,
  onToggleApproval,
  canApproveResearch,
  onCreateResearchFile
}: ResearchViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [showDatabricksBrowser, setShowDatabricksBrowser] = useState(false);

  // Filter files based on brand and project type
  const filteredFiles = researchFiles.filter(
    file => file.brand.toLowerCase() === brand.toLowerCase() && 
            file.projectType.toLowerCase() === projectType.toLowerCase()
  );

  // FIX (Problem 3): For non-researcher, only show approved files
  // This prevents non-researchers from seeing pending files
  const displayFiles = role === 'researcher' 
    ? filteredFiles 
    : filteredFiles.filter(file => file.isApproved === true);

  const handleAddSuggestion = (fileId: string) => {
    if (newSuggestion.trim()) {
      onAddSuggestion(fileId, newSuggestion);
      setNewSuggestion('');
      setShowSuggestionForm(false);
    }
  };

  const handleDatabricksFilesSelected = (files: Array<{ name: string; content: string; source: string }>, autoApprove: boolean) => {
    // Create research files from imported Databricks files
    files.forEach(file => {
      const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
        brand,
        projectType,
        fileName: file.name,
        isApproved: autoApprove, // Use the autoApprove setting from the browser
        fileType: 'text/plain', // Could be enhanced to detect file type
        content: file.content, // Store the actual file content
        source: file.source // Store the source path for reference
      };
      onCreateResearchFile(newFile);
    });
  };

  // FIX (Problems 4 & 5): Non-Researcher View with Modal Preview
  if (role === 'non-researcher') {
    return (
      <>
        <div className="space-y-2">
          {displayFiles.length === 0 ? (
            <div className="bg-gray-100 border-2 border-gray-300 p-4 text-center">
              <p className="text-gray-600">No approved research files available for this brand and project type.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayFiles.map((file) => (
                <div key={file.id} className="bg-white border-2 border-gray-300 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-gray-900">{file.fileName}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                            {file.fileType}
                          </span>
                        </span>
                        <span>Uploaded: {new Date(file.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <button 
                        className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                        onClick={() => {
                          // Toggle file preview modal
                          setSelectedFile(selectedFile === file.id ? null : file.id);
                          setShowSuggestionForm(false);
                        }}
                      >
                        Read
                      </button>
                      <button className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm">
                        Download
                      </button>
                      <button 
                        className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                        onClick={() => {
                          setSelectedFile(file.id);
                          setShowSuggestionForm(true);
                        }}
                      >
                        Recommend
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FIX: File Preview Modal (Problems 4 & 5) */}
        {selectedFile && !showSuggestionForm && (() => {
          const file = displayFiles.find(f => f.id === selectedFile);
          if (!file) return null;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedFile(null)}>
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="border-b-2 border-gray-300 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-900 leading-tight font-medium">
                      {file.fileName}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {file.fileType} • Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close preview"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  <h4 className="text-gray-900 font-medium mb-3 text-sm">File Content</h4>
                  <div className="bg-gray-50 border-2 border-gray-300 rounded p-4 text-gray-700 text-sm">
                    {file.content ? (
                      // Show actual file content if available
                      <div className="space-y-3">
                        {file.source && (
                          <p className="text-xs text-gray-500 border-b pb-2">
                            <strong>Source:</strong> {file.source}
                          </p>
                        )}
                        <pre className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                          {file.content}
                        </pre>
                      </div>
                    ) : (
                      // Show mock preview if no content
                      <div className="leading-relaxed">
                        <p className="mb-4">
                          <strong>Document Preview:</strong> {file.fileName}
                        </p>
                        <p className="text-gray-600 mb-4">
                          This is a mock preview of the research document. In a production environment, this would display the actual content of the PDF, spreadsheet, or document file.
                        </p>
                        <p className="mb-2"><strong>Executive Summary:</strong></p>
                        <p className="text-gray-600 mb-4">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                        <p className="mb-2"><strong>Key Findings:</strong></p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>Finding 1: Market share has increased by 15%</li>
                          <li>Finding 2: Customer satisfaction ratings are at 4.5/5</li>
                          <li>Finding 3: Brand awareness has grown in target demographics</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="border-t-2 border-gray-300 p-4 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                  >
                    Close
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    onClick={() => {
                      setShowSuggestionForm(true);
                    }}
                  >
                    Recommend Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Suggestion Form Modal */}
        {selectedFile && showSuggestionForm && (() => {
          const file = displayFiles.find(f => f.id === selectedFile);
          if (!file) return null;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowSuggestionForm(false); setNewSuggestion(''); }}>
              <div className="bg-white rounded-lg max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="border-b-2 border-gray-300 p-4 flex items-center justify-between">
                  <h3 className="text-gray-900 leading-tight font-medium">
                    Suggest an Edit: {file.fileName}
                  </h3>
                  <button
                    onClick={() => {
                      setShowSuggestionForm(false);
                      setNewSuggestion('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-4">
                  <textarea
                    className="w-full h-32 border-2 border-gray-300 bg-white rounded p-3 text-gray-700 resize-none focus:outline-none focus:border-blue-500"
                    placeholder="Describe the edit or improvement you'd like to suggest..."
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      onClick={() => {
                        handleAddSuggestion(file.id);
                        setShowSuggestionForm(false);
                      }}
                    >
                      Submit Suggestion
                    </button>
                    <button
                      className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                      onClick={() => {
                        setShowSuggestionForm(false);
                        setNewSuggestion('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    );
  }

  // Researcher View: Complex view with file management and suggestions
  const fileSuggestions = (fileId: string) => 
    editSuggestions.filter(s => s.researchFileId === fileId);

  return (
    <div className="space-y-3">
      <div className="bg-purple-50 border-2 border-purple-200 p-2">
        <h3 className="text-purple-900 leading-tight">Research Management Dashboard</h3>
        <p className="text-purple-700 text-sm">
          Manage research files for {brand} - {projectType}
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white border-2 border-gray-300 p-3">
        <h4 className="text-gray-900 mb-3">
          Upload New Research File
        </h4>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xlsx,.xls,.csv"
          className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
                brand,
                projectType,
                fileName: file.name,
                isApproved: false,
                fileType: file.type,
              };
              onCreateResearchFile(newFile);
              e.target.value = ''; // Reset input
            }
          }}
        />
        
        {/* Databricks File Browser Button */}
        <div className="mt-3 pt-3 border-t-2 border-gray-200">
          <button
            onClick={() => setShowDatabricksBrowser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Database className="w-4 h-4" />
            Browse Databricks Files
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-2">
        {displayFiles.length === 0 ? (
          <div className="bg-gray-100 border-2 border-gray-300 p-4 text-center">
            <p className="text-gray-600">No research files uploaded yet. Upload your first file above.</p>
          </div>
        ) : (
          displayFiles.map((file) => {
            const suggestions = fileSuggestions(file.id);
            return (
              <div key={file.id} className="bg-white border-2 border-gray-300 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-gray-900">{file.fileName}</h4>
                      {file.isApproved ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {file.fileType}
                        </span>
                      </span>
                      <span>Uploaded: {new Date(file.uploadDate).toLocaleDateString()}</span>
                      {suggestions.length > 0 && (
                        <span className="text-orange-600">
                          {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <button 
                      className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                      onClick={() => {
                        setSelectedFile(selectedFile === file.id ? null : file.id);
                        setShowSuggestionForm(false);
                      }}
                    >
                      Read
                    </button>
                    {canApproveResearch && (
                      <button 
                        className={`px-3 py-1.5 border-2 rounded text-sm ${
                          file.isApproved 
                            ? 'border-gray-400 bg-white text-gray-700 hover:bg-gray-50' 
                            : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                        }`}
                        onClick={() => onToggleApproval(file.id)}
                      >
                        {file.isApproved ? 'Unapprove' : 'Approve'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t-2 border-gray-200">
                    <h5 className="text-gray-900 mb-2 text-sm">Suggestions:</h5>
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="bg-gray-50 border-2 border-gray-300 p-2">
                          <p className="text-gray-700 text-sm">{suggestion.suggestion}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-600">
                              By {suggestion.suggestedBy} on {new Date(suggestion.timestamp).toLocaleDateString()}
                            </p>
                            <select
                              value={suggestion.status}
                              onChange={(e) => onUpdateSuggestionStatus(suggestion.id, e.target.value as any)}
                              className="text-xs border-2 border-gray-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="implemented">Implemented</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Databricks File Browser Modal */}
      {showDatabricksBrowser && (
        <DatabricksFileBrowser
          onClose={() => setShowDatabricksBrowser(false)}
          onFilesSelected={handleDatabricksFilesSelected}
        />
      )}

      {/* File Preview Modal (Researcher View) */}
      {selectedFile && !showSuggestionForm && (() => {
        const file = displayFiles.find(f => f.id === selectedFile);
        if (!file) return null;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedFile(null)}>
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="border-b-2 border-gray-300 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 leading-tight font-medium">
                    {file.fileName}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {file.fileType} • Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                    {file.isApproved ? (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                        Approved
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                        Pending
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close preview"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4">
                <h4 className="text-gray-900 font-medium mb-3 text-sm">File Content</h4>
                <div className="bg-gray-50 border-2 border-gray-300 rounded p-4 text-gray-700 text-sm">
                  {file.content ? (
                    // Show actual file content if available
                    <div className="space-y-3">
                      {file.source && (
                        <p className="text-xs text-gray-500 border-b pb-2">
                          <strong>Source:</strong> {file.source}
                        </p>
                      )}
                      <pre className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {file.content}
                      </pre>
                    </div>
                  ) : (
                    // Show mock preview if no content
                    <div className="leading-relaxed">
                      <p className="mb-4">
                        <strong>Document Preview:</strong> {file.fileName}
                      </p>
                      <p className="text-gray-600 mb-4">
                        This is a mock preview of the research document. In a production environment, this would display the actual content of the PDF, spreadsheet, or document file.
                      </p>
                      <p className="mb-2"><strong>Executive Summary:</strong></p>
                      <p className="text-gray-600 mb-4">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                      <p className="mb-2"><strong>Key Findings:</strong></p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>Finding 1: Market share has increased by 15%</li>
                        <li>Finding 2: Customer satisfaction ratings are at 4.5/5</li>
                        <li>Finding 3: Brand awareness has grown in target demographics</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t-2 border-gray-300 p-4 flex justify-between">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  {canApproveResearch && !file.isApproved && (
                    <button 
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      onClick={() => {
                        onToggleApproval(file.id);
                        setSelectedFile(null);
                      }}
                    >
                      Approve File
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}