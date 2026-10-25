-- CleanPro Marketing/Prospecting CRM Extension
-- Add these tables to track companies you contact for marketing purposes

-- Table: prospect_companies
-- Stores companies you're targeting for marketing
CREATE TABLE IF NOT EXISTS prospect_companies (
    company_id INTEGER PRIMARY KEY AUTOINCREMENT,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255), -- If different from legal name
    industry VARCHAR(100),
    company_size VARCHAR(50), -- small, medium, large, enterprise
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Slovakia',
    notes TEXT,
    source VARCHAR(100), -- How you found them: referral, cold_call, website, linkedin, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_users(admin_id)
);

-- Table: prospect_contacts
-- Stores individual contacts within prospect companies
CREATE TABLE IF NOT EXISTS prospect_contacts (
    contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100),
    job_role VARCHAR(100), -- decision_maker, influencer, gatekeeper, user
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    linkedin_url VARCHAR(255),
    is_primary BOOLEAN DEFAULT 0, -- Primary contact for this company
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE
);

-- Table: marketing_interactions
-- Track all interactions with prospects
CREATE TABLE IF NOT EXISTS marketing_interactions (
    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    contact_id INTEGER, -- Optional: specific contact involved
    interaction_type VARCHAR(50) NOT NULL, -- email, call, meeting, demo, proposal, follow_up
    interaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subject VARCHAR(255),
    description TEXT,
    outcome VARCHAR(50), -- positive, neutral, negative, no_response, callback_requested
    next_action VARCHAR(255), -- What to do next
    next_action_date DATE, -- When to follow up
    admin_id INTEGER NOT NULL, -- Who made the contact
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES prospect_contacts(contact_id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

-- Table: prospect_status
-- Track the sales pipeline status of each prospect
CREATE TABLE IF NOT EXISTS prospect_status (
    status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE,
    current_stage VARCHAR(50) DEFAULT 'new', -- new, contacted, interested, proposal_sent, negotiation, won, lost, on_hold
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    estimated_value DECIMAL(10,2), -- Estimated monthly/annual contract value
    probability INTEGER DEFAULT 0, -- 0-100% chance of closing
    expected_close_date DATE,
    assigned_to INTEGER, -- Admin responsible for this prospect
    last_contact_date DATETIME,
    next_follow_up_date DATE,
    status_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES admin_users(admin_id)
);

-- Table: prospect_status_history
-- Track changes in prospect status for pipeline analysis
CREATE TABLE IF NOT EXISTS prospect_status_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    old_stage VARCHAR(50),
    new_stage VARCHAR(50) NOT NULL,
    changed_by INTEGER NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES admin_users(admin_id)
);

-- Table: marketing_campaigns
-- Track marketing campaigns and their effectiveness
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    campaign_id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50), -- email, cold_call, linkedin, event, referral
    start_date DATE,
    end_date DATE,
    target_audience TEXT,
    message TEXT,
    budget DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(admin_id)
);

-- Table: campaign_prospects
-- Link prospects to marketing campaigns
CREATE TABLE IF NOT EXISTS campaign_prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    contacted_date DATETIME,
    response_received BOOLEAN DEFAULT 0,
    response_type VARCHAR(50), -- interested, not_interested, callback, no_response
    notes TEXT,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE,
    UNIQUE(campaign_id, company_id)
);

-- Table: prospect_documents
-- Store documents related to prospects (proposals, contracts, etc.)
CREATE TABLE IF NOT EXISTS prospect_documents (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    document_type VARCHAR(50), -- proposal, contract, presentation, quote
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (company_id) REFERENCES prospect_companies(company_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES admin_users(admin_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_companies_legal_name ON prospect_companies(legal_name);
CREATE INDEX IF NOT EXISTS idx_prospect_companies_city ON prospect_companies(city);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_company ON prospect_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_email ON prospect_contacts(email);
CREATE INDEX IF NOT EXISTS idx_marketing_interactions_company ON marketing_interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_marketing_interactions_date ON marketing_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_prospect_status_stage ON prospect_status(current_stage);
CREATE INDEX IF NOT EXISTS idx_prospect_status_assigned ON prospect_status(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospect_status_follow_up ON prospect_status(next_follow_up_date);

-- Views for easier querying

-- View: prospect_pipeline
CREATE VIEW IF NOT EXISTS prospect_pipeline AS
SELECT 
    pc.company_id,
    pc.legal_name,
    pc.trade_name,
    pc.industry,
    pc.city,
    ps.current_stage,
    ps.priority,
    ps.estimated_value,
    ps.probability,
    ps.expected_close_date,
    ps.last_contact_date,
    ps.next_follow_up_date,
    au.full_name as assigned_to_name,
    COUNT(DISTINCT pcon.contact_id) as contact_count,
    COUNT(DISTINCT mi.interaction_id) as interaction_count,
    MAX(mi.interaction_date) as last_interaction_date
FROM prospect_companies pc
LEFT JOIN prospect_status ps ON pc.company_id = ps.company_id
LEFT JOIN admin_users au ON ps.assigned_to = au.admin_id
LEFT JOIN prospect_contacts pcon ON pc.company_id = pcon.company_id
LEFT JOIN marketing_interactions mi ON pc.company_id = mi.company_id
GROUP BY pc.company_id;

-- View: prospects_needing_follow_up
CREATE VIEW IF NOT EXISTS prospects_needing_follow_up AS
SELECT 
    pc.company_id,
    pc.legal_name,
    ps.current_stage,
    ps.priority,
    ps.next_follow_up_date,
    ps.last_contact_date,
    au.full_name as assigned_to_name,
    au.email as assigned_to_email
FROM prospect_companies pc
JOIN prospect_status ps ON pc.company_id = ps.company_id
LEFT JOIN admin_users au ON ps.assigned_to = au.admin_id
WHERE ps.next_follow_up_date <= DATE('now', '+7 days')
  AND ps.current_stage NOT IN ('won', 'lost')
ORDER BY ps.next_follow_up_date ASC;

-- View: marketing_funnel_stats
CREATE VIEW IF NOT EXISTS marketing_funnel_stats AS
SELECT 
    current_stage,
    COUNT(*) as count,
    SUM(estimated_value) as total_value,
    AVG(probability) as avg_probability,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
    COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count
FROM prospect_status
WHERE current_stage NOT IN ('won', 'lost')
GROUP BY current_stage;

-- View: prospect_activity_summary
CREATE VIEW IF NOT EXISTS prospect_activity_summary AS
SELECT 
    pc.company_id,
    pc.legal_name,
    COUNT(DISTINCT mi.interaction_id) as total_interactions,
    COUNT(DISTINCT CASE WHEN mi.interaction_type = 'email' THEN mi.interaction_id END) as email_count,
    COUNT(DISTINCT CASE WHEN mi.interaction_type = 'call' THEN mi.interaction_id END) as call_count,
    COUNT(DISTINCT CASE WHEN mi.interaction_type = 'meeting' THEN mi.interaction_id END) as meeting_count,
    MAX(mi.interaction_date) as last_interaction,
    MIN(mi.interaction_date) as first_interaction,
    JULIANDAY(MAX(mi.interaction_date)) - JULIANDAY(MIN(mi.interaction_date)) as days_in_pipeline
FROM prospect_companies pc
LEFT JOIN marketing_interactions mi ON pc.company_id = mi.company_id
GROUP BY pc.company_id;

-- View: campaign_performance
CREATE VIEW IF NOT EXISTS campaign_performance AS
SELECT 
    mc.campaign_id,
    mc.campaign_name,
    mc.campaign_type,
    mc.status,
    COUNT(cp.company_id) as total_prospects,
    COUNT(CASE WHEN cp.contacted_date IS NOT NULL THEN 1 END) as contacted_count,
    COUNT(CASE WHEN cp.response_received = 1 THEN 1 END) as response_count,
    COUNT(CASE WHEN cp.response_type = 'interested' THEN 1 END) as interested_count,
    ROUND(COUNT(CASE WHEN cp.response_received = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN cp.contacted_date IS NOT NULL THEN 1 END), 0), 2) as response_rate
FROM marketing_campaigns mc
LEFT JOIN campaign_prospects cp ON mc.campaign_id = cp.campaign_id
GROUP BY mc.campaign_id;

-- Made with Bob
