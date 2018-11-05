require('dotenv').config({ path: 'variables.env' });

const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO - use express middleware to handle cookies (jwt) and populate current user

server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  }, 
}, (result) => {
  console.log(`Server is now running on Port ${result.port}`);
});