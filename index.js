require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ylnpvzy.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
});

app.get('/', (req, res) => {
  res.send('🚀 Freelance Marketplace Server is Running ✅');
});

async function run() {
  try {
    await client.connect();
    console.log('✅ MongoDB Connected');

    const db = client.db('freelance_marketplace');
    const users = db.collection('users');
    const jobs = db.collection('jobs');

    /** USERS */
    app.post('/users', async (req, res) => {
      try {
        const newUser = req.body;
        const existingUser = await users.findOne({ email: newUser.email });
        if (existingUser) {
          return res.status(400).send({ message: 'User exists' });
        }
        const result = await users.insertOne(newUser);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/users', async (req, res) => {
      try {
        if (!req.query.email)
          return res.status(400).send({ message: 'Email missing' });
        const user = await users.findOne({ email: req.query.email });
        res.send(user);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    /** JOBS */
    app.get('/jobs/latest', async (req, res) => {
      try {
        const latestJobs = await jobs
          .find({})
          .sort({ created_at: -1 })
          .limit(6)
          .toArray();
        res.send(latestJobs);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/jobs', async (req, res) => {
      try {
        const sort = req.query.sort === 'desc' ? -1 : 1;
        const query = req.query.email ? { userEmail: req.query.email } : {};
        const allJobs = await jobs
          .find(query)
          .sort({ created_at: sort })
          .toArray();
        res.send(allJobs.filter(job => job.title && job.category));
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/jobs/:id', async (req, res) => {
      try {
        const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
        if (!job) return res.status(404).send({ message: 'Job not found' });
        res.send(job);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.post('/jobs', async (req, res) => {
      try {
        const newJob = { ...req.body, created_at: new Date(), status: 'open' };
        const result = await jobs.insertOne(newJob);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.patch('/jobs/:id', async (req, res) => {
      try {
        const { _id, ...rest } = req.body;
        const update = { $set: { ...rest, updated_at: new Date() } };
        const result = await jobs.updateOne(
          { _id: new ObjectId(req.params.id) },
          update
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.delete('/jobs/:id', async (req, res) => {
      try {
        const result = await jobs.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    /** ACCEPT / DONE */
    app.patch('/jobs/:id/accept', async (req, res) => {
      try {
        const { userEmail, userName } = req.body;
        if (!userEmail)
          return res.status(400).send({ message: 'userEmail required' });

        const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
        if (!job) return res.status(404).send({ message: 'Job not found' });
        if (job.userEmail === userEmail)
          return res
            .status(400)
            .send({ message: 'Cannot accept your own job' });
        if (job.status === 'accepted')
          return res.status(400).send({ message: 'Job already accepted' });

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
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.patch('/jobs/:id/done', async (req, res) => {
      try {
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
        const result = await jobs.updateOne(query, update);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    /** MY TASKS & POSTS */
    app.get('/my-accepted-tasks', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: 'Email required' });
        const tasks = await jobs
          .find({
            acceptedBy: email,
            status: { $in: ['accepted', 'completed'] },
          })
          .sort({ status: 1, updated_at: -1 })
          .toArray();
        res.json(tasks);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/my-posted-jobs', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: 'Email required' });
        const postedJobs = await jobs
          .find({ userEmail: email })
          .sort({ created_at: -1 })
          .toArray();
        res.json(postedJobs);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    /** CATEGORY & SEARCH */
    app.get('/jobs/category/:category', async (req, res) => {
      try {
        const allJobs = await jobs
          .find({ category: new RegExp(req.params.category, 'i') })
          .sort({ created_at: -1 })
          .toArray();
        res.json(allJobs);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    app.get('/jobs/search/:query', async (req, res) => {
      try {
        const allJobs = await jobs
          .find({
            $or: [
              { title: new RegExp(req.params.query, 'i') },
              { category: new RegExp(req.params.query, 'i') },
              { summary: new RegExp(req.params.query, 'i') },
              { tags: new RegExp(req.params.query, 'i') },
            ],
          })
          .sort({ created_at: -1 })
          .toArray();
        res.json(allJobs);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB Ping OK');
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.error);

app.listen(port, () => console.log(`🚀 Server running on port: ${port}`));
