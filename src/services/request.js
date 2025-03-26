const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

/**
 * Sends a request to the target server and processes the response
 * @param {string} targetUrl - The URL to send the request to
 * @param {object} headers - The request headers
 * @param {object} body - The request body
 * @param {string} method - The HTTP method
 * @returns {Promise<object>} The processed response
 */
async function sendRequest(targetUrl, headers, body, method = 'GET') {
    console.log('[REQUEST] Sending request with options:', {
        method,
        headers,
        body: body instanceof FormData ? '[FormData]' : body
    });

    try {
        const options = {
            method,
            headers,
            followRedirect: true,
            retry: 0,
            throwHttpErrors: false
        };

        // Only add body for non-GET/HEAD requests
        if (method !== 'GET' && method !== 'HEAD' && body !== null) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(targetUrl, options);

        // Try to parse response as JSON
        let responseData;
        try {
            responseData = await response.json();
        } catch (error) {
            // If response is not JSON, get it as text
            responseData = await response.text();
        }

        console.log('[REQUEST] Response received:', {
            statusCode: response.status,
            headers: response.headers,
            bodyLength: response.headers.get('content-length'),
            body: responseData
        });

        return {
            status: response.status,
            headers: response.headers,
            type: typeof responseData === 'string' ? 'text' : 'json',
            data: responseData
        };
    } catch (error) {
        console.error('[REQUEST] Error:', error);
        return {
            status: 503,
            headers: new Headers(),
            type: 'json',
            data: {
                error: 'Service Unavailable',
                message: 'Failed to process request',
                details: error.message
            }
        };
    }
}

/**
 * Sends duplicate requests and processes their responses
 * @param {string} path - The request path
 * @param {object} headers - The request headers
 * @param {object} body - The request body
 * @param {string} method - The HTTP method
 * @returns {Promise<Array>} The processed responses
 */
async function sendDuplicateRequests(path, headers, body, method = 'GET') {
    console.log('[DUPLICATE] Original path:', path);
    console.log('[DUPLICATE] Method:', method);

    // Remove /api prefix from path
    const cleanPath = path.replace(/^\/api/, '');
    console.log('[DUPLICATE] Clean path:', cleanPath);

    // Determine target URL based on environment
    const isDocker = process.env.DOCKER === 'true';
    const targetUrl = isDocker
        ? `http://host.docker.internal:1337/api${cleanPath}`
        : `http://localhost:1337/api${cleanPath}`;
    console.log('[DUPLICATE] Using target URL:', targetUrl);

    // Send two identical requests
    const requests = [
        sendRequest(targetUrl, headers, body, method),
        sendRequest(targetUrl, headers, body, method)
    ];

    return Promise.all(requests);
}

module.exports = {
    sendDuplicateRequests,
    sendRequest
};
