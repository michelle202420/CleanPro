
const request = require('supertest');
const app = require('../app');

describe('CleanPro health endpoint', () => {
    test('returns HTTP 200 and a healthy status', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
        expect(typeof response.body.uptime).toBe('number');
    });
});
