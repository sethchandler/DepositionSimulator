// ui/documentDashboard.js

import { documentService } from '../services/documentService.js';

/**
 * Document dashboard for displaying summary statistics and document management
 */
export class DocumentDashboard {
    
    constructor() {
        this.dashboardElement = null;
        this.isVisible = false;
    }
    
    /**
     * Initializes the document dashboard
     */
    initialize() {
        this.createDashboardElement();
        this.setupEventListeners();
    }
    
    /**
     * Creates the dashboard DOM element
     */
    createDashboardElement() {
        // Create dashboard container
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.id = 'documentDashboard';
        this.dashboardElement.className = 'document-dashboard';
        this.dashboardElement.style.display = 'none';
        
        this.dashboardElement.innerHTML = `
            <div class="dashboard-header">
                <h3>📁 Document Summary Dashboard</h3>
                <button id="closeDashboard" class="close-btn">&times;</button>
            </div>
            
            <div class="dashboard-content">
                <div class="stats-section">
                    <h4>📊 Document Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Documents:</span>
                            <span id="totalDocuments" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Pre-built:</span>
                            <span id="preBuiltDocuments" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Uploaded:</span>
                            <span id="uploadedDocuments" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Active in Context:</span>
                            <span id="activeDocuments" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Tokens:</span>
                            <span id="totalTokens" class="stat-value">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Capacity Used:</span>
                            <span id="capacityUsed" class="stat-value">0%</span>
                        </div>
                    </div>
                </div>
                
                <div class="document-types-section">
                    <h4>📋 Document Types</h4>
                    <div id="documentTypes" class="document-types-list">
                        <!-- Document types will be populated here -->
                    </div>
                </div>
                
                <div class="search-section">
                    <h4>🔍 Search Documents</h4>
                    <div class="search-controls">
                        <input type="text" id="documentSearch" placeholder="Search documents by content or metadata...">
                        <button id="searchButton">Search</button>
                        <button id="clearSearch">Clear</button>
                    </div>
                    <div id="searchResults" class="search-results">
                        <!-- Search results will appear here -->
                    </div>
                </div>
                
                <div class="document-list-section">
                    <h4>📄 All Documents</h4>
                    <div class="list-controls">
                        <button id="refreshDocuments">🔄 Refresh</button>
                        <button id="clearAllDocuments" class="danger-btn">🗑️ Clear All</button>
                    </div>
                    <div id="documentList" class="document-list">
                        <!-- Document list will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        // Add to document body
        document.body.appendChild(this.dashboardElement);
        
        // Add CSS styles
        this.addStyles();
    }
    
    /**
     * Adds CSS styles for the dashboard
     */
    addStyles() {
        const styles = `
            .document-dashboard {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 800px;
                max-height: 80vh;
                background: white;
                border: 2px solid #ddd;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                overflow-y: auto;
            }
            
            .dashboard-header {
                background: #f8f9fa;
                padding: 15px 20px;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            
            .dashboard-header h3 {
                margin: 0;
                color: #333;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-btn:hover {
                color: #333;
                background: #f0f0f0;
                border-radius: 15px;
            }
            
            .dashboard-content {
                padding: 20px;
            }
            
            .dashboard-content h4 {
                margin: 20px 0 10px 0;
                color: #333;
                border-bottom: 2px solid #eee;
                padding-bottom: 5px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .stat-item {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .stat-label {
                font-weight: 500;
                color: #666;
            }
            
            .stat-value {
                font-weight: bold;
                color: #333;
                font-size: 1.1em;
            }
            
            .document-types-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 20px;
            }
            
            .document-type-badge {
                background: #e3f2fd;
                color: #1976d2;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 0.9em;
                font-weight: 500;
            }
            
            .search-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .search-controls input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            
            .search-controls button {
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: #f8f9fa;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .search-controls button:hover {
                background: #e9ecef;
            }
            
            .search-results {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            
            .search-result-item {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
            }
            
            .search-result-item:hover {
                background: #f8f9fa;
            }
            
            .search-result-item:last-child {
                border-bottom: none;
            }
            
            .list-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .list-controls button {
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: #f8f9fa;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .list-controls button:hover {
                background: #e9ecef;
            }
            
            .danger-btn {
                background: #ffebee !important;
                color: #c62828 !important;
                border-color: #ffcdd2 !important;
            }
            
            .danger-btn:hover {
                background: #ffcdd2 !important;
            }
            
            .document-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #eee;
                border-radius: 4px;
            }
            
            .document-item {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .document-item:last-child {
                border-bottom: none;
            }
            
            .document-info {
                flex: 1;
            }
            
            .document-name {
                font-weight: 500;
                color: #333;
                margin-bottom: 4px;
            }
            
            .document-meta {
                font-size: 0.9em;
                color: #666;
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .document-status {
                font-size: 0.8em;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 500;
            }
            
            .status-active {
                background: #e8f5e8;
                color: #2e7d32;
            }
            
            .status-prebuilt {
                background: #e3f2fd;
                color: #1976d2;
            }
            
            .status-uploaded {
                background: #fff3e0;
                color: #f57c00;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Sets up event listeners for dashboard interactions
     */
    setupEventListeners() {
        // Close dashboard
        this.dashboardElement.querySelector('#closeDashboard').addEventListener('click', () => {
            this.hide();
        });
        
        // Search functionality
        const searchButton = this.dashboardElement.querySelector('#searchButton');
        const searchInput = this.dashboardElement.querySelector('#documentSearch');
        const clearSearchButton = this.dashboardElement.querySelector('#clearSearch');
        
        searchButton.addEventListener('click', () => {
            this.performSearch();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        clearSearchButton.addEventListener('click', () => {
            searchInput.value = '';
            this.clearSearchResults();
        });
        
        // Refresh documents
        this.dashboardElement.querySelector('#refreshDocuments').addEventListener('click', () => {
            this.updateDashboard();
        });
        
        // Clear all documents
        this.dashboardElement.querySelector('#clearAllDocuments').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all documents? This action cannot be undone.')) {
                documentService.clearAllDocuments();
                this.updateDashboard();
            }
        });
        
        // Close on background click
        this.dashboardElement.addEventListener('click', (e) => {
            if (e.target === this.dashboardElement) {
                this.hide();
            }
        });
    }
    
    /**
     * Shows the dashboard
     */
    show() {
        this.isVisible = true;
        this.dashboardElement.style.display = 'block';
        this.updateDashboard();
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    /**
     * Hides the dashboard
     */
    hide() {
        this.isVisible = false;
        this.dashboardElement.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
    
    /**
     * Updates all dashboard content
     */
    updateDashboard() {
        if (!this.isVisible) return;
        
        this.updateStatistics();
        this.updateDocumentTypes();
        this.updateDocumentList();
    }
    
    /**
     * Updates the statistics section
     */
    updateStatistics() {
        const stats = documentService.getDocumentStatistics();
        
        this.dashboardElement.querySelector('#totalDocuments').textContent = stats.total;
        this.dashboardElement.querySelector('#preBuiltDocuments').textContent = stats.preBuilt;
        this.dashboardElement.querySelector('#uploadedDocuments').textContent = stats.uploaded;
        this.dashboardElement.querySelector('#activeDocuments').textContent = stats.active;
        this.dashboardElement.querySelector('#totalTokens').textContent = stats.totalTokens.toLocaleString();
        this.dashboardElement.querySelector('#capacityUsed').textContent = `${stats.capacityUsed}%`;
    }
    
    /**
     * Updates the document types section
     */
    updateDocumentTypes() {
        const stats = documentService.getDocumentStatistics();
        const typesContainer = this.dashboardElement.querySelector('#documentTypes');
        
        typesContainer.innerHTML = '';
        
        if (Object.keys(stats.documentTypes).length === 0) {
            typesContainer.innerHTML = '<span class="text-muted">No documents loaded</span>';
            return;
        }
        
        Object.entries(stats.documentTypes).forEach(([type, count]) => {
            const badge = document.createElement('span');
            badge.className = 'document-type-badge';
            badge.textContent = `${type} (${count})`;
            typesContainer.appendChild(badge);
        });
    }
    
    /**
     * Updates the document list
     */
    updateDocumentList() {
        const documents = documentService.getAllDocuments();
        const listContainer = this.dashboardElement.querySelector('#documentList');
        
        listContainer.innerHTML = '';
        
        if (documents.length === 0) {
            listContainer.innerHTML = '<div class="document-item"><span class="text-muted">No documents loaded</span></div>';
            return;
        }
        
        documents.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'document-item';
            
            const statusClass = doc.isActive ? 'status-active' : 
                               doc.metadata?.isPreBuilt ? 'status-prebuilt' : 'status-uploaded';
            const statusText = doc.isActive ? 'Active' : 
                              doc.metadata?.isPreBuilt ? 'Pre-built' : 'Uploaded';
            
            item.innerHTML = `
                <div class="document-info">
                    <div class="document-name">${doc.fileName}</div>
                    <div class="document-meta">
                        <span>Exhibit ${doc.exhibitLetter}</span>
                        <span>${doc.metadata?.documentType || 'Unknown'}</span>
                        <span>${doc.tokenCount} tokens</span>
                        <span>${new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="document-status ${statusClass}">${statusText}</div>
            `;
            
            listContainer.appendChild(item);
        });
    }
    
    /**
     * Performs document search
     */
    performSearch() {
        const searchTerm = this.dashboardElement.querySelector('#documentSearch').value.trim();
        if (!searchTerm) return;
        
        const results = documentService.searchDocuments(searchTerm);
        this.displaySearchResults(results, searchTerm);
    }
    
    /**
     * Displays search results
     */
    displaySearchResults(results, searchTerm) {
        const resultsContainer = this.dashboardElement.querySelector('#searchResults');
        
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `<div class="search-result-item">No documents found matching "${searchTerm}"</div>`;
            return;
        }
        
        results.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            const matchType = doc.matchType === 'content' ? '📄 Content match' : '🏷️ Metadata match';
            
            item.innerHTML = `
                <div class="document-name">${doc.fileName} (Exhibit ${doc.exhibitLetter})</div>
                <div class="document-meta">
                    <span>${matchType}</span>
                    <span>${doc.metadata?.documentType || 'Unknown'}</span>
                </div>
            `;
            
            resultsContainer.appendChild(item);
        });
    }
    
    /**
     * Clears search results
     */
    clearSearchResults() {
        this.dashboardElement.querySelector('#searchResults').innerHTML = '';
    }
}

// Export singleton instance
export const documentDashboard = new DocumentDashboard();