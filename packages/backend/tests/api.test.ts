import request from 'supertest';
import express from 'express';
import { initializeDatabase } from '../../common/database/sqlite';
import apiRoutes from '../api/routes';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });
  });

  describe('POST /api/generate', () => {
    test('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ query: '' })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});