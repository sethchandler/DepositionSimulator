// ui/documentUI.js

import { documentService } from '../services/documentService.js';
import { handleError } from '../utils/errorHandler.js';
import { documentDashboard } from './documentDashboard.js';
import { documentViewer } from './documentViewer.js';

// DOM element references (will be populated by initializeDocumentUI)
export const documentDOM = {};

/**
 * Initialize document UI components and DOM references.
 */
export function initializeDocumentUI() {
    // Populate DOM references
    documentDOM.documentCard = document.getElementById('documentCard');
    documentDOM.documentUpload = document.getElementById('documentUpload');
    documentDOM.documentList = document.getElementById('documentList');
    documentDOM.documentTokenCount = document.getElementById('documentTokenCount');
    documentDOM.documentTokenLimit = document.getElementById('documentTokenLimit');
    documentDOM.documentTokenBar = document.getElementById('documentTokenBar');
    documentDOM.uploadButton = document.getElementById('uploadButton');
    documentDOM.documentDashboardButton = document.getElementById('documentDashboardButton');
    
    // Initialize document dashboard and viewer
    documentDashboard.initialize();
    documentViewer.initialize();
    
    // Set up event listeners
    setupDocumentEventListeners();
    
    // Initialize UI state
    updateDocumentUI();
}

/**
 * Set up event listeners for document functionality.
 */
function setupDocumentEventListeners() {
    // File upload handling
    documentDOM.documentUpload?.addEventListener('change', handleDocumentUpload);
    
    // Upload button (if using custom button instead of file input)
    documentDOM.uploadButton?.addEventListener('click', () => {
        documentDOM.documentUpload?.click();
    });
    
    // Document dashboard button
    documentDOM.documentDashboardButton?.addEventListener('click', () => {
        documentDashboard.show();
    });
}

/**
 * Handle document file upload.
 * @param {Event} event - File input change event
 */
async function handleDocumentUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Process each file
    for (const file of files) {
        try {
            // Show upload progress
            showUploadProgress(file.name);
            
            // Process the document
            const document = await documentService.processUpload(file);
            
            // Update UI
            updateDocumentUI();
            showUploadSuccess(document);
            
        } catch (error) {
            const errorInfo = handleError(error, 'Document Upload');
            showUploadError(file.name, errorInfo.userMessage);
        }
    }
    
    // Clear file input
    event.target.value = '';
}

/**
 * Show upload progress indicator.
 * @param {string} fileName - Name of file being uploaded
 */
function showUploadProgress(fileName) {
    const progressItem = document.createElement('div');
    progressItem.className = 'document-upload-progress';
    progressItem.innerHTML = `
        <div class="upload-progress-item">
            <span class="upload-file-name">${fileName}</span>
            <span class="upload-status">Processing...</span>
        </div>
    `;
    
    if (documentDOM.documentList) {
        documentDOM.documentList.appendChild(progressItem);
    }
}

/**
 * Show upload success message and remove progress indicator.
 * @param {Object} document - Successfully uploaded document
 */
function showUploadSuccess(document) {
    // Remove progress indicators
    const progressItems = document.querySelectorAll('.document-upload-progress');
    progressItems.forEach(item => item.remove());
    
    // Could show a brief success message
    console.log(`Document uploaded successfully: Exhibit ${document.exhibitLetter}`);
}

/**
 * Show upload error message.
 * @param {string} fileName - Name of file that failed
 * @param {string} errorMessage - Error message to display
 */
