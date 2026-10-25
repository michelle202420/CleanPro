const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateAdmin, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateAdmin);

// GET /api/admin/dashboard - Get dashboard statistics
// GET /api/admin/stats - Alias for dashboard (for compatibility)
router.get(['/dashboard', '/stats'], async (req, res) => {
    try {
        // Get statistics
        const stats = await db.get('SELECT * FROM quote_statistics');

        // Get recent quotes
        const recentQuotes = await db.all(
            `SELECT * FROM quote_requests_with_customer
             ORDER BY request_date DESC
             LIMIT 10`
        );

        // Get quotes by status
        const quotesByStatus = await db.all(
            `SELECT status, COUNT(*) as count
             FROM quote_requests
             GROUP BY status`
        );

        // Get quotes by service type
        const quotesByService = await db.all(
            `SELECT service_type, COUNT(*) as count
             FROM quote_requests
             GROUP BY service_type`
        );

        res.json({
            success: true,
            data: {
                statistics: stats,
                recentQuotes,
                quotesByStatus,
                quotesByService
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to load dashboard data'
            }
        });
    }
});

// GET /api/admin/quotes - Get all quotes with filters
router.get('/quotes', async (req, res) => {
    try {
        const { status, service, search, page = 1, limit = 20, sortBy = 'request_date', sortOrder = 'DESC' } = req.query;

        let query = 'SELECT * FROM quote_requests_with_customer WHERE 1=1';
        const params = [];

        // Apply filters
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (service) {
            query += ' AND service_type = ?';
            params.push(service);
        }

        if (search) {
            query += ' AND (full_name LIKE ? OR email LIKE ? OR company_name LIKE ? OR quote_number LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add sorting
        const validSortColumns = ['request_date', 'quote_number', 'status', 'full_name'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'request_date';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${order}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        // Get quotes
        const quotes = await db.all(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM quote_requests WHERE 1=1';
        const countParams = [];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (service) {
            countQuery += ' AND service_type = ?';
            countParams.push(service);
        }

        const { total } = await db.get(countQuery, countParams);

        res.json({
            success: true,
            data: {
                quotes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get quotes error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get quotes'
            }
        });
    }
});

// POST /api/admin/quotes - Create new quote manually
router.post('/quotes', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('serviceType').isIn(['office', 'retail', 'residential', 'industrial', 'other']).withMessage('Valid service type is required'),
    body('cleaningFrequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'one-time']),
    body('companyName').optional().trim(),
    body('additionalInfo').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { fullName, email, phone, serviceType, cleaningFrequency, companyName, additionalInfo } = req.body;

        // Create customer first
        const customerResult = await db.run(
            `INSERT INTO customers (full_name, email, phone, company_name)
             VALUES (?, ?, ?, ?)`,
            [fullName, email, phone, companyName || null]
        );

        // Generate quote number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await db.get('SELECT COUNT(*) as count FROM quote_requests WHERE DATE(request_date) = DATE("now")');
        const quoteNumber = `QT-${dateStr}-${String(count.count + 1).padStart(4, '0')}`;

        // Create quote request
        const quoteResult = await db.run(
            `INSERT INTO quote_requests (
                quote_number, customer_id, service_type, cleaning_frequency,
                additional_info, status, assigned_to
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
            [quoteNumber, customerResult.id, serviceType, cleaningFrequency || null, additionalInfo || null, req.admin.id]
        );

        // Add initial status history
        await db.run(
            `INSERT INTO quote_status_history (quote_id, old_status, new_status, changed_by, notes)
             VALUES (?, NULL, 'pending', ?, 'Quote created manually by admin')`,
            [quoteResult.id, req.admin.id]
        );

        // Get the created quote with customer info
        const newQuote = await db.get(
            'SELECT * FROM quote_requests_with_customer WHERE quote_id = ?',
            [quoteResult.id]
        );

        res.status(201).json({
            success: true,
            message: 'Quote created successfully',
            data: newQuote
        });

    } catch (error) {
        console.error('Create quote error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to create quote'
            }
        });
    }
});

// GET /api/admin/quotes/:id - Get single quote details
router.get('/quotes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get quote with customer info
        const quote = await db.get(
            'SELECT * FROM quote_requests_with_customer WHERE quote_id = ?',
            [id]
        );

        if (!quote) {
            return res.status(404).json({
                error: {
                    message: 'Quote not found'
                }
            });
        }

        // Get notes
        const notes = await db.all(
            `SELECT n.*, u.full_name as author_name
             FROM quote_notes n
             JOIN admin_users u ON n.admin_id = u.admin_id
             WHERE n.quote_id = ?
             ORDER BY n.created_at DESC`,
            [id]
        );

        // Get status history
        const history = await db.all(
            `SELECT h.*, u.full_name as changed_by_name
             FROM quote_status_history h
             JOIN admin_users u ON h.changed_by = u.admin_id
             WHERE h.quote_id = ?
             ORDER BY h.changed_at DESC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                quote,
                notes,
                history
            }
        });

    } catch (error) {
        console.error('Get quote error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get quote details'
            }
        });
    }
});

