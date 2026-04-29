require('./config'); // loads dotenv before other modules read process.env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');

const { config } = require('./config');
const { swaggerSpec } = require('./config/swagger');
const { errorHandler } = require('./middleware/error.middleware');
const { notFound } = require('./middleware/notFound.middleware');
const { requestId, requestLogger } = require('./middleware/request.middleware');
const { responseFormatter } = require('./middleware/response.middleware');
const { authLimiter, applyLimiter } = require('./middleware/rateLimit.middleware');
const { router } = require('./routes');

const app = express();

const allowedOrigins = config.corsOrigin
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

app.use(requestId);
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(mongoSanitize());
app.use(responseFormatter);

// Abuse prevention for high-risk endpoints.
app.use('/auth', authLimiter);
app.use('/worker/jobs/:jobId/applications', applyLimiter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(router);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
