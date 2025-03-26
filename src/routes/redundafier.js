const express = require('express');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');
const { sendDuplicateRequests } = require('../services/request');

const router = express.Router();

// Handle GET requests to /*
router.get('/*', express.json(), async (req, res, next) => {
    try {
        const fullPath = req.originalUrl;
        console.log('[REDUNDAFIER] Handling GET request:', fullPath);
        console.log('[REDUNDAFIER] Request headers:', req.headers);

        // Remove /api/redundafier prefix to get the original API path
        const originalPath = fullPath.replace(/^\/api\/redundafier/, '');
        console.log('[REDUNDAFIER] Original path:', originalPath);

        // Create headers for the request
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Forward authorization header if present
        if (req.headers.authorization) {
            headers.authorization = req.headers.authorization;
            console.log('[REDUNDAFIER] Forwarding authorization header');
        }

        // Send duplicate requests and get responses
        const responses = await sendDuplicateRequests(originalPath, headers, null, 'GET');
        
        // Bundle the responses
        const bundledResponse = {
            responses: responses.map((response, index) => ({
                requestNumber: index + 1,
                status: response.status,
                data: typeof response.data === 'string' ? JSON.parse(response.data) : response.data
            }))
        };

        console.log('[REDUNDAFIER] Bundled response:', JSON.stringify(bundledResponse, null, 2));
        
        res.json(bundledResponse);
    } catch (error) {
        console.error('[REDUNDAFIER] Error:', error);
        next(error);
    }
});

// Handle POST requests to /*
router.post('/*', express.json(), async (req, res, next) => {
    try {
        const fullPath = req.originalUrl;
        console.log('[REDUNDAFIER] Handling POST request:', fullPath);
        console.log('[REDUNDAFIER] Request headers:', req.headers);
        console.log('[REDUNDAFIER] Request body:', JSON.stringify(req.body, null, 2));

        // Remove /api/redundafier prefix to get the original API path
        const originalPath = fullPath.replace(/^\/api\/redundafier/, '');
        console.log('[REDUNDAFIER] Original path:', originalPath);

        // Create headers for the request
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Forward authorization header if present
        if (req.headers.authorization) {
            headers.authorization = req.headers.authorization;
            console.log('[REDUNDAFIER] Forwarding authorization header');
        }

        // Send duplicate requests and get responses
        const responses = await sendDuplicateRequests(originalPath, headers, req.body, 'POST');
        
        // Bundle the responses
        const bundledResponse = {
            responses: responses.map((response, index) => ({
                requestNumber: index + 1,
                status: response.status,
                data: typeof response.data === 'string' ? JSON.parse(response.data) : response.data
            }))
        };

        console.log('[REDUNDAFIER] Bundled response:', JSON.stringify(bundledResponse, null, 2));
        
        res.json(bundledResponse);
    } catch (error) {
        console.error('[REDUNDAFIER] Error:', error);
        next(error);
    }
});

module.exports = router; 