// PUT /api/admin/quotes/:id/status - Update quote status
router.put('/quotes/:id/status', [
    body('status').isIn(['pending', 'contacted', 'quoted', 'accepted', 'rejected', 'completed']).withMessage('Invalid status'),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { id } = req.params;
        const { status, notes } = req.body;

        // Get current status
        const quote = await db.get(
            'SELECT status FROM quote_requests WHERE quote_id = ?',
            [id]
        );

        if (!quote) {
            return res.status(404).json({
                error: {
                    message: 'Quote not found'
                }
            });
        }

        // Update status
        await db.run(
            `UPDATE quote_requests 
             SET status = ?, last_updated = datetime('now')
             WHERE quote_id = ?`,
            [status, id]
        );

        // Add to history
        await db.run(
            `INSERT INTO quote_status_history (quote_id, old_status, new_status, changed_by, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [id, quote.status, status, req.admin.id, notes || null]
        );

        res.json({
            success: true,
            message: 'Quote status updated successfully'
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to update quote status'
            }
        });
    }
});

// PUT /api/admin/quotes/:id/assign - Assign quote to admin
router.put('/quotes/:id/assign', [
    body('adminId').isInt().withMessage('Valid admin ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { id } = req.params;
        const { adminId } = req.body;

        // Verify admin exists
        const admin = await db.get(
            'SELECT admin_id FROM admin_users WHERE admin_id = ? AND is_active = 1',
            [adminId]
        );

        if (!admin) {
            return res.status(404).json({
                error: {
                    message: 'Admin user not found'
                }
            });
        }

        // Update assignment
        await db.run(
            `UPDATE quote_requests 
             SET assigned_to = ?, last_updated = datetime('now')
             WHERE quote_id = ?`,
            [adminId, id]
        );

        res.json({
            success: true,
            message: 'Quote assigned successfully'
        });

    } catch (error) {
        console.error('Assign quote error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to assign quote'
            }
        });
    }
});

// POST /api/admin/quotes/:id/notes - Add note to quote
router.post('/quotes/:id/notes', [
    body('note').trim().notEmpty().withMessage('Note text is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { id } = req.params;
        const { note } = req.body;

        // Verify quote exists
        const quote = await db.get(
            'SELECT quote_id FROM quote_requests WHERE quote_id = ?',
            [id]
        );

        if (!quote) {
            return res.status(404).json({
                error: {
                    message: 'Quote not found'
                }
            });
        }

        // Add note
        const result = await db.run(
            `INSERT INTO quote_notes (quote_id, admin_id, note_text)
             VALUES (?, ?, ?)`,
            [id, req.admin.id, note]
        );

        // Get the created note with author info
        const createdNote = await db.get(
            `SELECT n.*, u.full_name as author_name
             FROM quote_notes n
             JOIN admin_users u ON n.admin_id = u.admin_id
             WHERE n.note_id = ?`,
            [result.id]
        );

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: createdNote
        });

    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to add note'
            }
        });
    }
});

// GET /api/admin/customers - Get all customers
router.get('/customers', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;

        let query = 'SELECT * FROM customers WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (full_name LIKE ? OR email LIKE ? OR company_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const customers = await db.all(query, params);

        // Get quote count for each customer
        for (let customer of customers) {
            const { count } = await db.get(
                'SELECT COUNT(*) as count FROM quote_requests WHERE customer_id = ?',
                [customer.customer_id]
            );
            customer.quote_count = count;
        }

        res.json({
            success: true,
            data: customers
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get customers'
            }
        });
    }
});

// GET /api/admin/users - Get all admin users (admin only)
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const users = await db.all(
            `SELECT admin_id, username, email, full_name, role, is_active, last_login, created_at
             FROM admin_users
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get admin users'
            }
        });
    }
});

module.exports = router;

// Made with Bob
