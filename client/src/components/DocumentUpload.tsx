import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, Clock, Eye } from "lucide-react";

interface Document {
  id: string;
  name: string;
  owner: string;
  department: string;
  uploadedAt: string;
  size: string;
  expiration?: string;
  path?: string;
  fileType?: string;
}

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleDownload = (doc: Document) => {
    if (!doc.path) return;
    const parts = doc.path.split(/[/\\]/);
    const filename = parts[parts.length - 1] || 'document';
    const link = document.createElement('a');
    link.href = `/uploads/${filename}`;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (doc: Document) => {
    if (!doc.path) return;
    const parts = doc.path.split(/[/\\]/);
    const filename = parts[parts.length - 1] || 'document';
    window.open(`/uploads/${filename}`, '_blank');
  };

  const handleDelete = async (docId: string, owner: string) => {
    try {
      const meResponse = await fetch('/api/auth/me', { credentials: 'include' });
      const { user } = await meResponse.json();
      
      if (user.role !== 'admin' && user.username !== owner) {
        alert('You can only delete your own documents');
        return;
      }
      
      if (!confirm('Are you sure you want to delete this document?')) {
        return;
      }
      
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        alert('Document deleted successfully');
        loadDocuments();
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  const handleUpload = async () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      alert('Please select a file first');
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (response.ok) {
        alert('Document uploaded successfully!');
        if (fileInput) fileInput.value = '';
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select PDF or DOC file</Label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                data-testid="input-file-upload"
              />
              <Button onClick={handleUpload} disabled={isUploading} data-testid="button-upload">
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No documents uploaded yet. Upload a document to get started.
              </p>
            ) : null}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
              >
                <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{doc.owner}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>{doc.uploadedAt}</span>
                  </div>
                  {doc.expiration && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {doc.expiration}</span>
                    </div>
                  )}
                </div>
                
                <Badge variant="secondary" className="shrink-0">
                  {doc.department}
                </Badge>
                
                <div className="flex gap-1 shrink-0">
                  {doc.fileType?.toLowerCase() === '.pdf' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(doc)}
                      data-testid={`button-preview-${doc.id}`}
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    data-testid={`button-download-${doc.id}`}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.owner)}
                    data-testid={`button-delete-${doc.id}`}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
