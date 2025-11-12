require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylnpvzy.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
});

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Root route
app.get('/', (req, res) => {
  res.send('🚀 Freelance Marketplace Server (Jobs CRUD) ✅');
});

async function run() {
  await client.connect();
  console.log('✅ MongoDB Connected');

  const db = client.db('freelance_marketplace');
  const jobs = db.collection('jobs');

  //  Create a new job
  app.post(
    '/jobs',
    asyncHandler(async (req, res) => {
      const newJob = { ...req.body, created_at: new Date(), status: 'open' };
      const result = await jobs.insertOne(newJob);
      res.send(result);
    })
  );

  //  Get all jobs
  app.get(
    '/jobs',
    asyncHandler(async (req, res) => {
      const sortOrder = req.query.sort === 'desc' ? -1 : 1;
      const query = req.query.email ? { userEmail: req.query.email } : {};
      const allJobs = await jobs
        .find(query)
        .sort({ created_at: sortOrder })
        .toArray();
      res.send(allJobs.filter(job => job.title && job.category));
    })
  );

  // Get a single job by ID
  app.get(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
      if (!job) return res.status(404).send({ message: 'Job not found' });
      res.send(job);
    })
  );

  // Update job ID
  app.patch(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const { _id, ...rest } = req.body;
      const update = { $set: { ...rest, updated_at: new Date() } };
      const result = await jobs.updateOne(
        { _id: new ObjectId(req.params.id) },
        update
      );
      res.send(result);
    })
  );

  //  Delete job ID
  app.delete(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const result = await jobs.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })
  );

  await client.db('admin').command({ ping: 1 });
  console.log('✅ MongoDB Ping OK');
}

run().catch(console.error);

app.listen(port, () => console.log(`🚀 Server running on port: ${port}`));
