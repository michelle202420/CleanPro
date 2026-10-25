// Admin Prospects CRM Management
let currentUser = null;
let allProspects = [];
let filteredProspects = [];
let allContacts = [];
let allInteractions = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load prospects
    loadProspects();
    
    // Setup filters and search
    setupFilters();
    
    // Setup modal handlers
    setupModals();
    
    // Setup logout
    setupLogout();
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

async function loadProspects() {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch('/api/prospects', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load prospects');
        }
        
        const result = await response.json();
        allProspects = result.data || [];
        filteredProspects = [...allProspects];
        renderProspects();
    } catch (error) {
        console.error('Error loading prospects:', error);
        // Don't show error if it's just empty data
        if (error.message !== 'Failed to load prospects') {
            console.log('No prospects available yet');
        }
    }
}

function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const industryFilter = document.getElementById('industryFilter');
    const searchInput = document.getElementById('searchProspects');
    
    statusFilter.addEventListener('change', applyFilters);
    industryFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const industryFilter = document.getElementById('industryFilter').value;
    const searchTerm = document.getElementById('searchProspects').value.toLowerCase();
    
    filteredProspects = allProspects.filter(prospect => {
        // Status filter
        if (statusFilter && prospect.status !== statusFilter) {
            return false;
        }
        
        // Industry filter
        if (industryFilter && prospect.industry !== industryFilter) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const searchableText = `
                ${prospect.legal_name}
                ${prospect.industry}
                ${prospect.location}
            `.toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderProspects();
}

function renderProspects() {
    const tbody = document.querySelector('#prospectsTable tbody');
    
    if (filteredProspects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No prospects found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredProspects.map(prospect => `
        <tr>
            <td><strong>${escapeHtml(prospect.legal_name)}</strong></td>
            <td>${escapeHtml(prospect.industry || '-')}</td>
            <td>${escapeHtml(prospect.location || '-')}</td>
            <td><span class="status-badge status-${prospect.status}">${prospect.status}</span></td>
            <td>${formatDate(prospect.last_contact_date || prospect.created_at)}</td>
            <td>
                <button class="btn-small" onclick="viewProspect(${prospect.id})">View</button>
                <button class="btn-small" onclick="addInteraction(${prospect.id})">Log Activity</button>
            </td>
        </tr>
    `).join('');
}

function setupModals() {
    // Add Prospect Modal
    const addProspectBtn = document.getElementById('addProspectBtn');
    const addProspectModal = document.getElementById('addProspectModal');
    const addProspectForm = document.getElementById('addProspectForm');
    
    addProspectBtn.addEventListener('click', () => {
        addProspectModal.style.display = 'block';
    });
    
    addProspectForm.addEventListener('submit', handleAddProspect);
    
    // Close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Click outside to close
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

async function handleAddProspect(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const prospectData = {
        legal_name: formData.get('legal_name'),
        industry: formData.get('industry'),
        company_size: formData.get('company_size'),
        location: formData.get('location'),
        website: formData.get('website'),
        notes: formData.get('notes')
    };
    
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch('/api/prospects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prospectData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add prospect');
        }
        
        showSuccess('Prospect added successfully');
        document.getElementById('addProspectModal').style.display = 'none';
        e.target.reset();
        loadProspects();
    } catch (error) {
        console.error('Error adding prospect:', error);
        showError('Failed to add prospect');
    }
}

async function viewProspect(prospectId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        // Load prospect details
        const prospectResponse = await fetch(`/api/prospects/${prospectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!prospectResponse.ok) {
            throw new Error('Failed to load prospect details');
        }
        
        const prospect = await prospectResponse.json();
        
        // Load contacts
        const contactsResponse = await fetch(`/api/prospects/${prospectId}/contacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const contacts = contactsResponse.ok ? await contactsResponse.json() : [];
        
        // Load interactions
        const interactionsResponse = await fetch(`/api/prospects/${prospectId}/interactions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const interactions = interactionsResponse.ok ? await interactionsResponse.json() : [];
        
        showProspectModal(prospect, contacts, interactions);
    } catch (error) {
        console.error('Error loading prospect:', error);
        showError('Failed to load prospect details');
    }
}

function showProspectModal(prospect, contacts, interactions) {
    const modal = document.getElementById('prospectModal');
    const modalContent = document.getElementById('prospectDetails');
    
    modalContent.innerHTML = `
        <h3>${escapeHtml(prospect.legal_name)}</h3>
        
        <div class="prospect-detail-grid">
            <div class="detail-section">
                <h4>Company Information</h4>
                <p><strong>Industry:</strong> ${escapeHtml(prospect.industry || '-')}</p>
                <p><strong>Size:</strong> ${escapeHtml(prospect.company_size || '-')}</p>
                <p><strong>Location:</strong> ${escapeHtml(prospect.location || '-')}</p>
                ${prospect.website ? `<p><strong>Website:</strong> <a href="${escapeHtml(prospect.website)}" target="_blank">${escapeHtml(prospect.website)}</a></p>` : ''}
            </div>
            
            <div class="detail-section">
                <h4>Status & Timeline</h4>
                <p><strong>Status:</strong> <span class="status-badge status-${prospect.status}">${prospect.status}</span></p>
                <p><strong>Added:</strong> ${formatDate(prospect.created_at)}</p>
                <p><strong>Last Contact:</strong> ${formatDate(prospect.last_contact_date || prospect.created_at)}</p>
                ${prospect.next_follow_up ? `<p><strong>Next Follow-up:</strong> ${formatDate(prospect.next_follow_up)}</p>` : ''}
            </div>
        </div>
        
        ${prospect.notes ? `
            <div class="detail-section full-width">
                <h4>Notes</h4>
                <p>${escapeHtml(prospect.notes)}</p>
            </div>
        ` : ''}
        
        <div class="detail-section full-width">
            <h4>Contacts (${contacts.length})</h4>
            ${contacts.length === 0 ? '<p>No contacts added yet.</p>' : `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Job Title</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contacts.map(contact => `
                            <tr>
                                <td><strong>${escapeHtml(contact.full_name)}</strong></td>
                                <td>${escapeHtml(contact.job_title || '-')}</td>
                                <td>${contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : '-'}</td>
                                <td>${contact.phone ? `<a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a>` : '-'}</td>
                                <td>${escapeHtml(contact.contact_role || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
            <button class="btn-small" onclick="addContact(${prospect.id})">Add Contact</button>
        </div>
        
        <div class="detail-section full-width">
            <h4>Recent Interactions (${interactions.length})</h4>
            ${interactions.length === 0 ? '<p>No interactions logged yet.</p>' : `
                <div class="interactions-list">
                    ${interactions.slice(0, 5).map(interaction => `
                        <div class="interaction-item">
                            <div class="interaction-header">
                                <strong>${escapeHtml(interaction.interaction_type)}</strong>
                                <span>${formatDateTime(interaction.interaction_date)}</span>
                            </div>
                            <p>${escapeHtml(interaction.notes || 'No notes')}</p>
                            ${interaction.outcome ? `<p><em>Outcome: ${escapeHtml(interaction.outcome)}</em></p>` : ''}
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
        
        <div class="modal-actions">
            <button class="btn-primary" onclick="updateProspectStatus(${prospect.id})">Update Status</button>
            <button class="btn-primary" onclick="addInteraction(${prospect.id})">Log Activity</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

async function updateProspectStatus(prospectId) {
    const prospect = allProspects.find(p => p.id === prospectId);
    if (!prospect) return;
    
    const newStatus = prompt(
        `Update status for ${prospect.legal_name}\n\nCurrent status: ${prospect.status}\n\nEnter new status (new/contacted/interested/proposal/negotiation/won/lost):`,
        prospect.status
    );
    
    if (!newStatus || newStatus === prospect.status) return;
    
    const validStatuses = ['new', 'contacted', 'interested', 'proposal', 'negotiation', 'won', 'lost'];
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        alert('Invalid status. Please use: new, contacted, interested, proposal, negotiation, won, or lost');
        return;
    }
    
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`/api/prospects/${prospectId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus.toLowerCase() })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        showSuccess('Status updated successfully');
        document.getElementById('prospectModal').style.display = 'none';
        loadProspects();
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to update status');
    }
}

function addContact(prospectId) {
    const modal = document.getElementById('addContactModal');
    const form = document.getElementById('addContactForm');
    
    // Set prospect ID in hidden field
    document.getElementById('contactProspectId').value = prospectId;
    
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const contactData = {
            full_name: formData.get('full_name'),
            job_title: formData.get('job_title'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            contact_role: formData.get('contact_role'),
            notes: formData.get('notes')
        };
        
        const token = localStorage.getItem('adminToken');
        
        try {
            const response = await fetch(`/api/prospects/${prospectId}/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add contact');
            }
            
            showSuccess('Contact added successfully');
            modal.style.display = 'none';
            form.reset();
            viewProspect(prospectId); // Refresh prospect view
        } catch (error) {
            console.error('Error adding contact:', error);
            showError('Failed to add contact');
        }
    };
}

function addInteraction(prospectId) {
    const modal = document.getElementById('addInteractionModal');
    const form = document.getElementById('addInteractionForm');
    
    // Set prospect ID in hidden field
    document.getElementById('interactionProspectId').value = prospectId;
    
    modal.style.display = 'block';
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const interactionData = {
            interaction_type: formData.get('interaction_type'),
            interaction_date: formData.get('interaction_date'),
            notes: formData.get('notes'),
            outcome: formData.get('outcome'),
            next_follow_up: formData.get('next_follow_up') || null
        };
        
        const token = localStorage.getItem('adminToken');
        
        try {
            const response = await fetch(`/api/prospects/${prospectId}/interactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interactionData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add interaction');
            }
            
            showSuccess('Interaction logged successfully');
            modal.style.display = 'none';
            form.reset();
            
            // Close prospect modal if open and reload prospects
            document.getElementById('prospectModal').style.display = 'none';
            loadProspects();
        } catch (error) {
            console.error('Error adding interaction:', error);
            showError('Failed to log interaction');
        }
    };
}

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
