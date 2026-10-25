const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

// Generate unique quote number
function generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `QT-${year}${month}${day}-${random}`;
}

// POST /api/quotes/submit - Submit a new quote request
router.post('/submit', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('service').isIn(['office', 'retail', 'other']).withMessage('Valid service type is required'),
    body('frequency').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly', 'one-time']),
    body('company').optional().trim(),
    body('message').optional().trim(),
    body('privacyConsent').equals('true').withMessage('Privacy consent is required')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { name, email, phone, service, frequency, company, message, privacyConsent } = req.body;

        // Start transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Insert or get customer
            let customer = await db.get(
                'SELECT customer_id FROM customers WHERE email = ? AND full_name = ?',
                [email, name]
            );

            let customerId;
            if (customer) {
                customerId = customer.customer_id;
                // Update customer info
                await db.run(
                    `UPDATE customers 
                     SET company_name = ?, phone = ?, updated_at = datetime('now')
                     WHERE customer_id = ?`,
                    [company || null, phone, customerId]
                );
            } else {
                // Insert new customer
                const result = await db.run(
                    `INSERT INTO customers (full_name, company_name, email, phone)
                     VALUES (?, ?, ?, ?)`,
                    [name, company || null, email, phone]
                );
                customerId = result.id;
            }

            // Generate unique quote number
            let quoteNumber;
            let attempts = 0;
            while (attempts < 10) {
                quoteNumber = generateQuoteNumber();
                const existing = await db.get(
                    'SELECT quote_id FROM quote_requests WHERE quote_number = ?',
                    [quoteNumber]
                );
                if (!existing) break;
                attempts++;
            }

            if (attempts >= 10) {
                throw new Error('Failed to generate unique quote number');
            }

            // Insert quote request
            const quoteResult = await db.run(
                `INSERT INTO quote_requests 
                 (quote_number, customer_id, service_type, cleaning_frequency, additional_info, privacy_consent)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [quoteNumber, customerId, service, frequency || null, message || null, privacyConsent === 'true' ? 1 : 0]
            );

            // Commit transaction
            await db.run('COMMIT');

            // Return success response
            res.status(201).json({
                success: true,
                message: 'Quote request submitted successfully',
                data: {
                    quoteNumber: quoteNumber,
                    quoteId: quoteResult.id,
                    customerId: customerId
                }
            });

        } catch (error) {
            // Rollback on error
            await db.run('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error submitting quote:', error);
        res.status(500).json({
            error: {
                message: 'Failed to submit quote request. Please try again later.'
            }
        });
    }
});

// GET /api/quotes/check/:quoteNumber - Check quote status (public endpoint)
router.get('/check/:quoteNumber', async (req, res) => {
    try {
        const { quoteNumber } = req.params;

        const quote = await db.get(
            `SELECT 
                qr.quote_number,
                qr.status,
                qr.request_date,
                qr.service_type,
                qr.cleaning_frequency
             FROM quote_requests qr
             WHERE qr.quote_number = ?`,
            [quoteNumber]
        );

        if (!quote) {
            return res.status(404).json({
                error: {
                    message: 'Quote not found'
                }
            });
        }

        res.json({
            success: true,
            data: quote
        });

    } catch (error) {
        console.error('Error checking quote:', error);
        res.status(500).json({
            error: {
                message: 'Failed to check quote status'
            }
        });
    }
});

module.exports = router;

// Made with Bob
