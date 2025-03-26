const express = require('express');
const http = require('http');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');
const { sendRequest } = require('../services/request');

const router = express.Router();

// Handle GET requests to /*
router.get('/*', (req, res) => {
    const fullPath = req.originalUrl;
    console.log('[ATOMS] Handling GET request:', fullPath);
    console.log('[ATOMS] Request headers:', req.headers);

    const baseUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;
    // For Strapi API, we need to use /api/atoms instead of just /atoms
    const pathWithoutPrefix = req.originalUrl.replace(/^\/api\/atoms/, '/api/atoms');
    const targetUrl = new URL(pathWithoutPrefix, baseUrl);

    console.log('[ATOMS] Forwarding to:', targetUrl.toString());

    // Create request options with headers
    const options = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
        options.headers.authorization = req.headers.authorization;
        console.log('[ATOMS] Forwarding authorization header:', req.headers.authorization);
    }

    // Forward other relevant headers
    if (req.headers['content-type']) {
        options.headers['content-type'] = req.headers['content-type'];
    }

    console.log('[ATOMS] Request options:', options);

    // Use basic http request with options
    const proxyReq = http.get(targetUrl, options, (proxyRes) => {
        console.log('[ATOMS] Target response status:', proxyRes.statusCode);
        console.log('[ATOMS] Target response headers:', proxyRes.headers);
        
        // Copy headers
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe response
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
        console.error('[ATOMS] Request error:', error);
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to process atoms request',
            details: error.message
        });
    });

    req.on('close', () => {
        proxyReq.destroy();
    });
});

// Handle POST requests to /*
router.post('/*', express.json(), async (req, res, next) => {
    try {
        const fullPath = req.originalUrl;
        console.log('[ATOMS] Handling POST request:', fullPath);
        console.log('[ATOMS] Request headers:', req.headers);
        console.log('[ATOMS] Request body:', JSON.stringify(req.body, null, 2));

        const baseUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;
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
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        
        res.status(response.status);
        if (response.type === 'json') {
            res.json(response.data);
        } else {
            res.send(response.data);
        }
    } catch (error) {
        console.error('[ATOMS] Error:', error);
        next(error);
    }
});

module.exports = router;
