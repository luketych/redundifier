const express = require('express');
const request = require('supertest');
const multer = require('multer');
const FormData = require('form-data');
const { sendRequest } = require('../../services/request');
const { TARGET } = require('../../config/server');

// Mock dependencies
jest.mock('../../services/request');
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

        const uploadRouter = require('../upload');
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
                message: 'Invalid file buffer'
            });
        });

        it('should handle request errors', async () => {
            sendRequest.mockRejectedValueOnce(new Error('Request failed'));

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
                message: 'Unknown error occurred'
            });
        });

        it('should handle non-JSON responses with headers', async () => {
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
            expect(response.headers['content-type']).toBe('text/plain');
        });

        it('should handle form data creation with empty buffer', async () => {
            const response = await request(app)
                .post('/api/upload')
                .attach('files', Buffer.from(''), 'test.txt')
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                message: 'Invalid file buffer'
            });
        });
    });
}); 