const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Expense Tracker API',
      version: '1.0.0',
      description: 'A simple REST API for tracking personal expenses, backed by a local JSON file.',
    },
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],
  },
  // Files containing @openapi JSDoc annotations.
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(swaggerOptions);
