const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const { sendRequest } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

const router = express.Router();

// Pre-validate the request
const preValidateUpload = (req, res, next) => {
    if (!req.is('multipart/form-data')) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'No files uploaded'
        });
    }
    next();
};

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.buffer || file.buffer.length === 0) {
            cb(new Error('Invalid file buffer'));
        } else {
            cb(null, true);
        }
    }
}).array('files');

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message?.includes('Invalid file')) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid file buffer'
        });
    }
    next(err);
};

// Validation middleware
const validateUpload = (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'No files uploaded'
        });
    }

    for (const file of req.files) {
        if (!file.buffer || file.buffer.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid file buffer'
            });
        }
    }

    next();
};

// Function to create form data with validation
const createFormData = (files) => {
    if (!files || files.length === 0) {
        throw new Error('No files provided');
    }

    const form = new FormData();
    for (const file of files) {
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('Invalid file buffer');
        }
        form.append('files', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
    }
    return form;
};

router.post('/*', preValidateUpload, upload, handleMulterError, validateUpload, async (req, res) => {
    try {
        let formData;
        try {
            formData = createFormData(req.files);
        } catch (err) {
            return res.status(400).json({
                error: 'Bad Request',
                message: err.message
            });
        }

        // Forward request to target
        const target = process.env.IS_DOCKER_INTERNAL === 'true' ? 'http://host.docker.internal:1337' : 'http://localhost:1337';
        const response = await sendRequest(`${target}/api/upload`, req.headers, formData, 'POST');

        // Send response
        if (response.headers && response.headers['content-type'] && !response.headers['content-type'].includes('application/json')) {
            // Set text/plain without charset for non-JSON responses
            if (response.headers['content-type'].includes('text/plain')) {
                res.removeHeader('Content-Type');
                res.set('Content-Type', 'text/plain');
            } else {
                setResponseHeaders(res, response.headers);
            }
            res.send(response.text);
        } else {
            res.json(response);
        }
    } catch (err) {
        // Handle different types of errors
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'Request failed'
            });
        } else {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: err.message || 'Request failed'
            });
        }
    }
});

// Export for testing
module.exports = router;
module.exports.handleMulterError = handleMulterError;
module.exports.validateUpload = validateUpload;
