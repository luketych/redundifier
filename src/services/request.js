const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

/**
 * Sends a request to the target server and processes the response
 * @param {string} targetUrl - The URL to send the request to
 * @param {object} headers - The request headers
 * @param {Buffer} body - The request body
 * @returns {Promise<object>} The processed response
 */
async function sendRequest(targetUrl, headers, body) {
    console.log("sendRequest")
    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            ...headers,
            host: new URL(TARGET).host,
            'content-type': headers['content-type'],
            'content-length': headers['content-length']
        },
        body: body
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        return {
            type: 'json',
            data: data,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        };
    } else {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
            type: 'binary',
            data: buffer,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        };
    }
}

/**
 * Sends duplicate requests and processes their responses
 * @param {string} path - The request path
 * @param {object} headers - The request headers
 * @param {Buffer} body - The request body
 * @returns {Promise<Array>} The processed responses
 */
async function sendDuplicateRequests(path, headers, body) {
    console.log("sendDuplicateRequests")

    let targetUrl;
    if (IS_DOCKER_INTERNAL) {
        // Use host.docker.internal when running in Docker
        targetUrl = `http://host.docker.internal:1337${path}`;
    } else {
        targetUrl = `${TARGET}${path}`;
    }
    return Promise.all([
        sendRequest(targetUrl, headers, body),
        sendRequest(targetUrl, headers, body)
    ]);
}

module.exports = {
    sendDuplicateRequests
};
