import { createServer } from './dist/web/server.js';

const port = process.env.PORT || 3000;
const server = createServer(Number(port));
console.log(`Web server starting on http://localhost:${port}`);
