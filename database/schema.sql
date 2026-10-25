-- CleanPro Quote Management System Database Schema
-- SQLite Database

-- Table: customers
-- Stores customer information (allows duplicate emails for multiple quotes)
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: quote_requests
-- Stores all quote requests with unique quote numbers
CREATE TABLE IF NOT EXISTS quote_requests (
    quote_id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number VARCHAR(50) UNIQUE NOT NULL, -- Format: QT-YYYYMMDD-XXXX
    customer_id INTEGER NOT NULL,
    service_type VARCHAR(100) NOT NULL, -- office, retail, other
    cleaning_frequency VARCHAR(50), -- daily, weekly, biweekly, monthly, one-time
    additional_info TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, quoted, accepted, rejected, completed
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to INTEGER, -- admin user who handles this quote
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    privacy_consent BOOLEAN DEFAULT 1,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (assigned_to) REFERENCES admin_users(admin_id)
);

-- Table: admin_users
-- Stores admin user accounts for dashboard access
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed password
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, manager, viewer
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: quote_notes
-- Internal notes for each quote request
CREATE TABLE IF NOT EXISTS quote_notes (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quote_requests(quote_id),
    FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

-- Table: quote_status_history
-- Track status changes for audit trail
CREATE TABLE IF NOT EXISTS quote_status_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (quote_id) REFERENCES quote_requests(quote_id),
    FOREIGN KEY (changed_by) REFERENCES admin_users(admin_id)
);

-- Table: admin_sessions
-- Track admin login sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer ON quote_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_date ON quote_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_quote_number ON quote_requests(quote_number);
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(session_token);

-- Insert default admin user (password: Admin123!)
-- Password hash for 'Admin123!' using bcrypt
INSERT INTO admin_users (username, email, password_hash, full_name, role) 
VALUES (
    'admin',
    'admin@cleanpro.sk',
    '$2b$10$rQZ9vXqKX8YxKxKxKxKxKOqKxKxKxKxKxKxKxKxKxKxKxKxKxKxKx', -- This will be replaced with actual hash
    'System Administrator',
    'admin'
);

-- Views for easier querying

-- View: quote_requests_with_customer
CREATE VIEW IF NOT EXISTS quote_requests_with_customer AS
SELECT 
    qr.quote_id,
    qr.quote_number,
    qr.service_type,
    qr.cleaning_frequency,
    qr.additional_info,
    qr.status,
    qr.priority,
    qr.request_date,
    qr.last_updated,
    c.customer_id,
    c.full_name,
    c.company_name,
    c.email,
    c.phone,
    au.full_name as assigned_to_name
FROM quote_requests qr
JOIN customers c ON qr.customer_id = c.customer_id
LEFT JOIN admin_users au ON qr.assigned_to = au.admin_id;

-- View: quote_statistics
CREATE VIEW IF NOT EXISTS quote_statistics AS
SELECT 
    COUNT(*) as total_quotes,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_quotes,
    COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_quotes,
    COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted_quotes,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_quotes,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_quotes,
    COUNT(CASE WHEN DATE(request_date) = DATE('now') THEN 1 END) as today_quotes,
    COUNT(CASE WHEN DATE(request_date) >= DATE('now', '-7 days') THEN 1 END) as week_quotes,
    COUNT(CASE WHEN DATE(request_date) >= DATE('now', '-30 days') THEN 1 END) as month_quotes
FROM quote_requests;

-- Made with Bob
