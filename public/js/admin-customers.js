// Admin Customers Management
let currentUser = null;
let allCustomers = [];
let filteredCustomers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load customers
    loadCustomers();
    
    // Setup search
    setupSearch();
    
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

async function loadCustomers() {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch('/api/admin/customers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load customers');
        }
        
        const result = await response.json();
        allCustomers = result.data || [];
        filteredCustomers = [...allCustomers];
        renderCustomers();
    } catch (error) {
        console.error('Error loading customers:', error);
        // Don't show error if it's just empty data
        if (error.message !== 'Failed to load customers') {
            console.log('No customers available yet');
        }
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', applySearch);
    }
}

function applySearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (!searchTerm) {
        filteredCustomers = [...allCustomers];
    } else {
        filteredCustomers = allCustomers.filter(customer => {
            const searchableText = `
                ${customer.full_name || ''}
                ${customer.company_name || ''}
                ${customer.email || ''}
                ${customer.phone || ''}
            `.toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    renderCustomers();
}

function renderCustomers() {
    const tbody = document.getElementById('customersTable');
    
    if (!tbody) {
        console.error('Customers table not found');
        return;
    }
    
    if (filteredCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredCustomers.map(customer => `
        <tr>
            <td><strong>${escapeHtml(customer.full_name || 'N/A')}</strong></td>
            <td>${escapeHtml(customer.company_name || 'N/A')}</td>
            <td>${escapeHtml(customer.email || 'N/A')}</td>
            <td>${escapeHtml(customer.phone || 'N/A')}</td>
            <td>${customer.quote_count || 0}</td>
            <td>${formatDate(customer.created_at)}</td>
            <td>
                <button class="btn btn-small" onclick="viewCustomer(${customer.customer_id})">View</button>
            </td>
        </tr>
    `).join('');
}

async function viewCustomer(customerId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`/api/admin/customers/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load customer details');
        }
        
        const customer = await response.json();
        showCustomerModal(customer);
    } catch (error) {
        console.error('Error loading customer:', error);
        showError('Failed to load customer details');
    }
}

function showCustomerModal(customer) {
    const modal = document.getElementById('customerModal');
    const modalContent = document.getElementById('customerDetails');
    
    modalContent.innerHTML = `
        <h3>${escapeHtml(customer.company_name)}</h3>
        <div class="customer-detail-grid">
            <div class="detail-section">
                <h4>Contact Information</h4>
                <p><strong>Contact Name:</strong> ${escapeHtml(customer.contact_name)}</p>
                <p><strong>Email:</strong> <a href="mailto:${escapeHtml(customer.email)}">${escapeHtml(customer.email)}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${escapeHtml(customer.phone)}">${escapeHtml(customer.phone)}</a></p>
            </div>
            <div class="detail-section">
                <h4>Statistics</h4>
                <p><strong>Total Quotes:</strong> ${customer.total_quotes || 0}</p>
                <p><strong>Accepted Quotes:</strong> ${customer.accepted_quotes || 0}</p>
                <p><strong>Customer Since:</strong> ${formatDate(customer.created_at)}</p>
                <p><strong>Last Contact:</strong> ${formatDate(customer.last_contact_date || customer.created_at)}</p>
            </div>
        </div>
        ${customer.notes ? `
            <div class="detail-section full-width">
                <h4>Notes</h4>
                <p>${escapeHtml(customer.notes)}</p>
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

async function viewQuotes(customerId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`/api/admin/customers/${customerId}/quotes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load customer quotes');
        }
        
        const quotes = await response.json();
        showQuotesModal(quotes, customerId);
    } catch (error) {
        console.error('Error loading quotes:', error);
        showError('Failed to load customer quotes');
    }
}

function showQuotesModal(quotes, customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    const modal = document.getElementById('customerModal');
    const modalContent = document.getElementById('customerDetails');
    
    modalContent.innerHTML = `
        <h3>Quotes for ${escapeHtml(customer.company_name)}</h3>
        ${quotes.length === 0 ? '<p>No quotes found for this customer.</p>' : `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Quote Number</th>
                        <th>Service Type</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${quotes.map(quote => `
                        <tr>
                            <td><strong>${escapeHtml(quote.quote_number)}</strong></td>
                            <td>${escapeHtml(quote.service_type)}</td>
                            <td><span class="status-badge status-${quote.status}">${quote.status}</span></td>
                            <td>${formatDate(quote.created_at)}</td>
                            <td>
                                <a href="quotes.html?id=${quote.id}" class="btn-small">View</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `}
    `;
    
    modal.style.display = 'block';
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert('Error: ' + message);
}

// Made with Bob
