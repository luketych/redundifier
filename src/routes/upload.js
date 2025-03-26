const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const { sendRequest } = require('../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../services/response');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

const router = express.Router();
const upload = multer();

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
                message: `Invalid file buffer for: ${file.originalname}`
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
            throw new Error(`Invalid file buffer for: ${file.originalname}`);
        }
        form.append('files', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
    }
    return form;
};

router.post('/', upload.array('files'), validateUpload, async (req, res) => {
    try {
        let formData;
        try {
            formData = createFormData(req.files);
        } catch (err) {
            return res.status(400).json({
                error: 'Bad Request',
                message: err.message || 'Form data creation failed'
            });
        }

        // Forward request to target
        const target = process.env.IS_DOCKER_INTERNAL === 'true' ? 'http://host.docker.internal:1337' : 'http://localhost:1337';
        const response = await sendRequest(`${target}/api/upload`, req.headers, formData, 'POST');

        // Send response
        if (response.headers && response.headers['content-type'] && !response.headers['content-type'].includes('application/json')) {
            setResponseHeaders(res, response.headers);
            res.set('Content-Type', 'text/plain');
            res.send(response.text);
        } else {
            res.json(response);
        }
    } catch (err) {
        // Handle different types of errors
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            res.status(503).json({
                error: 'Service Unavailable',
                message: err.message || 'Target server is not available'
            });
        } else {
            res.status(503).json({
                error: 'Service Unavailable',
                message: err.message || 'Unknown error occurred'
            });
        }
    }
});

module.exports = router;
