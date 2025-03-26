const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const { sendRequest } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Handle POST requests to root for file uploads
// Validation middleware
const validateUpload = (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'No files were uploaded'
        });
    }
    next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('[UPLOAD] Error:', err);
    res.status(503).json({
        error: 'Service Unavailable',
        message: 'Upload processing failed',
        details: err.message
    });
};

router.post('/', [
    upload.array('files'), 
    validateUpload
], async (req, res, next) => {
    console.log('[UPLOAD] Received request');
    console.log('[UPLOAD] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[UPLOAD] Files:', req.files.map(f => ({
        name: f.originalname,
        mimetype: f.mimetype,
        size: f.size
    })));
    const fullPath = req.originalUrl;
    const baseUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;
    console.log('[UPLOAD] Intercepted request to:', fullPath);
    console.log('[UPLOAD] Content-Type:', req.headers['content-type']);
    console.log('[UPLOAD] Target URL:', baseUrl);
    
    try {
        // Function to create form data with validation
        const createFormData = () => {
            const form = new FormData();
            req.files.forEach((file, index) => {
                console.log(`[UPLOAD] Processing file ${index + 1}:`, {
                    name: file.originalname,
                    type: file.mimetype,
                    size: file.size
                });

                if (!file.buffer) {
                    throw new Error(`Missing buffer for file: ${file.originalname}`);
                }

                form.append('files', Buffer.from(file.buffer), {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
            });
            return form;
        };

        // Temporarily try just one request to debug
        console.log('[UPLOAD] Creating form data');
        const form = createFormData();
        
        console.log('[UPLOAD] Sending single request');
        const response = await sendRequest(`${baseUrl}/api/upload`, req.headers, form, req.method);
        
        console.log('[UPLOAD] Response received:', {
            type: response.type,
            status: response.status,
            headers: response.headers
        });

        // Forward the response
        setResponseHeaders(res, response.headers);
        res.status(response.status);
        if (response.type === 'json') {
            res.json(response.data);
        } else {
            res.send(response.data);
        }
    } catch (error) {
        next(error);
    }
}, errorHandler);

module.exports = router;