function showUploadError(fileName, errorMessage) {
    // Remove progress indicators
    const progressItems = document.querySelectorAll('.document-upload-progress');
    progressItems.forEach(item => item.remove());
    
    // Show error in document list area
    const errorItem = document.createElement('div');
    errorItem.className = 'document-upload-error';
    errorItem.innerHTML = `
        <div class="upload-error-item">
            <span class="upload-file-name">${fileName}</span>
            <span class="upload-error-message">${errorMessage}</span>
            <button class="remove-error-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    if (documentDOM.documentList) {
        documentDOM.documentList.appendChild(errorItem);
    }
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
        if (errorItem.parentElement) {
            errorItem.remove();
        }
    }, 10000);
}

/**
 * Update the document UI with current state.
 */
export function updateDocumentUI() {
    updateDocumentList();
    updateTokenUsage();
    updateUploadButton();
    
    // Update dashboard if it's visible
    if (documentDashboard.isVisible) {
        documentDashboard.updateDashboard();
    }
}

/**
 * Update the document list display.
 */
function updateDocumentList() {
    if (!documentDOM.documentList) return;
    
    const documents = documentService.getAllDocuments();
    
    if (documents.length === 0) {
        documentDOM.documentList.innerHTML = `
            <div class="no-documents">
                <p>No documents uploaded yet.</p>
                <p class="document-help-text">Upload emails, contracts, reports, or other text documents to reference during the deposition.</p>
            </div>
        `;
        return;
    }
    
    documentDOM.documentList.innerHTML = documents.map(doc => `
        <div class="document-item" data-document-id="${doc.id}">
            <div class="document-header">
                <span class="exhibit-label">Exhibit ${doc.exhibitLetter}</span>
                <span class="document-type">${doc.metadata.documentType}</span>
                <div class="document-actions">
                    <button class="document-view-btn" onclick="viewDocument('${doc.id}')" title="View Full Document">
                        👁️ View
                    </button>
                    <button class="document-remove-btn" onclick="removeDocument('${doc.id}')" title="Remove Document">×</button>
                </div>
            </div>
            <div class="document-details" onclick="viewDocument('${doc.id}')" style="cursor: pointer;" title="Click to view full document">
                <div class="document-name">${doc.fileName}</div>
                <div class="document-meta">
                    <span class="token-count">${doc.tokenCount.toLocaleString()} tokens</span>
                    ${doc.metadata.dates.length > 0 ? `<span class="document-dates">Dates: ${doc.metadata.dates.slice(0, 2).join(', ')}</span>` : ''}
                </div>
                ${doc.metadata.parties.length > 0 ? `
                    <div class="document-parties">Parties: ${doc.metadata.parties.slice(0, 3).join(', ')}</div>
                ` : ''}
            </div>
            ${doc.isActive ? '<div class="document-status active">Currently in context</div>' : ''}
        </div>
    `).join('');
}

/**
 * Update token usage display.
 */
function updateTokenUsage() {
    const totalTokens = documentService.getTotalTokenCount();
    const maxTokens = documentService.maxTokens;
    const percentage = (totalTokens / maxTokens) * 100;
    
    if (documentDOM.documentTokenCount) {
        documentDOM.documentTokenCount.textContent = totalTokens.toLocaleString();
    }
    
    if (documentDOM.documentTokenLimit) {
        documentDOM.documentTokenLimit.textContent = maxTokens.toLocaleString();
    }
    
    if (documentDOM.documentTokenBar) {
        documentDOM.documentTokenBar.style.width = `${Math.min(percentage, 100)}%`;
        
        // Update color based on usage
        if (percentage > 90) {
            documentDOM.documentTokenBar.className = 'token-usage-bar danger';
        } else if (percentage > 75) {
            documentDOM.documentTokenBar.className = 'token-usage-bar warning';
        } else {
            documentDOM.documentTokenBar.className = 'token-usage-bar normal';
        }
    }
}

/**
 * Update upload button state based on token limits.
 */
function updateUploadButton() {
    const totalTokens = documentService.getTotalTokenCount();
    const maxTokens = documentService.maxTokens;
    
    if (documentDOM.documentUpload) {
        documentDOM.documentUpload.disabled = totalTokens >= maxTokens;
    }
    
    if (documentDOM.uploadButton) {
        documentDOM.uploadButton.disabled = totalTokens >= maxTokens;
        documentDOM.uploadButton.textContent = totalTokens >= maxTokens 
            ? 'Token Limit Reached' 
            : 'Upload Documents';
    }
}

/**
 * Remove a document from the registry and update UI.
 * @param {string} documentId - ID of document to remove
 */
window.removeDocument = function(documentId) {
    documentService.removeDocument(documentId);
    updateDocumentUI();
};

/**
 * View a document in the full document viewer.
 * @param {string} documentId - ID of document to view
 */
window.viewDocument = function(documentId) {
    const documents = documentService.getAllDocuments();
    const document = documents.find(doc => doc.id === documentId);
    
    if (document) {
        documentViewer.show(document);
    } else {
        console.error('Document not found:', documentId);
    }
};

/**
 * Get documents that match a user's question for context injection.
 * @param {string} userInput - User's question or statement
 * @returns {Array<string>} Array of document contents for context
 */
export function getDocumentContextForQuestion(userInput) {
    const referencedDocs = documentService.detectDocumentReferences(userInput);
    
    if (referencedDocs.length === 0) return [];
    
    // Mark the first referenced document as active and return its content
    const docContent = documentService.getDocumentForContext(referencedDocs[0].id);
    
    // Update UI to show active document
    updateDocumentUI();
    
    return [docContent];
}

/**
 * Clear all active document contexts (call after each deposition response).
 */
export function clearActiveDocumentContexts() {
    const documents = documentService.getAllDocuments();
    documents.forEach(doc => {
        doc.isActive = false;
    });
    updateDocumentUI();
}

/**
 * Get summary information about uploaded documents for display.
 * @returns {Object} Document summary info
 */
export function getDocumentSummary() {
    const documents = documentService.getAllDocuments();
    return {
        count: documents.length,
        totalTokens: documentService.getTotalTokenCount(),
        maxTokens: documentService.maxTokens,
        exhibits: documents.map(doc => ({
            letter: doc.exhibitLetter,
            type: doc.metadata.documentType,
            fileName: doc.fileName
        }))
    };
}

/**
 * Export all documents as a JSON file.
 */
export function exportDocuments() {
    const documents = documentService.getAllDocuments();
    const exportData = {
        exportDate: new Date().toISOString(),
        documentCount: documents.length,
        documents: documents.map(doc => ({
            exhibitLetter: doc.exhibitLetter,
            fileName: doc.fileName,
            documentType: doc.metadata.documentType,
            dates: doc.metadata.dates,
            parties: doc.metadata.parties,
            tokenCount: doc.tokenCount,
            // Include summary for large docs, full content for small ones
            content: doc.tokenCount > 2000 ? doc.summary : doc.textContent
        }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `deposition-documents-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}