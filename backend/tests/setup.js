// Set required env vars before any test file loads
process.env.JWT_SECRET     = 'test-secret-for-phonebox-tests-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV       = 'test';
