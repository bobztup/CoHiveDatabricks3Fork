"""
Databricks File API
Provides endpoints for loading files from Databricks workspace, DBFS, and Unity Catalog volumes
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.files import DirectoryEntry
import os
import base64
from typing import List, Dict

app = Flask(__name__)
CORS(app)

# Initialize Databricks workspace client
# In Databricks Apps, credentials are automatically available
w = WorkspaceClient()


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "CoHive File API"})


@app.route('/api/files/list', methods=['GET'])
def list_files():
    """
    List files from a Databricks location
    Query params:
        - path: The path to list (workspace, dbfs, or volume)
        - file_types: Comma-separated file extensions to filter (e.g., "pdf,docx,txt")
    """
    try:
        path = request.args.get('path', '/Workspace/Shared')
        file_types = request.args.get('file_types', '').split(',') if request.args.get('file_types') else []
        
        files = []
        
        # Handle different path types
        if path.startswith('/Workspace'):
            # List workspace files
            files = list_workspace_files(path, file_types)
        elif path.startswith('/Volumes'):
            # List Unity Catalog volume files
            files = list_volume_files(path, file_types)
        elif path.startswith('dbfs:'):
            # List DBFS files
            files = list_dbfs_files(path, file_types)
        else:
            return jsonify({"error": "Invalid path. Must start with /Workspace, /Volumes, or dbfs:"}), 400
        
        return jsonify({
            "path": path,
            "files": files,
            "count": len(files)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/files/read', methods=['POST'])
def read_file():
    """
    Read a file from Databricks
    Body params:
        - path: Full path to the file
        - encoding: 'text' or 'base64' (default: 'text')
    """
    try:
        data = request.get_json()
        path = data.get('path')
        encoding = data.get('encoding', 'text')
        
        if not path:
            return jsonify({"error": "Path is required"}), 400
        
        content = None
        file_name = os.path.basename(path)
        
        # Handle different path types
        if path.startswith('/Workspace'):
            # Read workspace file
            content = read_workspace_file(path, encoding)
        elif path.startswith('/Volumes'):
            # Read volume file
            content = read_volume_file(path, encoding)
        elif path.startswith('dbfs:'):
            # Read DBFS file
            content = read_dbfs_file(path, encoding)
        else:
            return jsonify({"error": "Invalid path"}), 400
        
        return jsonify({
            "path": path,
            "name": file_name,
            "content": content,
            "encoding": encoding
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def list_workspace_files(path: str, file_types: List[str]) -> List[Dict]:
    """List files from workspace"""
    files = []
    try:
        items = w.workspace.list(path)
        for item in items:
            if item.object_type.value == 'FILE':
                file_name = os.path.basename(item.path)
                if not file_types or any(file_name.endswith(f'.{ft}') for ft in file_types):
                    files.append({
                        "name": file_name,
                        "path": item.path,
                        "type": "workspace",
                        "size": item.size if hasattr(item, 'size') else None,
                        "modified_at": item.modified_at if hasattr(item, 'modified_at') else None
                    })
    except Exception as e:
        print(f"Error listing workspace files: {e}")
    
    return files


def list_volume_files(path: str, file_types: List[str]) -> List[Dict]:
    """List files from Unity Catalog volume"""
    files = []
    try:
        items = w.files.list_directory_contents(path)
        for item in items:
            if not item.is_directory:
                file_name = item.name
                if not file_types or any(file_name.endswith(f'.{ft}') for ft in file_types):
                    files.append({
                        "name": file_name,
                        "path": item.path,
                        "type": "volume",
                        "size": item.file_size,
                        "modified_at": item.last_modified
                    })
    except Exception as e:
        print(f"Error listing volume files: {e}")
    
    return files


def list_dbfs_files(path: str, file_types: List[str]) -> List[Dict]:
    """List files from DBFS"""
    files = []
    try:
        items = w.dbfs.list(path)
        for item in items:
            if not item.is_dir:
                file_name = os.path.basename(item.path)
                if not file_types or any(file_name.endswith(f'.{ft}') for ft in file_types):
                    files.append({
                        "name": file_name,
                        "path": item.path,
                        "type": "dbfs",
                        "size": item.file_size,
                        "modified_at": None
                    })
    except Exception as e:
        print(f"Error listing DBFS files: {e}")
    
    return files


def read_workspace_file(path: str, encoding: str) -> str:
    """Read a workspace file"""
    try:
        # Export the file content
        response = w.workspace.export(path)
        content = response.content
        
        if encoding == 'base64':
            return base64.b64encode(content).decode('utf-8')
        else:
            return content.decode('utf-8')
    except Exception as e:
        raise Exception(f"Error reading workspace file: {e}")


def read_volume_file(path: str, encoding: str) -> str:
    """Read a Unity Catalog volume file"""
    try:
        # Download file content
        response = w.files.download(path)
        content = response.contents.read()
        
        if encoding == 'base64':
            return base64.b64encode(content).decode('utf-8')
        else:
            return content.decode('utf-8')
    except Exception as e:
        raise Exception(f"Error reading volume file: {e}")


def read_dbfs_file(path: str, encoding: str) -> str:
    """Read a DBFS file"""
    try:
        # Read file content
        response = w.dbfs.read(path)
        content = response.data
        
        if encoding == 'base64':
            return content  # Already base64 encoded
        else:
            return base64.b64decode(content).decode('utf-8')
    except Exception as e:
        raise Exception(f"Error reading DBFS file: {e}")

# Serve static files - at the very end, after all API routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from build directory"""
    # Don't serve static files for API routes
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404
        
    from flask import send_from_directory
    
    # Build directory is two levels up from src/api
    build_dir = os.path.join(os.path.dirname(__file__), '../../build')
    build_dir = os.path.abspath(build_dir)
    
    file_path = os.path.join(build_dir, path) if path else os.path.join(build_dir, 'index.html')
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(build_dir, path if path else 'index.html')
    else:
        return send_from_directory(build_dir, 'index.html')

if __name__ == '__main__':
    port = 8000  # Use port 8000 (8080 is blocked)
    app.run(host='0.0.0.0', port=port, debug=False)
