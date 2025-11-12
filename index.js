require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylnpvzy.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
});

// Async error handler
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Root route
app.get('/', (req, res) => {
  res.send('🚀 Freelance Marketplace Server (Users Only) ✅');
});

async function run() {
  await client.connect();
  console.log('✅ MongoDB Connected');

  const db = client.db('freelance_marketplace');
  const users = db.collection('users');

  /** ===========================
   *  USERS FUNCTIONALITY
   * =========================== */

  // 👉 Create new user
  app.post(
    '/users',
    asyncHandler(async (req, res) => {
      const newUser = req.body;
      const existing = await users.findOne({ email: newUser.email });
      if (existing)
        return res.status(400).send({ message: 'User already exists' });

      const result = await users.insertOne(newUser);
      res.send(result);
    })
  );

  // 👉 Get user by email
  app.get(
    '/users',
    asyncHandler(async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: 'Email is required' });

      const user = await users.findOne({ email });
      res.send(user || { message: 'User not found' });
    })
  );

  await client.db('admin').command({ ping: 1 });
  console.log('✅ MongoDB Ping OK');
}

run().catch(console.error);

// Start server
app.listen(port, () => console.log(`🚀 Server running on port: ${port}`));
