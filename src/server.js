const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart Expense Tracker API listening on port ${config.port} (${config.env})`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs available at http://localhost:${config.port}/api/docs`);
});

// Graceful shutdown on termination signals (e.g. Docker, CI, Ctrl+C).
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received. Shutting down gracefully.');
  server.close(() => process.exit(0));
});

module.exports = server;
