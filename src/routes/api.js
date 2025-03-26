const express = require('express');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');
const { sendDuplicateRequests } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');

const router = express.Router();

// Handle uploads - POST requests to /api/upload/*
router.post('/upload/*', express.raw({ type: '*/*' }), async (req, res) => {
    const fullPath = req.originalUrl;
    console.log('[UPLOAD] Handling request:', fullPath);
    
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
        console.error('[UPLOAD] Error forwarding request:', error);
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to process upload request',
            details: error.message
        });
    }
});

// Handle atoms - GET requests to /api/atoms/*
router.get('/atoms/*', async (req, res) => {
    const fullPath = req.originalUrl;
    console.log('[ATOMS] Handling request:', fullPath);
    
    try {
        const baseUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;
        const targetUrl = new URL(req.originalUrl, baseUrl);
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: new URL(TARGET).host
            }
        });

        // Forward the response headers
        Object.entries(response.headers.raw()).forEach(([key, value]) => {
            res.set(key, value);
        });

        // Forward the response
        res.status(response.status);
        const data = await response.text();
        res.send(data);

    } catch (error) {
        console.error('[ATOMS] Error forwarding request:', error);
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to process atoms request',
            details: error.message
        });
    }
});

module.exports = router;
