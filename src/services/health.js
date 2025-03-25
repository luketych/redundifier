const http = require('http');
const { TARGET } = require('../config/server');

class HealthService {
    constructor() {
        this.isServerUp = true;
        this.lastCheck = null;
    }

    checkHealth() {
        const url = new URL(TARGET);
        const options = {
            host: url.hostname,
            port: url.port,
            path: '/',
            timeout: 2000, // 2 second timeout
            maxRedirects: 5, // Allow up to 5 redirects
            followRedirects: true
        };

        const req = http.request(options, (res) => {
            this.isServerUp = res.statusCode < 500;
            this.lastCheck = new Date();
            req.end();
        });

        req.on('error', () => {
            this.isServerUp = false;
            this.lastCheck = new Date();
        });

        req.on('timeout', () => {
            this.isServerUp = false;
            this.lastCheck = new Date();
            req.destroy();
        });

        req.end();
    }

    getStatus() {
        return {
            isUp: this.isServerUp,
            lastCheck: this.lastCheck,
        };
    }
}

// Export singleton instance
module.exports = new HealthService();
