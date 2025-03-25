const express = require('express');
const { PORT } = require('./src/config/server');
const proxyMiddleware = require('./src/middleware/proxy');
const uploadRoutes = require('./src/routes/upload');

const app = express();

// Mount upload routes
app.use('/api/upload', uploadRoutes);

// Use proxy for all other requests
app.use('/', ...proxyMiddleware);

// Only start the server if this file is run directly (not required as a module)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Proxy server running on port ${PORT}`);
        console.log(`Intercepting POST requests to /api/upload/*`);
    });
}

// Export for testing
module.exports = app;
