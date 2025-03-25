const { createProxyMiddleware } = require('http-proxy-middleware');
const { TARGET } = require('../config/server');
const healthService = require('../services/health');

// Health check middleware
const healthCheckMiddleware = (req, res, next) => {
    healthService.checkHealth();
    const status = healthService.getStatus();
    if (!status.isUp) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: `Target server ${TARGET} is currently unreachable`,
            lastCheck: status.lastCheck
        });
    }
    next();
};

// Configure proxy middleware
const proxyOptions = {
    target: TARGET,
    changeOrigin: true,
    onError: (err, req, res) => {
        healthService.checkHealth(); // Trigger immediate health check on error
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Failed to proxy request to target server',
            details: err.message
        });
    }
};

// Export middleware chain
module.exports = [
    healthCheckMiddleware,
    createProxyMiddleware(proxyOptions)
];
