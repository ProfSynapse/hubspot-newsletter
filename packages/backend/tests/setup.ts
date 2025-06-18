import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the main .env file (with real API keys)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Set test environment but keep the real API keys
process.env.NODE_ENV = 'test';

console.log('Test environment configured with NODE_ENV:', process.env.NODE_ENV);
console.log('Using database:', process.env.DATABASE_URL ? 'PostgreSQL' : 'Not configured');
console.log('Using API key:', process.env.OPENROUTER_API_KEY ? 'Configured' : 'Not configured');