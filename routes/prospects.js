const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateAdmin);

// GET /api/prospects - Get all prospect companies
router.get('/', async (req, res) => {
    try {
        const { stage, priority, search, assigned, page = 1, limit = 20 } = req.query;

        let query = 'SELECT * FROM prospect_pipeline WHERE 1=1';
        const params = [];

        if (stage) {
            query += ' AND current_stage = ?';
            params.push(stage);
        }

        if (priority) {
            query += ' AND priority = ?';
            params.push(priority);
        }

        if (assigned) {
            query += ' AND assigned_to_name = ?';
            params.push(assigned);
        }

        if (search) {
            query += ' AND (legal_name LIKE ? OR trade_name LIKE ? OR city LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY next_follow_up_date ASC, priority DESC';

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const prospects = await db.all(query, params);

        res.json({
            success: true,
            data: prospects
        });

    } catch (error) {
        console.error('Get prospects error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get prospects'
            }
        });
    }
});

// POST /api/prospects - Create new prospect company
router.post('/', [
    body('legalName').trim().notEmpty().withMessage('Legal name is required'),
    body('industry').optional().trim(),
    body('city').optional().trim(),
    body('email').optional().isEmail(),
    body('phone').optional().trim()
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

        const {
            legalName, tradeName, industry, companySize, website,
            address, city, postalCode, country, notes, source
        } = req.body;

        await db.run('BEGIN TRANSACTION');

        try {
            // Insert company
            const companyResult = await db.run(
                `INSERT INTO prospect_companies 
                 (legal_name, trade_name, industry, company_size, website, address, city, postal_code, country, notes, source, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [legalName, tradeName || null, industry || null, companySize || null, website || null,
                 address || null, city || null, postalCode || null, country || 'Slovakia', notes || null, source || null, req.admin.id]
            );

            // Create initial status
            await db.run(
                `INSERT INTO prospect_status (company_id, current_stage, assigned_to)
                 VALUES (?, 'new', ?)`,
                [companyResult.id, req.admin.id]
            );

            await db.run('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Prospect company created successfully',
                data: {
                    companyId: companyResult.id
                }
            });

        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Create prospect error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to create prospect'
            }
        });
    }
});

// GET /api/prospects/:id - Get prospect details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const prospect = await db.get(
            'SELECT * FROM prospect_pipeline WHERE company_id = ?',
            [id]
        );

        if (!prospect) {
            return res.status(404).json({
                error: {
                    message: 'Prospect not found'
                }
            });
        }

        // Get contacts
        const contacts = await db.all(
            'SELECT * FROM prospect_contacts WHERE company_id = ? ORDER BY is_primary DESC, full_name',
            [id]
        );

        // Get interactions
        const interactions = await db.all(
            `SELECT mi.*, au.full_name as admin_name, pc.full_name as contact_name
             FROM marketing_interactions mi
             JOIN admin_users au ON mi.admin_id = au.admin_id
             LEFT JOIN prospect_contacts pc ON mi.contact_id = pc.contact_id
             WHERE mi.company_id = ?
             ORDER BY mi.interaction_date DESC`,
            [id]
        );

        // Get status history
        const history = await db.all(
            `SELECT h.*, u.full_name as changed_by_name
             FROM prospect_status_history h
             JOIN admin_users u ON h.changed_by = u.admin_id
             WHERE h.company_id = ?
             ORDER BY h.changed_at DESC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                prospect,
                contacts,
                interactions,
                history
            }
        });

    } catch (error) {
        console.error('Get prospect details error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get prospect details'
            }
        });
    }
});

