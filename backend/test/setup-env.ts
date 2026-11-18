import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Deterministic, isolated environment for every test file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'portfolio-uploads-'));
process.env.GITHUB_API_URL = 'https://api.github.test';
delete process.env.GITHUB_TOKEN;
delete process.env.GITHUB_USERNAME;
delete process.env.SMTP_HOST;
delete process.env.CORS_ORIGIN;
delete process.env.ADMIN_BOOTSTRAP_EMAIL;
delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
