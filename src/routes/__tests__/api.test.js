const express = require('express');
const request = require('supertest');
const api = require('../api');
const { sendDuplicateRequests } = require('../../services/request');
const { formatJsonResponses, setResponseHeaders } = require('../../services/response');

// Mock the request service
jest.mock('../../services/request');
jest.mock('../../services/response');

// Mock fetch
global.fetch = jest.fn();

jest.mock('../../config/server', () => ({
    TARGET: 'http://localhost:1337',
    IS_DOCKER_INTERNAL: false
}));

describe('API Router', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api', api);
        jest.clearAllMocks();
    });

    describe('POST /upload/*', () => {
        test('should handle JSON responses correctly', async () => {
            const mockResponse1 = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { test: 'data1' },
                type: 'json'
            };

            const mockResponse2 = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { test: 'data2' },
                type: 'json'
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse1, mockResponse2]);
            formatJsonResponses.mockReturnValue({
                responses: [
                    { requestNumber: 1, status: 200, data: { test: 'data1' } },
                    { requestNumber: 2, status: 200, data: { test: 'data2' } }
                ]
            });

            const response = await request(app)
                .post('/api/upload/test')
                .set('Content-Type', 'application/json')
                .send({ test: 'data' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                responses: [
                    { requestNumber: 1, status: 200, data: { test: 'data1' } },
                    { requestNumber: 2, status: 200, data: { test: 'data2' } }
                ]
            });

            expect(sendDuplicateRequests).toHaveBeenCalledWith(
                '/api/upload/test',
                expect.any(Object),
                { test: 'data' }
            );
        });

        test('should handle non-JSON responses correctly', async () => {
            const mockResponse1 = {
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: 'test data',
                type: 'text'
            };

            const mockResponse2 = {
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: 'test data',
                type: 'text'
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse1, mockResponse2]);
            setResponseHeaders.mockImplementation((res, headers) => {
                Object.entries(headers).forEach(([key, value]) => {
                    res.set(key, value);
                });
            });

            const response = await request(app)
                .post('/api/upload/test')
                .set('Content-Type', 'text/plain')
                .send('test data');

            expect(response.status).toBe(200);
            expect(response.text).toBe('test data');
        });

        test('should handle errors correctly', async () => {
            sendDuplicateRequests.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .post('/api/upload/test')
                .set('Content-Type', 'application/json')
                .send({ test: 'data' });

            expect(response.status).toBe(503);
            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to process upload request',
                details: 'Test error'
            });
        });
    });

    describe('GET /atoms/*', () => {
        test('should handle requests correctly', async () => {
            const mockResponse1 = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { test: 'data1' },
                type: 'json'
            };

            const mockResponse2 = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { test: 'data2' },
                type: 'json'
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse1, mockResponse2]);
            formatJsonResponses.mockReturnValue({
                responses: [
                    { requestNumber: 1, status: 200, data: { test: 'data1' } },
                    { requestNumber: 2, status: 200, data: { test: 'data2' } }
                ]
            });

            const response = await request(app)
                .get('/api/atoms/test')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                responses: [
                    { requestNumber: 1, status: 200, data: { test: 'data1' } },
                    { requestNumber: 2, status: 200, data: { test: 'data2' } }
                ]
            });

            expect(sendDuplicateRequests).toHaveBeenCalledWith(
                '/api/atoms/test',
                expect.any(Object)
            );
        });

        test('should handle non-JSON responses correctly', async () => {
            const mockResponse1 = {
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: 'test data',
                type: 'text'
            };

            const mockResponse2 = {
                status: 200,
                headers: { 'content-type': 'text/plain' },
                data: 'test data',
                type: 'text'
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse1, mockResponse2]);
            setResponseHeaders.mockImplementation((res, headers) => {
                Object.entries(headers).forEach(([key, value]) => {
                    res.set(key, value);
                });
            });

            const response = await request(app)
                .get('/api/atoms/test')
                .set('Content-Type', 'text/plain');

            expect(response.status).toBe(200);
            expect(response.text).toBe('test data');
        });

        test('should handle errors correctly', async () => {
            sendDuplicateRequests.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/atoms/test')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(503);
            expect(response.body).toEqual({
                error: 'Service Unavailable',
                message: 'Failed to process atoms request',
                details: 'Test error'
            });
        });
    });

    test('should handle GET /atoms/* requests', async () => {
        const mockResponse = { data: [{ id: 1, name: 'Test Atom' }] };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        });

        const response = await request(app)
            .get('/api/atoms')
            .expect(200);

        expect(response.body).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:1337/atoms',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                })
            })
        );
    });

    test('should handle errors', async () => {
        const error = new Error('API Error');
        global.fetch = jest.fn().mockRejectedValue(error);

        const response = await request(app)
            .get('/api/atoms')
            .expect(503);

        expect(response.body).toEqual({
            error: 'Service Unavailable',
            message: 'Failed to forward request to target server',
            details: error.message
        });
    });
}); 