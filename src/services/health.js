const http = require('http');
const { TARGET } = require('../config/server');

class HealthService {
    constructor() {
        this.isServerUp = true;
        this.lastCheck = null;
        this.checkInterval = 60000; // 1 minute
        this.startPeriodicCheck();
    }

    startPeriodicCheck() {
        setInterval(() => {
            this.checkHealth();
        }, this.checkInterval);
        
        // Initial check
        this.checkHealth();
    }

    checkHealth() {
        const url = new URL(TARGET);
        const options = {
            host: url.hostname,
            port: url.port,
            path: '/',
            timeout: 2000, // 2 second timeout
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
