/**
 * Formats JSON responses from multiple requests
 * @param {Array|Object} responses - Array of responses or individual response objects
 * @returns {Object} Formatted response object
 */
function formatJsonResponses(responses) {
    if (Array.isArray(responses)) {
        return {
            responses: responses.map((response, index) => ({
                requestNumber: index + 1,
                status: response.status,
                data: response.data
            }))
        };
    }

    // Handle legacy format with two separate responses
    const [response1, response2] = arguments;
    if (response1 && response2) {
        return [
            {
                ...response1.data,
                intercepted: {
                    interceptedBy: 'redundafier',
                    timestamp: new Date().toISOString()
                },
                instance: 1
            },
            {
                ...response2.data,
                intercepted: {
                    interceptedBy: 'redundafier',
                    timestamp: new Date().toISOString()
                },
                instance: 2
            }
        ];
    }

    throw new Error('Invalid arguments provided to formatJsonResponses');
}

/**
 * Sets response headers from source headers
 * @param {Response} res - Express response object
 * @param {Object} sourceHeaders - Headers to set
 */
function setResponseHeaders(res, sourceHeaders) {
    if (!sourceHeaders) return;
    for (const [key, value] of Object.entries(sourceHeaders)) {
        res.setHeader(key, value);
    }
}

module.exports = {
    formatJsonResponses,
    setResponseHeaders
};
