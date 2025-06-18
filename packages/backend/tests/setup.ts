import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Set test database path to a writable location
const testDbPath = path.join(__dirname, '../../../database/test-newsletter.db');
const testDbDir = path.dirname(testDbPath);

// Ensure test database directory exists and is writable
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}

process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

console.log('Test database path:', testDbPath);