const { formatJsonResponses, setResponseHeaders } = require('../response');

describe('Response Service', () => {
    describe('formatJsonResponses', () => {
        test('should format two JSON responses with metadata', () => {
            const response1 = { data: { id: 1, name: 'Test 1' } };
            const response2 = { data: { id: 2, name: 'Test 2' } };

            const result = formatJsonResponses(response1, response2);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({
                id: 1,
                name: 'Test 1',
                intercepted: expect.objectContaining({
                    interceptedBy: 'redundafier',
                    timestamp: expect.any(String)
                }),
                instance: 1
            }));
            expect(result[1]).toEqual(expect.objectContaining({
                id: 2,
                name: 'Test 2',
                intercepted: expect.objectContaining({
                    interceptedBy: 'redundafier',
                    timestamp: expect.any(String)
                }),
                instance: 2
            }));
        });

        test('should handle empty response data', () => {
            const response1 = { data: {} };
            const response2 = { data: {} };

            const result = formatJsonResponses(response1, response2);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({
                intercepted: expect.any(Object),
                instance: 1
            }));
            expect(result[1]).toEqual(expect.objectContaining({
                intercepted: expect.any(Object),
                instance: 2
            }));
        });

        test('should handle null response data', () => {
            const response1 = { data: null };
            const response2 = { data: null };

            const result = formatJsonResponses(response1, response2);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({
                intercepted: expect.any(Object),
                instance: 1
            }));
            expect(result[1]).toEqual(expect.objectContaining({
                intercepted: expect.any(Object),
                instance: 2
            }));
        });
    });

    describe('setResponseHeaders', () => {
        let mockRes;

        beforeEach(() => {
            mockRes = {
                setHeader: jest.fn()
            };
        });

        test('should set all headers from source', () => {
            const sourceHeaders = {
                'content-type': 'application/json',
                'x-custom-header': 'test-value'
            };

            setResponseHeaders(mockRes, sourceHeaders);

            expect(mockRes.setHeader).toHaveBeenCalledTimes(2);
            expect(mockRes.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
            expect(mockRes.setHeader).toHaveBeenCalledWith('x-custom-header', 'test-value');
        });

        test('should handle empty headers object', () => {
            setResponseHeaders(mockRes, {});
            expect(mockRes.setHeader).not.toHaveBeenCalled();
        });

        test('should handle null headers', () => {
            setResponseHeaders(mockRes, null);
            expect(mockRes.setHeader).not.toHaveBeenCalled();
        });
    });
}); 