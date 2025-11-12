require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
  res.send('🚀 Freelance Marketplace Server (Job Accept & Done System) ✅');
});

async function run() {
  await client.connect();
  console.log('✅ MongoDB Connected');

  const db = client.db('freelance_marketplace');
  const jobs = db.collection('jobs');

  /** ===========================
   *  JOBS CRUD FUNCTIONALITY
   * =========================== */

  app.post(
    '/jobs',
    asyncHandler(async (req, res) => {
      const newJob = { ...req.body, created_at: new Date(), status: 'open' };
      const result = await jobs.insertOne(newJob);
      res.send(result);
    })
  );

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

  app.get(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
      if (!job) return res.status(404).send({ message: 'Job not found' });
      res.send(job);
    })
  );

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

  app.delete(
    '/jobs/:id',
    asyncHandler(async (req, res) => {
      const result = await jobs.deleteOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })
  );

  /** ===========================
   *  JOB ACCEPT & DONE SYSTEM
   * =========================== */

  // 👉 Accept a job
  app.patch(
    '/jobs/:id/accept',
    asyncHandler(async (req, res) => {
      const { userEmail, userName } = req.body;
      if (!userEmail)
        return res
          .status(400)
          .json({ success: false, message: 'userEmail required' });

      const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
      if (!job)
        return res
          .status(404)
          .json({ success: false, message: 'Job not found' });
      if (job.userEmail === userEmail)
        return res
          .status(400)
          .json({ success: false, message: 'Cannot accept your own job' });
      if (job.status === 'accepted')
        return res
          .status(400)
          .json({ success: false, message: 'Job already accepted' });

      await jobs.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            acceptedBy: userEmail,
            acceptedByName: userName || 'Unknown',
            status: 'accepted',
            updated_at: new Date(),
          },
        }
      );

      const updatedJob = await jobs.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.json({
        success: true,
        message: 'Job accepted successfully',
        data: updatedJob,
      });
    })
  );

  // 👉 Mark job done or cancel
  app.patch(
    '/jobs/:id/done',
    asyncHandler(async (req, res) => {
      const { action } = req.body;
      const query = { _id: new ObjectId(req.params.id) };
      let update;

      if (action === 'done')
        update = {
          $set: {
            status: 'completed',
            completed_at: new Date(),
            updated_at: new Date(),
          },
        };
      else if (action === 'cancel')
        update = {
          $set: { acceptedBy: null, status: 'open', updated_at: new Date() },
        };
      else return res.status(400).json({ message: 'Invalid action' });

      const result = await jobs.updateOne(query, update);
      res.send(result);
    })
  );

  await client.db('admin').command({ ping: 1 });
  console.log('✅ MongoDB Ping OK');
}

run().catch(console.error);

// Start server
app.listen(port, () => console.log(`🚀 Server running on port: ${port}`));
