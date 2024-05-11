const express = require('express');
const cors = require("cors");
require('dotenv').config();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gnbvncz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// middlewares

const logger = (req, res, next) => {
  console.log("log info - ", req.method, req.url)
  next()
}


const verifyToken = (req, res, next) => {
  // console.log(req.cookies)
  const token = req?.cookies?.token;
  console.log('first token in the middleware -', token);
  console.log('second token in the middleware -', token);
  // no token available 
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access - no token' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('car-doctor').collection('services')
    const bookingCollection = client.db('car-doctor').collection('bookings')

    // auth related api 
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body
      console.log('user for token', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body
      console.log('logging out', user)
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })


    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id
      // console.log(id)                      used for checking that which line is the problem debugging
      const query = { _id: new ObjectId(id) }

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 }
      }
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })


    app.post('/bookings', async (req, res) => {
      const booking = req.body
      // console.log(booking)
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    app.get('/bookings', logger, verifyToken, async (req, res) => {
      console.log("query email", req.query.email)
      console.log("user email", req.user)
      console.log('cook cookies', req.cookies)

      /* if (req.user.email !== req.query.email) {
         return res.status(403).send({ message: 'forbidden access!' })
       }*/
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = bookingCollection.find(query)
      const result = await cursor.toArray()
      // console.log(result)
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id)
      const query = { _id: new ObjectId(id) }
      const updatedBooking = req.body
      // console.log(updatedBooking)
      const updated = {
        $set: {
          status: updatedBooking.status
        },
      }
      // console.log(updated)
      const result = await bookingCollection.updateOne(query, updated)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('doctor is coming')
})

app.listen(port, () => {
  console.log(`car doctor server is running on port ${port}`)
})