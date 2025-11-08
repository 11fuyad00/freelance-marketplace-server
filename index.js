require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylnpvzy.mongodb.net/?appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Root route
app.get('/', (req, res) => {
  res.send('freelance marketplace server is running');
});

async function run() {
  try {
    await client.connect();
    console.log('✅ MongoDB Connected Successfully');

    const db = client.db('freelance_marketplace');
    const jobsCollection = db.collection('jobs');

    // ✅ GET all jobs
    app.get('/jobs', async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ✅ GET job by ID
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // ✅ POST new job
    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // ✅ PATCH update job
    app.patch('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const updatedJobs = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          title: updatedJobs.title,
          description: updatedJobs.description,
          category: updatedJobs.category,
          price_min: updatedJobs.price_min,
          price_max: updatedJobs.price_max,
          status: updatedJobs.status,
          updated_at: new Date(),
        },
      };
      const result = await jobsCollection.updateOne(query, update);
      res.send(result);
    });

    // ✅ DELETE job
    app.delete('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log('✅ Pinged your deployment. Connection OK.');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}
run().catch(console.dir);

// ✅ Keep the client open
app.listen(port, () => {
  console.log(` Freelance Marketplace server running on port: ${port}`);
});
