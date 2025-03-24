const request = require('supertest');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Mock target server setup
const targetApp = express();
targetApp.get('/api/test', (req, res) => {
  res.json({ message: 'Target server response' });
});
const targetServer = targetApp.listen(1337);

// Import server with app export for testing
const app = require('../server');

describe('Proxy Server', () => {
  afterAll(done => {
    targetServer.close(done);
  });

  describe('POST /api/upload/*', () => {
    it('should intercept upload requests', async () => {
      const response = await request(app)
        .post('/api/upload/test')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Upload intercepted');
      expect(response.body).toHaveProperty('path', '/api/upload/test');
    });
  });

  describe('Other routes', () => {
    it('should proxy GET requests to target server', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Target server response');
    });
  });
});
