const { sendRequest, sendDuplicateRequests } = require('../request');
const { TARGET, IS_DOCKER_INTERNAL } = require('../../config/server');

// Mock fetch
global.fetch = jest.fn();

describe('Request Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendRequest', () => {
        test('should handle GET requests without body', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await sendRequest(
                'http://localhost:1337/test',
                { 'Content-Type': 'application/json' },
                null,
                'GET'
            );

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:1337/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    followRedirect: true,
                    retry: 0,
                    throwHttpErrors: false
                })
            );

            expect(result).toEqual({
                status: 200,
                headers: expect.any(Headers),
                type: 'json',
                data: { data: 'test' }
            });
        });

        test('should handle POST requests with body', async () => {
            const requestBody = { test: 'data' };
            global.fetch = jest.fn().mockResolvedValue({
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await sendRequest(
                'http://localhost:1337/test',
                { 'Content-Type': 'application/json' },
                requestBody,
                'POST'
            );

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:1337/test',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    followRedirect: true,
                    retry: 0,
                    throwHttpErrors: false
                })
            );

            expect(result).toEqual({
                status: 200,
                headers: expect.any(Headers),
                type: 'json',
                data: { data: 'test' }
            });
        });
    });

    describe('sendDuplicateRequests', () => {
        test('should send two identical requests', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await sendDuplicateRequests(
                '/test',
                { 'Content-Type': 'application/json' },
                null,
                'GET'
            );

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                status: 200,
                headers: expect.any(Headers),
                type: 'json',
                data: { data: 'test' }
            });
            expect(result[1]).toEqual(result[0]);
        });

        test('should handle Docker and non-Docker environments correctly', async () => {
            const originalEnv = process.env.DOCKER;
            process.env.DOCKER = 'true';

            global.fetch = jest.fn().mockResolvedValue({
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({ data: 'test' })
            });

            const result = await sendDuplicateRequests(
                '/test',
                { 'Content-Type': 'application/json' },
                null,
                'GET'
            );

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                status: 200,
                headers: expect.any(Headers),
                type: 'json',
                data: { data: 'test' }
            });
            expect(result[1]).toEqual(result[0]);

            process.env.DOCKER = originalEnv;
        });
    });
}); 