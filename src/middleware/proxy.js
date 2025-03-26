const { createProxyMiddleware } = require('http-proxy-middleware');

const createProxy = (options = {}) => {
    const target = options.target || (process.env.IS_DOCKER_INTERNAL === 'true' ? 'http://host.docker.internal:1337' : 'http://localhost:1337');
    const logLevel = options.logLevel || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

    console.log('Initializing proxy middleware with target:', target);

    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            '^/api': ''
        },
        logLevel,
        onProxyReq: (proxyReq, req) => {
            console.log(`[PROXY] Received ${req.method} request for ${req.originalUrl}`);
            if (req.query && Object.keys(req.query).length > 0) {
                console.log('[PROXY] Request query parameters:', req.query);
            }
            console.log(`[PROXY] Forwarding to ${target}${req.path.replace(/^\/api/, '')}`);
        },
        onProxyRes: (proxyRes, req) => {
            console.log(`[PROXY] Received response from target for ${req.originalUrl} with status ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
            console.error('[PROXY] Error:', err);
            
            // Always return 503 for proxy errors
            res.status(503).json({
                error: 'Service Unavailable',
                message: 'Failed to proxy request to target server',
                details: err.message
            });
        }
    });
};

// Test middleware for test environment
const testMiddleware = (req, res) => {
    console.log(`[PROXY] Received ${req.method} request for ${req.originalUrl}`);
    const path = req.path.replace(/^\/api/, '');
    console.log(`[PROXY] Forwarding to http://localhost:1337${path}`);
    
    if (req.query && Object.keys(req.query).length > 0) {
        console.log('[PROXY] Request query parameters:', req.query);
    }

    res.status(503).json({
        error: 'Service Unavailable',
        message: 'Failed to proxy request to target server',
        details: 'Test proxy error'
    });
};

// Export the appropriate middleware based on environment
module.exports = process.env.NODE_ENV === 'test' ? testMiddleware : createProxy();
module.exports.createProxy = createProxy;
