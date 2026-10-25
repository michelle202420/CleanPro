const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Verify JWT token and authenticate admin user
async function authenticateAdmin(req, res, next) {
    try {
        // Get token from header or cookie
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;

        if (!token) {
            return res.status(401).json({
                error: {
                    message: 'Authentication required'
                }
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session exists and is valid
        const session = await db.get(
            `SELECT s.*, u.username, u.email, u.full_name, u.role, u.is_active
             FROM admin_sessions s
             JOIN admin_users u ON s.admin_id = u.admin_id
             WHERE s.session_token = ? AND s.expires_at > datetime('now')`,
            [token]
        );

        if (!session) {
            return res.status(401).json({
                error: {
                    message: 'Invalid or expired session'
                }
            });
        }

        if (!session.is_active) {
            return res.status(403).json({
                error: {
                    message: 'Account is disabled'
                }
            });
        }

        // Attach user info to request
        req.admin = {
            id: session.admin_id,
            username: session.username,
            email: session.email,
            fullName: session.full_name,
            role: session.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: {
                    message: 'Invalid token'
                }
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: {
                    message: 'Token expired'
                }
            });
        }
        console.error('Authentication error:', error);
        res.status(500).json({
            error: {
                message: 'Authentication failed'
            }
        });
    }
}

// Check if user has required role
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                error: {
                    message: 'Authentication required'
                }
            });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({
                error: {
                    message: 'Insufficient permissions'
                }
            });
        }

        next();
    };
}

module.exports = {
    authenticateAdmin,
    requireRole
};

// Made with Bob
