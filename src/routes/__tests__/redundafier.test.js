const express = require('express');
const request = require('supertest');
const redundafier = require('../redundafier');
const { sendDuplicateRequests } = require('../../services/request');

// Mock the request service
jest.mock('../../services/request');

describe('Redundafier Router', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/redundafier', redundafier);
        jest.clearAllMocks();
    });

    describe('GET /*', () => {
        test('should handle GET requests correctly', async () => {
            const mockResponse = {
                status: 200,
                headers: new Headers(),
                data: { data: 'test' }
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse, mockResponse]);

            const response = await request(app)
                .get('/api/redundafier/atoms')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                responses: [
                    { requestNumber: 1, status: 200, data: { data: 'test' } },
                    { requestNumber: 2, status: 200, data: { data: 'test' } }
                ]
            });

            expect(sendDuplicateRequests).toHaveBeenCalledWith(
                '/atoms',
                expect.objectContaining({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer test-token'
                }),
                null,
                'GET'
            );
        });

        test('should handle errors correctly', async () => {
            sendDuplicateRequests.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/redundafier/atoms')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                error: {
                    message: 'Test error'
                }
            });
        });
    });

    describe('POST /*', () => {
        test('should handle POST requests correctly', async () => {
            const mockResponse = {
                status: 200,
                headers: new Headers(),
                data: { data: 'test' }
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse, mockResponse]);

            const response = await request(app)
                .post('/api/redundafier/atoms')
                .set('Authorization', 'Bearer test-token')
                .send({ test: 'data' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                responses: [
                    { requestNumber: 1, status: 200, data: { data: 'test' } },
                    { requestNumber: 2, status: 200, data: { data: 'test' } }
                ]
            });

            expect(sendDuplicateRequests).toHaveBeenCalledWith(
                '/atoms',
                expect.objectContaining({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer test-token'
                }),
                { test: 'data' },
                'POST'
            );
        });

        test('should handle errors correctly', async () => {
            sendDuplicateRequests.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .post('/api/redundafier/atoms')
                .set('Authorization', 'Bearer test-token')
                .send({ test: 'data' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                error: {
                    message: 'Test error'
                }
            });
        });

        test('should handle string responses correctly', async () => {
            const mockResponse = {
                status: 200,
                headers: new Headers(),
                data: '{"data": "test"}'
            };

            sendDuplicateRequests.mockResolvedValue([mockResponse, mockResponse]);

            const response = await request(app)
                .post('/api/redundafier/atoms')
                .set('Authorization', 'Bearer test-token')
                .send({ test: 'data' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                responses: [
                    { requestNumber: 1, status: 200, data: { data: 'test' } },
                    { requestNumber: 2, status: 200, data: { data: 'test' } }
                ]
            });
        });
    });
}); 