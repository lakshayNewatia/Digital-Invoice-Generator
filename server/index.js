const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      if (origin.includes('.vercel.app')) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Handle preflight requests
app.options('/*', cors());


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static('uploads'));
app.use('/api/users', require('./routes/users'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/items', require('./routes/items'));
app.use('/api/fx', require('./routes/fx'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/email', require('./routes/email'));

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
