const express = require('express');
const { sendDuplicateRequests } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');
const healthService = require('../services/health');

const router = express.Router();

// Health check middleware
const moddleware = (req, res, next) => {
    next();
};

// Handle POST requests to /upload/*
router.post('/*', express.raw({ type: '*/*' }), moddleware, async (req, res) => {
    const fullPath = req.originalUrl;
    console.log('Intercepted upload request to:', fullPath);
    
    try {
        // Send the same request twice
        const [response1, response2] = await sendDuplicateRequests(fullPath, req.headers, req.body);

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
