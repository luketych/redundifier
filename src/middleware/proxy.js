const { createProxyMiddleware } = require('http-proxy-middleware');
const { TARGET } = require('../config/server');

// Configure proxy middleware
const proxyOptions = {
    target: TARGET,
    changeOrigin: true
};

module.exports = createProxyMiddleware(proxyOptions);
