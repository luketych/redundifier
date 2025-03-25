const { TARGET, IS_DOCKER_INTERNAL } = require('../config/server');

const AbortController = require('abort-controller');

class HealthService {
    constructor() {
        this.isServerUp = true;
        this.lastCheck = null;
    }

    async fetchWithRedirects(url, options = {}, maxRedirects = 3) {
        const response = await fetch(url, {
            ...options,
            redirect: 'manual',
        });

        const status = response.status;

        if (status >= 300 && status < 400) {
            if (maxRedirects === 0) {
                throw new Error(`Too many redirects while fetching ${url}`);
            }

            const location = response.headers.get('location');
            if (!location) {
                throw new Error(`Redirect response without a Location header from ${url}`);
            }

            console.log(`Redirecting to: ${location}`);

            const newUrl = new URL(location, url).toString();
            const resp = this.fetchWithRedirects(newUrl, options, maxRedirects - 1);
            return resp;
        }

        return response;
    }

    async checkHealth() {
        const targetUrl = IS_DOCKER_INTERNAL ? 'http://host.docker.internal:1337' : TARGET;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        try {
            const response = await this.fetchWithRedirects(targetUrl, { signal: controller.signal });

            clearTimeout(timeout);
            this.isServerUp = response.status < 500;
            this.lastCheck = new Date();
        } catch (error) {
            clearTimeout(timeout);
            this.isServerUp = false;
            this.lastCheck = new Date();

            if (error.name === 'AbortError') {
                console.log('Health check timed out');
            } else {
                console.log('Health check failed:', error.message);
            }
        }
    }

    getStatus() {
        return {
            isUp: this.isServerUp,
            lastCheck: this.lastCheck,
        };
    }
}

module.exports = new HealthService();