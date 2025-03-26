const express = require('express');
const request = require('supertest');
const multer = require('multer');
const FormData = require('form-data');
const { sendRequest } = require('../../src/services/request');
const { TARGET } = require('../../src/config/server');

// Mock dependencies
jest.mock('../../src/services/request');
jest.mock('multer', () => {
    const multerMock = () => ({
        array: (fieldName) => (req, res, next) => {
            // Simulate file upload
            if (!req.files) {
                req.files = [{
                    originalname: 'test.txt',
                    mimetype: 'text/plain',
                    size: 1024,
                    buffer: Buffer.from('test content')
                }];
            }
            next();
        }
    });
    multerMock.memoryStorage = () => ({});
    multerMock.MulterError = class MulterError extends Error {
        constructor(code) {
            super(code);
            this.name = 'MulterError';
            this.code = code;
        }
    };
    return multerMock;
});

describe('Upload Router', () => {
    let app;
    let mockConsole;

    beforeEach(() => {
        mockConsole = {
            log: jest.fn(),
            error: jest.fn()
        };
        global.console = mockConsole;

        const uploadRouter = require('../../src/routes/upload');
        app = express();
        app.use(express.json());
        app.use('/api/upload', uploadRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
        process.env.IS_DOCKER_INTERNAL = 'false';
    });

    describe('POST /', () => {
        it('should handle successful file upload with detailed logging', async () => {
            const mockResponse = { success: true };
            sendRequest.mockResolvedValueOnce(mockResponse);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(200);

            expect(response.body).toEqual(mockResponse);
            expect(sendRequest).toHaveBeenCalledWith(
                'http://localhost:1337/api/upload',
                expect.any(Object),
                expect.any(FormData),
                'POST'
            );
        });

        it('should handle Docker environment correctly', async () => {
            process.env.IS_DOCKER_INTERNAL = 'true';
            const mockResponse = { success: true };
            sendRequest.mockResolvedValueOnce(mockResponse);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(200);

            expect(response.body).toEqual(mockResponse);
            expect(sendRequest).toHaveBeenCalledWith(
                'http://host.docker.internal:1337/api/upload',
                expect.any(Object),
                expect.any(FormData),
                'POST'
            );
        });

        it('should validate file uploads and handle missing files', async () => {
            const response = await request(app)
                .post('/api/upload')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                message: 'No files uploaded'
            });
        });

        it('should handle missing file buffer', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('files', null, 'test.txt')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                message: 'No files uploaded'
            });
        });

        it('should validate content-type header', async () => {
            const response = await request(app)
                .post('/api/upload')
                .set('Content-Type', 'application/json')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                message: 'No files uploaded'
            });
        });

        it('should handle multiple file uploads', async () => {
            const mockResponse = { success: true };
            sendRequest.mockResolvedValueOnce(mockResponse);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content 1'), 'test1.txt')
                .attach('files', Buffer.from('test content 2'), 'test2.txt')
                .expect(200);

            expect(response.body).toEqual(mockResponse);
            expect(sendRequest).toHaveBeenCalledWith(
                'http://localhost:1337/api/upload',
                expect.any(Object),
                expect.any(FormData),
                'POST'
            );
        });

        it('should handle request errors with ECONNREFUSED', async () => {
            const error = new Error('Connection refused');
            error.code = 'ECONNREFUSED';
            sendRequest.mockRejectedValueOnce(error);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Request failed'
            });
        });

        it('should handle request errors with ENOTFOUND', async () => {
            const error = new Error('Host not found');
            error.code = 'ENOTFOUND';
            sendRequest.mockRejectedValueOnce(error);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Request failed'
            });
        });

        it('should handle error with no message', async () => {
            sendRequest.mockRejectedValueOnce(new Error());

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Request failed'
            });
        });

        it('should handle non-JSON responses with text/plain content-type', async () => {
            const mockResponse = {
                text: 'plain text',
                headers: { 'content-type': 'text/plain' }
            };
            sendRequest.mockResolvedValueOnce(mockResponse);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(200);

            expect(response.text).toBe('plain text');
            expect(response.headers['content-type']).toMatch(/^text\/plain/);
        });

        it('should handle non-JSON responses with other content types', async () => {
            const mockResponse = {
                text: '<xml>test</xml>',
                headers: { 'content-type': 'application/xml' }
            };
            sendRequest.mockResolvedValueOnce(mockResponse);

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from('test content'), 'test.txt')
                .expect(200);

            expect(response.text).toBe('<xml>test</xml>');
            expect(response.headers['content-type']).toMatch(/^application\/xml/);
        });

        it('should handle form data creation with empty buffer', async () => {
            const mockResponse = { success: false };
            sendRequest.mockRejectedValueOnce(new Error('Invalid file buffer'));

            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from(''), 'test.txt')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Invalid file buffer'
            });
        });

        it('should handle MulterError', async () => {
            // Create a new error instance
            const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
            
            // Mock multer to simulate error handling middleware
            const mockNextFn = jest.fn();
            const mockResFn = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            // Import handleMulterError directly
            const uploadRouter = require('../../src/routes/upload');
            const handleMulterError = uploadRouter.handleMulterError;
            
            // Call the middleware directly
            handleMulterError(error, {}, mockResFn, mockNextFn);
            
            expect(mockResFn.status).toHaveBeenCalledWith(400);
            expect(mockResFn.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid file buffer'
            });
            expect(mockNextFn).not.toHaveBeenCalled();
        });

        it('should validate multiple files properly', async () => {
            // Test middleware functions directly
            const uploadRouter = require('../../src/routes/upload');
            const validateUpload = uploadRouter.validateUpload;
            
            // Mock request with invalid file
            const req = {
                files: [
                    {
                        originalname: 'valid.txt',
                        buffer: Buffer.from('test')
                    },
                    {
                        originalname: 'invalid.txt',
                        buffer: null
                    }
                ]
            };
            
            // Mock response
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            // Mock next
            const mockNext = jest.fn();
            
            // Call validate middleware
            validateUpload(req, mockRes, mockNext);
            
            // Check response
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid file buffer'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
