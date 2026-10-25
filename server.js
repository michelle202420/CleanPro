
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Start the HTTP server
const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   CleanPro Backend Server                             ║
║                                                       ║
║   Server running on: http://localhost:${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║                                                       ║
║   API Endpoints:                                      ║
║   - POST /api/quotes/submit                          ║
║   - POST /api/auth/login                             ║
║   - GET  /api/admin/dashboard                        ║
║                                                       ║
║   Admin Dashboard: http://localhost:${PORT}/admin    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');

    server.close((err) => {
        if (err) {
            console.error('Error closing HTTP server:', err);
            process.exitCode = 1;
            return;
        }

        console.log('HTTP server closed');
    });
});

