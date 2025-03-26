const express = require('express');
const { PORT } = require('./src/config/server');
const proxyMiddleware = require('./src/middleware/proxy');
const apiRoutes = require('./src/routes');

const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[SERVER] Incoming request: ${req.method} ${req.url}`);
    console.log(`[SERVER] Request headers:`, req.headers);
    console.log(`[SERVER] Request body:`, req.body);
    next();
});

// Add detailed error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Add request timeout
app.use((req, res, next) => {
    req.setTimeout(5000, () => {
        console.error('[SERVER] Request timeout');
        res.status(504).json({
            error: 'Gateway Timeout',
            message: 'Request took too long to process'
        });
    });
    next();
});

// Mount API routes
app.use('/api', apiRoutes);

// Use proxy as fallback for any unhandled API requests
app.use('/api', proxyMiddleware);

// Only start the server if this file is run directly (not required as a module)
// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[SERVER] Unhandled Rejection:', err);
});

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`[SERVER] Proxy server running on port ${PORT}`);
        console.log(`[SERVER] Intercepting POST requests to /api/upload/*`);
    });

    server.on('error', (err) => {
        console.error('[SERVER] Server error:', err);
    });

    server.on('close', () => {
        console.log('[SERVER] Server closed');
    });
}

// Export for testing
module.exports = app;
