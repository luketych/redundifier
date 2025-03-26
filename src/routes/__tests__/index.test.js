const express = require('express');
const request = require('supertest');
const router = require('../index');

// Mock the route modules
jest.mock('../upload', () => {
    return jest.fn((req, res, next) => {
        res.status(200).json({ message: 'Upload route' });
    });
});

jest.mock('../atoms', () => {
    return jest.fn((req, res, next) => {
        res.status(200).json({ message: 'Atoms route' });
    });
});

jest.mock('../redundafier', () => {
    return jest.fn((req, res, next) => {
        res.status(200).json({ message: 'Redundafier route' });
    });
});

describe('Router Index', () => {
    let app;
    const uploadRoutes = require('../upload');
    const atomsRoutes = require('../atoms');
    const redundafierRoutes = require('../redundafier');

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Create a new Express app for each test
        app = express();
        app.use('/api', router);

        // Mock console methods
        console.log = jest.fn();
        console.error = jest.fn();

        // Set development environment
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        // Restore original environment
        process.env.NODE_ENV = 'test';
    });

    describe('Route Mounting', () => {
        test('should mount upload routes', async () => {
            await request(app)
                .get('/api/upload/test')
                .expect(200);

            expect(uploadRoutes).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(
                '[ROUTER] Upload request:',
                'GET',
                '/test'
            );
        });

        test('should mount atoms routes', async () => {
            await request(app)
                .get('/api/atoms/test')
                .expect(200);

            expect(atomsRoutes).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(
                '[ROUTER] Atoms request:',
                'GET',
                '/test'
            );
        });

        test('should mount redundafier routes', async () => {
            await request(app)
                .get('/api/redundafier/test')
                .expect(200);

            expect(redundafierRoutes).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(
                '[ROUTER] Redundafier request:',
                'GET',
                '/test'
            );
        });

        test('should handle successful route completion', async () => {
            uploadRoutes.mockImplementationOnce((req, res, next) => {
                res.status(200).json({ message: 'Upload route' });
                next();
            });

            const response = await request(app)
                .get('/api/upload/test')
                .expect(200);

            expect(response.body).toEqual({ message: 'Upload route' });
            expect(uploadRoutes).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors from upload routes', async () => {
            const error = new Error('Upload error');
            uploadRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/upload/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'Upload error',
                details: expect.any(String)
            });
            expect(console.error).toHaveBeenCalledWith('[ROUTER] Error:', error);
        });

        test('should handle errors from atoms routes', async () => {
            const error = new Error('Atoms error');
            atomsRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/atoms/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'Atoms error',
                details: expect.any(String)
            });
            expect(console.error).toHaveBeenCalledWith('[ROUTER] Error:', error);
        });

        test('should handle errors from redundafier routes', async () => {
            const error = new Error('Redundafier error');
            redundafierRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/redundafier/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'Redundafier error',
                details: expect.any(String)
            });
            expect(console.error).toHaveBeenCalledWith('[ROUTER] Error:', error);
        });

        test('should omit error details in production', async () => {
            process.env.NODE_ENV = 'production';

            const error = new Error('Production error');
            uploadRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/upload/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'Production error'
            });
            expect(response.body.details).toBeUndefined();
        });

        test('should handle errors without stack traces', async () => {
            const error = new Error('No stack error');
            delete error.stack;
            uploadRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/upload/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'No stack error',
                details: undefined
            });
        });

        test('should handle errors in test environment', async () => {
            process.env.NODE_ENV = 'test';

            const error = new Error('Test error');
            uploadRoutes.mockImplementationOnce((req, res, next) => next(error));

            const response = await request(app)
                .get('/api/upload/test')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal Server Error',
                message: 'Test error',
                details: undefined
            });
        });
    });
}); 