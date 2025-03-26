const express = require('express');
const request = require('supertest');
const { sendRequest } = require('../../services/request');

// Mock dependencies
jest.mock('../../services/request');

describe('Atoms Router', () => {
    let app;
    let mockConsole;
    let originalEnv;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/atoms', require('../../routes/atoms'));

        // Store original environment
        originalEnv = process.env.IS_DOCKER_INTERNAL;

        // Mock console methods
        mockConsole = {
            log: jest.spyOn(console, 'log').mockImplementation(() => {}),
            error: jest.spyOn(console, 'error').mockImplementation(() => {})
        };
    });

    afterEach(() => {
        mockConsole.log.mockRestore();
        mockConsole.error.mockRestore();
        // Restore original environment
        process.env.IS_DOCKER_INTERNAL = originalEnv;
    });

    describe('GET /*', () => {
        it('should handle successful GET requests', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: [{ id: 1, name: 'Test Atom' }] }
            });

            const response = await request(app)
                .get('/api/atoms')
                .expect(200);

            expect(response.body).toEqual({ data: [{ id: 1, name: 'Test Atom' }] });
            expect(mockConsole.log).toHaveBeenCalledWith('[ATOMS] Handling GET request:', '/api/atoms');
        });

        it('should handle GET requests with authorization', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: [{ id: 1, name: 'Test Atom' }] }
            });

            const response = await request(app)
                .get('/api/atoms')
                .set('Authorization', 'Bearer test-token')
                .expect(200);

            expect(response.body).toEqual({ data: [{ id: 1, name: 'Test Atom' }] });
            expect(mockConsole.log).toHaveBeenCalledWith('[ATOMS] Forwarding authorization header:', 'Bearer test-token');
        });

        it('should handle GET requests in Docker environment', async () => {
            process.env.IS_DOCKER_INTERNAL = 'true';

            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: [{ id: 1, name: 'Test Atom' }] }
            });

            await request(app)
                .get('/api/atoms')
                .expect(200);

            expect(sendRequest).toHaveBeenCalledWith(
                expect.stringContaining('host.docker.internal'),
                expect.any(Object),
                null,
                'GET'
            );
        });

        it('should handle non-JSON responses', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'text',
                status: 200,
                headers: new Headers({ 'content-type': 'text/plain' }),
                data: 'Text response'
            });

            const response = await request(app)
                .get('/api/atoms')
                .expect(200);

            expect(response.text).toBe('Text response');
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        it('should handle errors', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 503,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: {
                    error: 'Service Unavailable',
                    message: 'Failed to process request',
                    details: 'API Error'
                }
            });

            const response = await request(app)
                .get('/api/atoms')
                .expect(503);

            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to process request',
                details: 'API Error'
            });
            expect(mockConsole.log).toHaveBeenCalledWith('[ATOMS] Response received:', expect.any(Object));
        });
    });

    describe('POST /*', () => {
        it('should handle successful POST requests', async () => {
            const requestBody = { name: 'New Atom' };

            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: { id: 1, name: 'New Atom' } }
            });

            const response = await request(app)
                .post('/api/atoms')
                .send(requestBody)
                .expect(200);

            expect(response.body).toEqual({ data: { id: 1, name: 'New Atom' } });
            expect(mockConsole.log).toHaveBeenCalledWith('[ATOMS] Request body:', JSON.stringify(requestBody, null, 2));
        });

        it('should handle POST requests with authorization', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: { id: 1, name: 'New Atom' } }
            });

            await request(app)
                .post('/api/atoms')
                .set('Authorization', 'Bearer test-token')
                .send({ name: 'New Atom' })
                .expect(200);

            expect(mockConsole.log).toHaveBeenCalledWith('[ATOMS] Forwarding authorization header:', 'Bearer test-token');
            expect(sendRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    authorization: 'Bearer test-token'
                }),
                expect.any(Object),
                'POST'
            );
        });

        it('should handle POST requests in Docker environment', async () => {
            process.env.IS_DOCKER_INTERNAL = 'true';

            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: { data: { id: 1, name: 'New Atom' } }
            });

            await request(app)
                .post('/api/atoms')
                .send({ name: 'New Atom' })
                .expect(200);

            expect(sendRequest).toHaveBeenCalledWith(
                expect.stringContaining('host.docker.internal'),
                expect.any(Object),
                expect.any(Object),
                'POST'
            );
        });

        it('should handle non-JSON responses', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'text',
                status: 200,
                headers: new Headers({ 'content-type': 'text/plain' }),
                data: 'Created successfully'
            });

            const response = await request(app)
                .post('/api/atoms')
                .send({ name: 'New Atom' })
                .expect(200);

            expect(response.text).toBe('Created successfully');
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        it('should handle errors', async () => {
            const error = new Error('Network error');
            sendRequest.mockRejectedValueOnce(error);

            const response = await request(app)
                .post('/api/atoms')
                .send({ name: 'New Atom' })
                .expect(500);

            expect(mockConsole.error).toHaveBeenCalledWith('[ATOMS] Error:', error);
        });

        it('should handle errors with response data', async () => {
            sendRequest.mockResolvedValueOnce({
                type: 'json',
                status: 400,
                headers: new Headers({ 'content-type': 'application/json' }),
                data: {
                    error: 'Bad Request',
                    message: 'Invalid data',
                    details: 'Name is required'
                }
            });

            const response = await request(app)
                .post('/api/atoms')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                error: 'Bad Request',
                message: 'Invalid data',
                details: 'Name is required'
            });
        });
    });
}); 