const express = require('express');
const { sendDuplicateRequests } = require('../services/request');

const router = express.Router();

/**
 * Error handler middleware
 * @param {Error} error - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const handleError = (error, req, res, next) => {
    console.error('[REDUNDAFIER] Error:', error);
    res.status(500).json({
        error: {
            message: error.message
        }
    });
};

/**
 * Parse response data if it's a JSON string
 * @param {any} data - The response data
 * @returns {any} - The parsed data or original data
 */
const parseResponseData = (data) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (error) {
            return data;
        }
    }
    return data;
};

/**
 * Handle all requests to the redundafier endpoint
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const handleRequest = async (req, res, next) => {
    try {
        console.log('[REDUNDAFIER] Handling', req.method, 'request:', req.originalUrl);
        console.log('[REDUNDAFIER] Request headers:', req.headers);

        // Extract path and authorization header
        const path = req.originalUrl.replace('/api/redundafier', '');
        console.log('[REDUNDAFIER] Original path:', path);

        // Prepare headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Forward authorization header if present
        if (req.headers.authorization) {
            console.log('[REDUNDAFIER] Forwarding authorization header');
            headers.authorization = req.headers.authorization;
        }

        // Send duplicate requests
        const responses = await sendDuplicateRequests(
            path,
            headers,
            req.method === 'GET' ? null : req.body,
            req.method
        );

        // Bundle responses
        const bundledResponse = {
            responses: responses.map((response, index) => ({
                requestNumber: index + 1,
                status: response.status,
                data: parseResponseData(response.data)
            }))
        };

        console.log('[REDUNDAFIER] Bundled response:', JSON.stringify(bundledResponse, null, 2));
        res.json(bundledResponse);
    } catch (error) {
        next(error);
    }
};

// Register routes
router.get('/*', handleRequest);
router.post('/*', handleRequest);

// Register error handler as the last middleware
router.use((err, req, res, next) => {
    console.error('[REDUNDAFIER] Error:', err);
    res.status(500).json({
        error: {
            message: err.message
        }
    });
});

module.exports = router; 