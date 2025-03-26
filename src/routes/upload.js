const express = require('express');
const { sendDuplicateRequests } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');
const healthService = require('../services/health');
const { TARGET } = require('../config/server');

const router = express.Router();

// Health check middleware
const healthCheckMiddleware = (req, res, next) => {
    healthService.checkHealth();
    const isServerUp = healthService.isServerUp;
    if (!isServerUp) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: `Target server ${TARGET} is currently unreachable`,
            lastCheck: healthService.lastCheck.toISOString()
        });
    }
    next();
};

// Handle POST requests to /upload/*
router.post('/*', express.raw({ type: '*/*' }), healthCheckMiddleware, async (req, res) => {
    const fullPath = req.originalUrl;
    console.log('Intercepted upload request to:', fullPath);
    
    try {
        // Send the same request twice
        const [response1, response2] = await sendDuplicateRequests(fullPath, req.headers, req.body);

        console.log(response1)
        console.log(response2)

        if (response1.type === 'json' && response2.type === 'json') {
            // For JSON responses, combine them into an array with metadata
            const combinedData = formatJsonResponses(response1, response2);
            res.json(combinedData);
        } else {
            // For non-JSON responses, send the first response
            setResponseHeaders(res, response1.headers);
            res.status(response1.status);
            res.send(response1.data);
        }
    } catch (error) {
        console.error('Error forwarding upload request:', error);
        healthService.checkHealth(); // Trigger immediate health check on error
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to process upload request',
            details: error.message
        });
    }
});

module.exports = router;
