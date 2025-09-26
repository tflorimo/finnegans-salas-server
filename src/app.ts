import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
// setup de CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  })
);

app.use(express.json());

app.use('/api', routes);

export default app;