// PUT /api/prospects/:id/status - Update prospect status
router.put('/:id/status', [
    body('stage').isIn(['new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost', 'on_hold']).withMessage('Invalid stage'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
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
        const { stage, priority, estimatedValue, probability, expectedCloseDate, nextFollowUpDate, notes } = req.body;

        // Get current status
        const currentStatus = await db.get(
            'SELECT current_stage FROM prospect_status WHERE company_id = ?',
            [id]
        );

        if (!currentStatus) {
            return res.status(404).json({
                error: {
                    message: 'Prospect not found'
                }
            });
        }

        // Update status
        const updates = [];
        const params = [];

        if (stage) {
            updates.push('current_stage = ?');
            params.push(stage);
        }
        if (priority) {
            updates.push('priority = ?');
            params.push(priority);
        }
        if (estimatedValue !== undefined) {
            updates.push('estimated_value = ?');
            params.push(estimatedValue);
        }
        if (probability !== undefined) {
            updates.push('probability = ?');
            params.push(probability);
        }
        if (expectedCloseDate) {
            updates.push('expected_close_date = ?');
            params.push(expectedCloseDate);
        }
        if (nextFollowUpDate) {
            updates.push('next_follow_up_date = ?');
            params.push(nextFollowUpDate);
        }
        if (notes) {
            updates.push('status_notes = ?');
            params.push(notes);
        }

        updates.push("updated_at = datetime('now')");
        params.push(id);

        await db.run(
            `UPDATE prospect_status SET ${updates.join(', ')} WHERE company_id = ?`,
            params
        );

        // Add to history if stage changed
        if (stage && stage !== currentStatus.current_stage) {
            await db.run(
                `INSERT INTO prospect_status_history (company_id, old_stage, new_stage, changed_by, notes)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, currentStatus.current_stage, stage, req.admin.id, notes || null]
            );
        }

        res.json({
            success: true,
            message: 'Prospect status updated successfully'
        });

    } catch (error) {
        console.error('Update prospect status error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to update prospect status'
            }
        });
    }
});

// POST /api/prospects/:id/contacts - Add contact to prospect
router.post('/:id/contacts', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').optional().isEmail(),
    body('phone').optional().trim()
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
        const { fullName, jobTitle, jobRole, email, phone, mobile, linkedinUrl, isPrimary, notes } = req.body;

        // If setting as primary, unset other primary contacts
        if (isPrimary) {
            await db.run(
                'UPDATE prospect_contacts SET is_primary = 0 WHERE company_id = ?',
                [id]
            );
        }

        const result = await db.run(
            `INSERT INTO prospect_contacts 
             (company_id, full_name, job_title, job_role, email, phone, mobile, linkedin_url, is_primary, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, fullName, jobTitle || null, jobRole || null, email || null, phone || null, 
             mobile || null, linkedinUrl || null, isPrimary ? 1 : 0, notes || null]
        );

        res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            data: {
                contactId: result.id
            }
        });

    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to add contact'
            }
        });
    }
});

// POST /api/prospects/:id/interactions - Log interaction
router.post('/:id/interactions', [
    body('type').isIn(['email', 'call', 'meeting', 'demo', 'proposal', 'follow_up']).withMessage('Invalid interaction type'),
    body('subject').optional().trim(),
    body('description').optional().trim(),
    body('outcome').optional().isIn(['positive', 'neutral', 'negative', 'no_response', 'callback_requested'])
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
        const { type, contactId, subject, description, outcome, nextAction, nextActionDate } = req.body;

        const result = await db.run(
            `INSERT INTO marketing_interactions 
             (company_id, contact_id, interaction_type, subject, description, outcome, next_action, next_action_date, admin_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, contactId || null, type, subject || null, description || null, 
             outcome || null, nextAction || null, nextActionDate || null, req.admin.id]
        );

        // Update last contact date
        await db.run(
            `UPDATE prospect_status SET last_contact_date = datetime('now') WHERE company_id = ?`,
            [id]
        );

        res.status(201).json({
            success: true,
            message: 'Interaction logged successfully',
            data: {
                interactionId: result.id
            }
        });

    } catch (error) {
        console.error('Log interaction error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to log interaction'
            }
        });
    }
});

// GET /api/prospects/follow-ups/pending - Get prospects needing follow-up
router.get('/follow-ups/pending', async (req, res) => {
    try {
        const prospects = await db.all(
            'SELECT * FROM prospects_needing_follow_up LIMIT 50'
        );

        res.json({
            success: true,
            data: prospects
        });

    } catch (error) {
        console.error('Get follow-ups error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get follow-ups'
            }
        });
    }
});

// GET /api/prospects/stats/funnel - Get marketing funnel statistics
router.get('/stats/funnel', async (req, res) => {
    try {
        const stats = await db.all('SELECT * FROM marketing_funnel_stats');

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get funnel stats error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get funnel statistics'
            }
        });
    }
});

module.exports = router;

// Made with Bob
