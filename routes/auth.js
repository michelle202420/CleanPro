const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');

// POST /api/auth/login - Admin login
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { username, password } = req.body;

        // Find admin user
        const admin = await db.get(
            'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (!admin) {
            return res.status(401).json({
                error: {
                    message: 'Invalid username or password'
                }
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: {
                    message: 'Invalid username or password'
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.admin_id,
                username: admin.username,
                role: admin.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.SESSION_EXPIRY || '24h' }
        );

        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create session
        await db.run(
            `INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
                admin.admin_id,
                token,
                req.ip || req.connection.remoteAddress,
                req.headers['user-agent'] || 'Unknown',
                expiresAt.toISOString()
            ]
        );

        // Update last login
        await db.run(
            `UPDATE admin_users SET last_login = datetime('now') WHERE admin_id = ?`,
            [admin.admin_id]
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        });

        // Return success
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    id: admin.admin_id,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.full_name,
                    role: admin.role
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: {
                message: 'Login failed. Please try again.'
            }
        });
    }
});

// POST /api/auth/logout - Admin logout
router.post('/logout', authenticateAdmin, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;

        if (token) {
            // Delete session
            await db.run(
                'DELETE FROM admin_sessions WHERE session_token = ?',
                [token]
            );
        }

        // Clear cookie
        res.clearCookie('token');

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: {
                message: 'Logout failed'
            }
        });
    }
});

// GET /api/auth/me - Get current admin user info
router.get('/me', authenticateAdmin, async (req, res) => {
    try {
        const admin = await db.get(
            `SELECT admin_id, username, email, full_name, role, last_login, created_at
             FROM admin_users
             WHERE admin_id = ?`,
            [req.admin.id]
        );

        if (!admin) {
            return res.status(404).json({
                error: {
                    message: 'Admin user not found'
                }
            });
        }

        res.json({
            success: true,
            data: admin
        });

    } catch (error) {
        console.error('Get admin info error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get admin information'
            }
        });
    }
});

// POST /api/auth/change-password - Change admin password
router.post('/change-password', [
    authenticateAdmin,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
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

        const { currentPassword, newPassword } = req.body;

        // Get admin with password
        const admin = await db.get(
            'SELECT password_hash FROM admin_users WHERE admin_id = ?',
            [req.admin.id]
        );

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: {
                    message: 'Current password is incorrect'
                }
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.run(
            `UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE admin_id = ?`,
            [newPasswordHash, req.admin.id]
        );

        // Invalidate all sessions except current
        const currentToken = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        await db.run(
            'DELETE FROM admin_sessions WHERE admin_id = ? AND session_token != ?',
            [req.admin.id, currentToken]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to change password'
            }
        });
    }
});

// GET /api/auth/verify - Verify JWT token
router.get('/verify', authenticateAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            valid: true,
            admin: {
                id: req.admin.id,
                username: req.admin.username,
                role: req.admin.role
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            valid: false,
            error: {
                message: 'Invalid or expired token'
            }
        });
    }
});

module.exports = router;

// Made with Bob
