const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');
const FormData = require('form-data');
const { Readable } = require('stream');
const https = require('https');
const http = require('http');

/**
 * Sends a request to the target server and processes the response
 * @param {string} targetUrl - The URL to send the request to
 * @param {object} headers - The request headers
 * @param {Buffer} body - The request body
 * @returns {Promise<object>} The processed response
 */
async function sendRequest(targetUrl, headers, body, method = 'POST') {
    console.log(`[REQUEST] Sending ${method} request to ${targetUrl}`);
    console.log(`[REQUEST] Headers:`, JSON.stringify(headers, null, 2));
    console.log(`[REQUEST] Body:`, JSON.stringify(body, null, 2));
    const requestOptions = {
        method: method,
        redirect: 'follow'
    };

    try {
        console.log('[REQUEST] Preparing request to:', targetUrl);
        
        // Extract important headers
        const { authorization } = headers;
        
        const options = {
            method,
            headers: {
                ...headers,
                host: new URL(TARGET).host,
                // Ensure authorization header is preserved
                ...(authorization && { authorization })
            },
            followRedirect: true,
            retry: 0,
            throwHttpErrors: false
        };

        if (body instanceof FormData) {
            console.log('[REQUEST] Handling FormData upload');
            options.body = body;
        } else {
            console.log('[REQUEST] Handling regular request');
            // If body is already a string, use it as is, otherwise stringify it
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
            delete options.headers['content-length'];
        }

        console.log('[REQUEST] Final request options:', JSON.stringify({
            ...options,
            body: typeof options.body === 'string' ? options.body : '[FormData]'
        }, null, 2));

        let response;
        
        if (body instanceof FormData) {
            console.log('[REQUEST] Handling FormData with native request');
            
            response = await new Promise((resolve, reject) => {
                const formHeaders = body.getHeaders();
                const url = new URL(targetUrl);
                const requestOptions = {
                    method: 'POST',
                    hostname: url.hostname,
                    port: url.port,
                    path: url.pathname,
                    headers: {
                        ...formHeaders,
                        host: url.host,
                        // Ensure authorization header is preserved in FormData requests
                        ...(authorization && { authorization })
                    }
                };

                console.log('[REQUEST] FormData request options:', requestOptions);

                const clientModule = url.protocol === 'https:' ? https : http;
                const req = clientModule.request(requestOptions, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data
                        });
                    });
                });

                req.on('error', (error) => {
                    console.error('[REQUEST] Request error:', error);
                    reject(error);
                });

                // Write form data to request
                body.pipe(req);
            });
        } else {
            console.log('[REQUEST] Sending request with options:', JSON.stringify({
                ...options,
                body: typeof options.body === 'string' ? options.body : '[FormData]'
            }, null, 2));
            const resp = await fetch(targetUrl, options);
            response = {
                statusCode: resp.status,
                headers: resp.headers,
                body: await resp.text()
            };
        }
        console.log('[REQUEST] Response received:', {
            statusCode: response.statusCode,
            headers: response.headers,
            bodyLength: response.body?.length,
            body: response.body
        });

        const contentType = response.headers['content-type'] || '';
        const responseData = {
            type: contentType.includes('application/json') ? 'json' : 'binary',
            status: response.statusCode,
            headers: response.headers,
            data: contentType.includes('application/json') 
                ? JSON.parse(response.body)
                : Buffer.from(response.body)
        };

        return responseData;
    } catch (error) {
        // Enhanced error logging
        console.error('[REQUEST] Error details:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack,
            requestError: error.response?.body,
            gotOptions: error.options,
            host: error.host,
            protocol: error.protocol
        });
        throw error;
    }
}

/**
 * Sends duplicate requests and processes their responses
 * @param {string} path - The request path
 * @param {object} headers - The request headers
 * @param {Buffer} body - The request body
 * @returns {Promise<Array>} The processed responses
 */
async function sendDuplicateRequests(path, headers, body, method = 'POST') {
    console.log(`[DUPLICATE] Original path: ${path}`);
    console.log(`[DUPLICATE] Method: ${method}`);

    // Remove /api/upload prefix from path
    const cleanPath = path.replace(/^\/api\/upload/, '');
    console.log(`[DUPLICATE] Clean path: ${cleanPath}`);

    let targetUrl;
    if (IS_DOCKER_INTERNAL) {
        // Use host.docker.internal when running in Docker
        targetUrl = `http://host.docker.internal:1337${cleanPath}`;
        console.log(`[DUPLICATE] Using Docker URL: ${targetUrl}`);
    } else {
        targetUrl = `${TARGET}${cleanPath}`;
        console.log(`[DUPLICATE] Using target URL: ${targetUrl}`);
    }
    return Promise.all([
        sendRequest(targetUrl, headers, body, method),
        sendRequest(targetUrl, headers, body, method)
    ]);
}

module.exports = {
    sendDuplicateRequests,
    sendRequest
};
