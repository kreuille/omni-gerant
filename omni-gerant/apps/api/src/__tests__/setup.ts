// Set required environment variables for all tests
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-characters-long-for-tests';
