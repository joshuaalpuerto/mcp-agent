import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { App } from '../../../src/app';

import createRouter from './router';

// Load environment variables
dotenv.config();

// initialize MCP connection that will persist server that agents initialized
const mcpApp = new App();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', createRouter());

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.on('close', () => {
  console.log('Closing server');
  // close MCP connection gracefully
  mcpApp.close();
});