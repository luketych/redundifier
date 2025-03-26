const express = require('express');
const request = require('supertest');
const { TARGET } = require('../../config/server');

describe('Proxy Middleware', () => {
    let app;
    let mockConsole;

    beforeEach(() => {
        mockConsole = {
            log: jest.fn(),
            error: jest.fn()
        };
        global.console = mockConsole;

        jest.resetModules();
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        jest.resetModules();
        process.env.NODE_ENV = 'test';
        process.env.IS_DOCKER_INTERNAL = 'false';
    });

    describe('Test Environment', () => {
        it('should use test middleware in test environment', async () => {
            const proxyMiddleware = require('../proxy');
            app = express();
            app.use('/api', proxyMiddleware);

            const response = await request(app)
                .get('/api/test')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to proxy request to target server',
                details: 'Test proxy error'
            });

            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Received GET request for /api/test'
            );
            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Forwarding to http://localhost:1337/test'
            );
        });

        it('should handle POST requests in test environment', async () => {
            const proxyMiddleware = require('../proxy');
            app = express();
            app.use('/api', proxyMiddleware);

            const response = await request(app)
                .post('/api/test')
                .send({ test: 'data' })
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to proxy request to target server',
                details: 'Test proxy error'
            });
        });
    });

    describe('Development Environment', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should initialize with default target', async () => {
            const proxyMiddleware = require('../proxy');
            app = express();
            app.use('/api', proxyMiddleware);

            expect(mockConsole.log).toHaveBeenCalledWith(
                'Initializing proxy middleware with target:',
                'http://localhost:1337'
            );
        });

        it('should initialize with Docker target', async () => {
            process.env.IS_DOCKER_INTERNAL = 'true';
            const proxyMiddleware = require('../proxy');
            app = express();
            app.use('/api', proxyMiddleware);

            expect(mockConsole.log).toHaveBeenCalledWith(
                'Initializing proxy middleware with target:',
                'http://host.docker.internal:1337'
            );
        });

        it('should use custom target when provided', async () => {
            const proxyMiddleware = require('../proxy').createProxy({
                target: 'http://custom:1337'
            });
            app = express();
            app.use('/api', proxyMiddleware);

            expect(mockConsole.log).toHaveBeenCalledWith(
                'Initializing proxy middleware with target:',
                'http://custom:1337'
            );
        });

        it('should use custom logLevel when provided', async () => {
            const proxyMiddleware = require('../proxy').createProxy({
                logLevel: 'debug'
            });
            app = express();
            app.use('/api', proxyMiddleware);

            expect(mockConsole.log).toHaveBeenCalledWith(
                'Initializing proxy middleware with target:',
                'http://localhost:1337'
            );
        });

        it('should handle proxy errors', async () => {
            const proxyMiddleware = require('../proxy').createProxy({
                target: 'http://invalid:1337'
            });
            app = express();
            app.use('/api', proxyMiddleware);

            const response = await request(app)
                .get('/api/test')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to proxy request to target server',
                details: expect.any(String)
            });
        });

        it('should log proxy requests and responses', async () => {
            const proxyMiddleware = require('../proxy').createProxy();
            app = express();
            app.use('/api', proxyMiddleware);

            await request(app)
                .get('/api/test')
                .expect(503);

            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Received GET request for /api/test'
            );
            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Forwarding to http://localhost:1337/test'
            );
        });

        it('should rewrite paths correctly', async () => {
            const proxyMiddleware = require('../proxy').createProxy();
            app = express();
            app.use('/api', proxyMiddleware);

            await request(app)
                .get('/api/test')
                .expect(503);

            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Forwarding to http://localhost:1337/test'
            );
        });

        it('should handle POST requests', async () => {
            const proxyMiddleware = require('../proxy').createProxy();
            app = express();
            app.use('/api', proxyMiddleware);

            await request(app)
                .post('/api/test')
                .send({ test: 'data' })
                .expect(503);

            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Received POST request for /api/test'
            );
        });

        it('should handle requests with query parameters', async () => {
            const proxyMiddleware = require('../proxy').createProxy();
            app = express();
            app.use('/api', proxyMiddleware);

            await request(app)
                .get('/api/test?param=value')
                .expect(503);

            expect(mockConsole.log).toHaveBeenCalledWith(
                '[PROXY] Received GET request for /api/test?param=value'
            );
        });
    });
});