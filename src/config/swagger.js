const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Workforce Marketplace API',
    version: '1.0.0',
    description: 'Backend APIs for employer/worker short-term job marketplace',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['employer', 'worker'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          employerId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date-time' },
          paymentAmount: { type: 'number' },
          requiredWorkers: { type: 'integer' },
          confirmedCount: { type: 'integer' },
          status: {
            type: 'string',
            enum: ['posted', 'filled', 'completed', 'cancelled'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Application: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          jobId: { type: 'string' },
          workerId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'rejected', 'withdrawn'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          statusCode: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };

