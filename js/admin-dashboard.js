// Admin Dashboard Functionality
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load dashboard data
    loadDashboardStats();
    
    // Setup logout
    setupLogout();
    
    // Refresh data every 30 seconds
    setInterval(loadDashboardStats, 30000);
});

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verify token
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

async function loadDashboardStats() {
    const token = localStorage.getItem('adminToken');
    
    console.log('Loading dashboard stats...');
    
    try {
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Dashboard response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to load stats');
        }
        
        const result = await response.json();
        console.log('Dashboard data received:', result);
        const stats = result.data || result;
        console.log('Processed stats:', stats);
        updateDashboard(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load dashboard data');
    }
}

function updateDashboard(stats) {
    console.log('Updating dashboard with stats:', stats);
    
    // Update stat cards
    const statistics = stats.statistics || {};
    document.getElementById('totalQuotes').textContent = statistics.total_quotes || 0;
    document.getElementById('pendingQuotes').textContent = statistics.pending_quotes || 0;
    document.getElementById('contactedQuotes').textContent = statistics.contacted_quotes || 0;
    document.getElementById('acceptedQuotes').textContent = statistics.accepted_quotes || 0;
    document.getElementById('todayQuotes').textContent = statistics.today_quotes || 0;
    document.getElementById('weekQuotes').textContent = statistics.week_quotes || 0;
    
    // Update charts
    updateStatusChart(stats.quotesByStatus || []);
    updateServiceChart(stats.quotesByService || []);
    
    // Update recent quotes table
    console.log('Recent quotes to display:', stats.recentQuotes);
    updateRecentQuotes(stats.recentQuotes || []);
    
    // Update recent activity (if exists)
    if (stats.recentActivity) {
        updateRecentActivity(stats.recentActivity || []);
    }
}

function updateStatusChart(data) {
    const container = document.getElementById('statusChart');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No data available</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(item => item.count));
    const statusColors = {
        'pending': '#fbbf24',
        'contacted': '#60a5fa',
        'quoted': '#a78bfa',
        'accepted': '#34d399',
        'rejected': '#f87171',
        'completed': '#10b981'
    };
    
    const statusLabels = {
        'pending': 'Pending',
        'contacted': 'Contacted',
        'quoted': 'Quoted',
        'accepted': 'Accepted',
        'rejected': 'Rejected',
        'completed': 'Completed'
    };
    
    container.innerHTML = data.map(item => {
        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const color = statusColors[item.status] || '#94a3b8';
        const label = statusLabels[item.status] || item.status;
        
        return `
            <div class="chart-bar-item">
                <div class="chart-bar-label">
                    <span>${label}</span>
                    <span class="chart-bar-value">${item.count}</span>
                </div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function updateServiceChart(data) {
    const container = document.getElementById('serviceChart');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No data available</p>';
        return;
    }
    
    const maxCount = Math.max(...data.map(item => item.count));
    const serviceColors = {
        'office': '#3b82f6',
        'retail': '#8b5cf6',
        'residential': '#ec4899',
        'industrial': '#f59e0b',
        'other': '#6b7280'
    };
    
    const serviceLabels = {
        'office': 'Office Cleaning',
        'retail': 'Retail Cleaning',
        'residential': 'Residential',
        'industrial': 'Industrial',
        'other': 'Other'
    };
    
    container.innerHTML = data.map(item => {
        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const color = serviceColors[item.service_type] || '#94a3b8';
        const label = serviceLabels[item.service_type] || item.service_type;
        
        return `
            <div class="chart-bar-item">
                <div class="chart-bar-label">
                    <span>${label}</span>
                    <span class="chart-bar-value">${item.count}</span>
                </div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecentQuotes(quotes) {
    const tbody = document.getElementById('recentQuotesTable');
    
    if (!tbody) {
        console.error('Recent quotes table body not found');
        return;
    }
    
    if (!quotes || quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No recent quotes</td></tr>';
        return;
    }
    
    tbody.innerHTML = quotes.map(quote => `
        <tr>
            <td><a href="quotes.html?id=${quote.quote_id}">${quote.quote_number}</a></td>
            <td>${escapeHtml(quote.full_name || 'N/A')}${quote.company_name ? ' (' + escapeHtml(quote.company_name) + ')' : ''}</td>
            <td>${escapeHtml(quote.service_type)}</td>
            <td><span class="status-badge status-${quote.status}">${quote.status}</span></td>
            <td>${formatDate(quote.request_date)}</td>
            <td>
                <a href="quotes.html?id=${quote.quote_id}" class="btn btn-small">View</a>
            </td>
        </tr>
    `).join('');
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${getActivityIcon(activity.type)}</div>
            <div class="activity-content">
                <div class="activity-title">${escapeHtml(activity.title)}</div>
                <div class="activity-time">${formatRelativeTime(activity.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'quote': '📋',
        'customer': '👤',
        'prospect': '🎯',
        'interaction': '💬',
        'status_change': '🔄'
    };
    return icons[type] || '📌';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    // You can implement a toast notification or alert here
    console.error(message);
}

// Made with Bob
