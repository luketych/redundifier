const { createProxyMiddleware } = require('http-proxy-middleware');
const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

console.log('Initializing proxy middleware with target:', IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET);

// Configure proxy middleware
const proxyOptions = {
    target: IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req) => {
        const targetUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;
        console.log(`[PROXY] Received ${req.method} request for ${req.url}`);
        console.log(`[PROXY] Forwarding to ${targetUrl}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req) => {
        console.log(`[PROXY] Response from target: ${proxyRes.statusCode} for ${req.url}`);
    },
    onError: (err, req, res) => {
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to proxy request to target server',
            details: err.message
        });
    }
};

// Export proxy middleware
module.exports = createProxyMiddleware(proxyOptions);
