/**
 * Formats JSON responses into an array with metadata
 * @param {object} response1 - First response object
 * @param {object} response2 - Second response object
 * @returns {Array} Array of modified responses
 */
function formatJsonResponses(response1, response2) {
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

/**
 * Sets response headers from the source response
 * @param {object} res - Express response object
 * @param {object} sourceHeaders - Headers to copy
 */
function setResponseHeaders(res, sourceHeaders) {
    for (const [key, value] of Object.entries(sourceHeaders)) {
        res.setHeader(key, value);
    }
}

module.exports = {
    formatJsonResponses,
    setResponseHeaders
};
