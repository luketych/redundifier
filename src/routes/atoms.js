const express = require('express');
const http = require('http');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');
const { sendRequest } = require('../services/request');

const router = express.Router();

// Handle GET requests to /*
router.get('/*', async (req, res, next) => {
    try {
        const fullPath = req.originalUrl;
        console.log('[ATOMS] Handling GET request:', fullPath);
        console.log('[ATOMS] Request headers:', req.headers);

        const baseUrl = process.env.IS_DOCKER_INTERNAL === 'true' ? 'http://host.docker.internal:1337' : TARGET;
        // For Strapi API, we need to use /api/atoms instead of just /atoms
        const pathWithoutPrefix = req.originalUrl.replace(/^\/api\/atoms/, '/api/atoms');
        const targetUrl = new URL(pathWithoutPrefix, baseUrl);

        console.log('[ATOMS] Forwarding to:', targetUrl.toString());

        // Create request options with headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Forward authorization header if present
        if (req.headers.authorization) {
            headers.authorization = req.headers.authorization;
            console.log('[ATOMS] Forwarding authorization header:', req.headers.authorization);
        }

        console.log('[ATOMS] Request options:', headers);

        // Send the request using sendRequest
        const response = await sendRequest(targetUrl.toString(), headers, null, 'GET');
        
        console.log('[ATOMS] Response received:', {
            type: response.type,
            status: response.status,
            headers: response.headers,
            data: response.data
        });

        // Forward the response
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }
        
        res.status(response.status);
        if (response.type === 'json') {
            res.json(response.data);
        } else {
            // Set content-type to text/plain for non-JSON responses if not already set
            if (!response.headers || !response.headers['content-type']) {
                res.setHeader('content-type', 'text/plain');
            }
            res.send(response.data);
        }
    } catch (error) {
        console.error('[ATOMS] Error:', error);
        next(error);
    }
});

// Handle POST requests to /*
router.post('/*', express.json(), async (req, res, next) => {
    try {
        const fullPath = req.originalUrl;
        console.log('[ATOMS] Handling POST request:', fullPath);
        console.log('[ATOMS] Request headers:', req.headers);
        console.log('[ATOMS] Request body:', JSON.stringify(req.body, null, 2));

        const baseUrl = process.env.IS_DOCKER_INTERNAL === 'true' ? 'http://host.docker.internal:1337' : TARGET;
        // Ensure we're using the correct Strapi API path
        const pathWithoutPrefix = req.originalUrl.replace(/^\/api\/atoms/, '/api/atoms');
        const targetUrl = new URL(pathWithoutPrefix, baseUrl);

        console.log('[ATOMS] Forwarding to:', targetUrl.toString());

        // Create a new headers object with only the headers we want to forward
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Forward authorization header if present
        if (req.headers.authorization) {
            headers.authorization = req.headers.authorization;
            console.log('[ATOMS] Forwarding authorization header:', req.headers.authorization);
        }

        console.log('[ATOMS] Forwarding headers:', headers);
        console.log('[ATOMS] Forwarding body:', JSON.stringify(req.body, null, 2));

        // Send the request directly to Strapi without any transformation
        const response = await sendRequest(targetUrl.toString(), headers, req.body, 'POST');
        
        console.log('[ATOMS] Response received:', {
            type: response.type,
            status: response.status,
            headers: response.headers,
            data: response.data
        });

        // Forward the response
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }
        
        res.status(response.status);
        if (response.type === 'json') {
            res.json(response.data);
        } else {
            // Set content-type to text/plain for non-JSON responses if not already set
            if (!response.headers || !response.headers['content-type']) {
                res.setHeader('content-type', 'text/plain');
            }
            res.send(response.data);
        }
    } catch (error) {
        console.error('[ATOMS] Error:', error);
        next(error);
    }
});

module.exports = router;
