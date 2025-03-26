const express = require('express');
const uploadRoutes = require('./upload');
const atomsRoutes = require('./atoms');

const router = express.Router();

// Global router error handler
const errorHandler = (err, req, res, next) => {
    console.error('[ROUTER] Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

// Mount route handlers with error handling
router.use('/upload', (req, res, next) => {
    console.log('[ROUTER] Upload request:', req.method, req.url);
    uploadRoutes(req, res, err => err ? next(err) : next());
});

router.use('/atoms', (req, res, next) => {
    console.log('[ROUTER] Atoms request:', req.method, req.url);
    atomsRoutes(req, res, err => err ? next(err) : next());
});

// Add error handler last
router.use(errorHandler);

module.exports = router;
