// ui/documentViewer.js

/**
 * Document viewer for displaying full document content
 */
export class DocumentViewer {
    
    constructor() {
        this.viewerElement = null;
        this.isVisible = false;
        this.currentDocument = null;
    }
    
    /**
     * Initializes the document viewer
     */
    initialize() {
        this.createViewerElement();
        this.setupEventListeners();
    }
    
    /**
     * Creates the viewer DOM element
     */
    createViewerElement() {
        this.viewerElement = document.createElement('div');
        this.viewerElement.id = 'documentViewer';
        this.viewerElement.className = 'document-viewer';
        this.viewerElement.style.display = 'none';
        
        this.viewerElement.innerHTML = `
            <div class="viewer-overlay">
                <div class="viewer-container">
                    <div class="viewer-header">
                        <div class="viewer-title">
                            <h3 id="viewerDocumentTitle">Document Viewer</h3>
                            <div class="viewer-metadata">
                                <span id="viewerExhibitLabel" class="exhibit-badge">Exhibit A</span>
                                <span id="viewerDocumentType" class="document-type-badge">Document</span>
                                <span id="viewerTokenCount" class="token-count-badge">0 tokens</span>
                            </div>
                        </div>
                        <div class="viewer-controls">
                            <button id="viewerPrintBtn" class="viewer-btn" title="Print Document">
                                🖨️ Print
                            </button>
                            <button id="viewerCopyBtn" class="viewer-btn" title="Copy to Clipboard">
                                📋 Copy
                            </button>
                            <button id="viewerCloseBtn" class="viewer-close-btn" title="Close">
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    <div class="viewer-content">
                        <div id="viewerDocumentContent" class="document-content">
                            <!-- Document content will be loaded here -->
                        </div>
                    </div>
                    
                    <div class="viewer-footer">
                        <div class="viewer-info">
                            <div class="document-details">
                                <div class="detail-section">
                                    <strong>File Name:</strong>
                                    <span id="viewerFileName">N/A</span>
                                </div>
                                <div class="detail-section" id="viewerDatesSection" style="display: none;">
                                    <strong>Dates Found:</strong>
                                    <span id="viewerDates">N/A</span>
                                </div>
                                <div class="detail-section" id="viewerPartiesSection" style="display: none;">
                                    <strong>Parties:</strong>
                                    <span id="viewerParties">N/A</span>
                                </div>
                                <div class="detail-section" id="viewerTopicsSection" style="display: none;">
                                    <strong>Key Topics:</strong>
                                    <span id="viewerTopics">N/A</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.viewerElement);
        this.addStyles();
    }
    
    /**
     * Adds CSS styles for the document viewer
     */
    addStyles() {
        const styles = `
            .document-viewer {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .viewer-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
            }
            
            .viewer-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 1000px;
                height: 85vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .viewer-header {
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-radius: 12px 12px 0 0;
            }
            
            .viewer-title h3 {
                margin: 0 0 8px 0;
                color: #333;
                font-size: 1.4em;
            }
            
            .viewer-metadata {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .exhibit-badge {
                background: #007bff;
                color: white;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.85em;
                font-weight: 600;
            }
            
            .document-type-badge {
                background: #6c757d;
                color: white;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.85em;
                text-transform: capitalize;
            }
            
            .token-count-badge {
                background: #e9ecef;
                color: #495057;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.85em;
            }
            
            .viewer-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .viewer-btn {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9em;
                transition: all 0.2s ease;
            }
            
            .viewer-btn:hover {
                background: #e9ecef;
                transform: translateY(-1px);
            }
            
            .viewer-close-btn {
                background: #dc3545;
                color: white;
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .viewer-close-btn:hover {
                background: #c82333;
                transform: scale(1.05);
            }
            
            .viewer-content {
                flex: 1;
                overflow-y: auto;
                padding: 0;
                background: white;
            }
            
            .document-content {
                padding: 30px;
                font-family: 'Courier New', Monaco, monospace;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                white-space: pre-wrap;
                word-wrap: break-word;
                background: white;
                border: none;
                outline: none;
            }
            
            .viewer-footer {
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                padding: 16px 20px;
                border-radius: 0 0 12px 12px;
            }
            
            .document-details {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 12px;
                font-size: 0.9em;
            }
            
            .detail-section {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .detail-section strong {
                color: #495057;
                font-weight: 600;
            }
            
            .detail-section span {
                color: #6c757d;
                font-size: 0.95em;
            }
            
            /* Print styles */
            @media print {
                .viewer-overlay {
                    background: white;
                    position: static;
                    padding: 0;
                }
                
                .viewer-container {
                    width: 100%;
                    height: auto;
                    max-width: none;
                    box-shadow: none;
                    border-radius: 0;
                }
                
                .viewer-header,
                .viewer-footer {
                    display: none;
                }
                
                .document-content {
                    padding: 0;
                    font-size: 12px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Sets up event listeners
     */
    setupEventListeners() {
        // Close viewer
        this.viewerElement.querySelector('#viewerCloseBtn').addEventListener('click', () => {
            this.hide();
        });
        
        // Close on overlay click
        this.viewerElement.querySelector('.viewer-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('viewer-overlay')) {
                this.hide();
            }
        });
        
        // Copy to clipboard
        this.viewerElement.querySelector('#viewerCopyBtn').addEventListener('click', () => {
            this.copyToClipboard();
        });
        
        // Print document
        this.viewerElement.querySelector('#viewerPrintBtn').addEventListener('click', () => {
            this.printDocument();
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * Shows the document viewer with a specific document
     * @param {Object} doc - Document object to display
     */
    show(doc) {
        this.currentDocument = doc;
        this.isVisible = true;
        
        // Update header information
        this.viewerElement.querySelector('#viewerDocumentTitle').textContent = doc.fileName;
        this.viewerElement.querySelector('#viewerExhibitLabel').textContent = `Exhibit ${doc.exhibitLetter}`;
        this.viewerElement.querySelector('#viewerDocumentType').textContent = doc.metadata.documentType || 'Document';
        this.viewerElement.querySelector('#viewerTokenCount').textContent = `${doc.tokenCount.toLocaleString()} tokens`;
        
        // Update content
        this.viewerElement.querySelector('#viewerDocumentContent').textContent = doc.textContent;
        
        // Update footer details
        this.viewerElement.querySelector('#viewerFileName').textContent = doc.fileName;
        
        // Show/hide metadata sections based on availability
        this.updateMetadataSection('#viewerDatesSection', '#viewerDates', doc.metadata.dates);
        this.updateMetadataSection('#viewerPartiesSection', '#viewerParties', doc.metadata.parties);
        this.updateMetadataSection('#viewerTopicsSection', '#viewerTopics', doc.metadata.keyTopics);
        
        // Show the viewer
        this.viewerElement.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Focus on viewer for keyboard events
        this.viewerElement.focus();
    }
    
    /**
     * Updates a metadata section in the footer
     * @param {string} sectionSelector - CSS selector for the section
     * @param {string} contentSelector - CSS selector for the content span
     * @param {Array} data - Array of metadata items
     */
    updateMetadataSection(sectionSelector, contentSelector, data) {
        const section = this.viewerElement.querySelector(sectionSelector);
        const content = this.viewerElement.querySelector(contentSelector);
        
        if (data && data.length > 0) {
            content.textContent = data.slice(0, 5).join(', ');
            section.style.display = 'flex';
        } else {
            section.style.display = 'none';
        }
    }
    
    /**
     * Hides the document viewer
     */
    hide() {
        this.isVisible = false;
        this.currentDocument = null;
        this.viewerElement.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
    
    /**
     * Copies document content to clipboard
     */
    async copyToClipboard() {
        if (!this.currentDocument) return;
        
        try {
            await navigator.clipboard.writeText(this.currentDocument.textContent);
            
            // Show feedback
            const copyBtn = this.viewerElement.querySelector('#viewerCopyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = '#28a745';
            copyBtn.style.color = 'white';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '#f8f9fa';
                copyBtn.style.color = 'inherit';
            }, 2000);
            
        } catch (error) {
            console.warn('Failed to copy to clipboard:', error);
            alert('Failed to copy to clipboard. Please select and copy manually.');
        }
    }
    
    /**
     * Prints the document
     */
    printDocument() {
        if (!this.currentDocument) return;
        
        // Create a temporary window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${this.currentDocument.fileName}</title>
                <style>
                    body {
                        font-family: 'Courier New', Monaco, monospace;
                        font-size: 12px;
                        line-height: 1.4;
                        margin: 1in;
                        color: #000;
                    }
                    .document-header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .exhibit-info {
                        font-weight: bold;
                        font-size: 14px;
                    }
                    .document-content {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    @page {
                        margin: 1in;
                    }
                </style>
            </head>
            <body>
                <div class="document-header">
                    <div class="exhibit-info">EXHIBIT ${this.currentDocument.exhibitLetter}</div>
                    <div>${this.currentDocument.fileName}</div>
                    <div>${this.currentDocument.metadata.documentType || 'Document'}</div>
                </div>
                <div class="document-content">${this.currentDocument.textContent.replace(/\n/g, '<br>')}</div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
}

// Export singleton instance
export const documentViewer = new DocumentViewer();