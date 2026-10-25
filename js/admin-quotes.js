// Admin Quotes Management
let currentUser = null;
let allQuotes = [];
let filteredQuotes = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load quotes
    loadQuotes();
    
    // Setup filters
    setupFilters();
    
    // Setup logout
    setupLogout();
    
    // Setup create quote modal
    setupCreateQuoteModal();
});

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data.admin || data.user;
        if (currentUser && currentUser.username) {
            const adminNameEl = document.getElementById('adminName') || document.getElementById('adminUsername');
            if (adminNameEl) {
                adminNameEl.textContent = currentUser.username;
            }
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const token = localStorage.getItem('adminToken');
            
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        });
    }
}

async function loadQuotes() {
    const token = localStorage.getItem('adminToken');
    const tbody = document.getElementById('quotesTable');
    
    try {
        const response = await fetch('/api/admin/quotes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load quotes');
        }
        
        const result = await response.json();
        allQuotes = result.data?.quotes || [];
        filteredQuotes = [...allQuotes];
        renderQuotes();
    } catch (error) {
        console.error('Error loading quotes:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Failed to load quotes. Please try again.</td></tr>';
    }
}

function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const searchInput = document.getElementById('searchInput');
    const applyBtn = document.getElementById('applyFilters');
    
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (serviceFilter) serviceFilter.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const serviceFilter = document.getElementById('serviceFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredQuotes = allQuotes.filter(quote => {
        // Status filter
        if (statusFilter && quote.status !== statusFilter) {
            return false;
        }
        
        // Service filter
        if (serviceFilter && quote.service_type !== serviceFilter) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = `
                ${quote.quote_number || ''}
                ${quote.company_name || ''}
                ${quote.full_name || ''}
                ${quote.email || ''}
                ${quote.phone || ''}
            `.toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderQuotes();
}

function renderQuotes() {
    const tbody = document.getElementById('quotesTable');
    
    if (!tbody) {
        console.error('Quotes table not found');
        return;
    }
    
    if (filteredQuotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No quotes found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredQuotes.map(quote => `
        <tr>
            <td><strong>${escapeHtml(quote.quote_number || 'N/A')}</strong></td>
            <td>${escapeHtml(quote.full_name || 'N/A')}</td>
            <td>${escapeHtml(quote.company_name || 'N/A')}</td>
            <td>${escapeHtml(quote.service_type || 'N/A')}</td>
            <td>${escapeHtml(quote.cleaning_frequency || 'N/A')}</td>
            <td><span class="status-badge status-${quote.status}">${quote.status}</span></td>
            <td>${formatDate(quote.request_date)}</td>
            <td>
                <button class="btn btn-small" onclick="viewQuote(${quote.quote_id})">View</button>
                <button class="btn btn-small btn-secondary" onclick="updateStatus(${quote.quote_id})">Update</button>
            </td>
        </tr>
    `).join('');
}

async function viewQuote(quoteId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`/api/admin/quotes/${quoteId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load quote details');
        }
        
        const result = await response.json();
        showQuoteModal(result.data);
    } catch (error) {
        console.error('Error loading quote:', error);
        showError('Failed to load quote details');
    }
}

function showQuoteModal(data) {
    const modal = document.getElementById('quoteModal');
    const modalContent = document.getElementById('quoteDetails');
    const quote = data.quote;
    
    modalContent.innerHTML = `
        <h3>Quote ${escapeHtml(quote.quote_number)}</h3>
        <div class="quote-detail-grid">
            <div class="detail-section">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${escapeHtml(quote.full_name || 'N/A')}</p>
                <p><strong>Company:</strong> ${escapeHtml(quote.company_name || 'N/A')}</p>
                <p><strong>Email:</strong> ${escapeHtml(quote.email || 'N/A')}</p>
                <p><strong>Phone:</strong> ${escapeHtml(quote.phone || 'N/A')}</p>
            </div>
            <div class="detail-section">
                <h4>Service Details</h4>
                <p><strong>Service Type:</strong> ${escapeHtml(quote.service_type || 'N/A')}</p>
                <p><strong>Frequency:</strong> ${escapeHtml(quote.cleaning_frequency || 'N/A')}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${quote.status}">${quote.status}</span></p>
            </div>
            <div class="detail-section full-width">
                <h4>Additional Information</h4>
                <p>${escapeHtml(quote.additional_info || 'No additional information provided')}</p>
            </div>
            <div class="detail-section full-width">
                <h4>Dates</h4>
                <p><strong>Requested:</strong> ${formatDateTime(quote.request_date)}</p>
                <p><strong>Last Updated:</strong> ${formatDateTime(quote.last_updated)}</p>
            </div>
        </div>
        ${data.notes && data.notes.length > 0 ? `
            <div class="detail-section full-width">
                <h4>Internal Notes</h4>
                ${data.notes.map(note => `
                    <div class="note-item">
                        <p><strong>${escapeHtml(note.author_name)}</strong> - ${formatDateTime(note.created_at)}</p>
                        <p>${escapeHtml(note.note_text)}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'flex';
    
    // Close modal handlers
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

let currentQuoteForUpdate = null;

function updateStatus(quoteId) {
    const quote = allQuotes.find(q => q.quote_id === quoteId);
    if (!quote) {
        showError('Quote not found');
        return;
    }
    
    currentQuoteForUpdate = quote;
    
    // Populate modal
    document.getElementById('quoteNumberDisplay').value = quote.quote_number;
    document.getElementById('currentStatusDisplay').value = quote.status.charAt(0).toUpperCase() + quote.status.slice(1);
    document.getElementById('newStatus').value = '';
    document.getElementById('statusNotes').value = '';
    
    // Show modal
    const modal = document.getElementById('updateStatusModal');
    modal.style.display = 'flex';
    
    // Setup close handlers
    const closeBtn = document.getElementById('closeStatusModal');
    const cancelBtn = document.getElementById('cancelStatusUpdate');
    
    const closeModal = () => {
        modal.style.display = 'none';
        currentQuoteForUpdate = null;
    };
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// Setup status update form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('updateStatusForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentQuoteForUpdate) return;
            
            const newStatus = document.getElementById('newStatus').value;
            const notes = document.getElementById('statusNotes').value.trim();
            
            if (!newStatus) {
                showError('Please select a new status');
                return;
            }
            
            if (newStatus === currentQuoteForUpdate.status) {
                showError('Please select a different status');
                return;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';
            
            const token = localStorage.getItem('adminToken');
            
            try {
                const response = await fetch(`/api/admin/quotes/${currentQuoteForUpdate.quote_id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        notes: notes || undefined
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update status');
                }
                
                showSuccess('Status updated successfully');
                
                // Close modal
                document.getElementById('updateStatusModal').style.display = 'none';
                currentQuoteForUpdate = null;
                
                // Reload quotes
                loadQuotes();
            } catch (error) {
                console.error('Error updating status:', error);
                showError('Failed to update status');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert(message);
}

// Made with Bob

// Setup Create Quote Button - Redirect to Quote Builder
function setupCreateQuoteModal() {
    const createBtn = document.getElementById('createQuoteBtn');
    
    // Redirect to quote builder instead of opening modal
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            window.location.href = 'quote-builder.html';
        });
    }
}
