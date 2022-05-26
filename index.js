const express = require('express')
const app = express()
const port = process.env.PORT;
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.SECRET_KEY)


//middleware
app.use(cors())
app.use(express.json());

//connected mongo db
console.log(process.env.DB_PASS)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6fdz7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  await client.connect();
  const productCollection = client.db('lukas').collection('products');
  const orderCollection = client.db('lukas').collection('orders');
  const reviewCollection = client.db('lukas').collection('reviews');
  const userCollection = client.db('lukas').collection('users');
  const paymentCollection = client.db('lukas').collection('payments');
  const userprofileCollection = client.db('lukas').collection('userprofile');
  try {


    //verify jwt token
    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        console.log('fucnt', decoded)
        next();
      })
    }


    //verfiy admin 
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }
    }

     //user profile  added info form
     app.post('/userprofile', async (req, res) => {
      const newUser = req.body;
      const result = await userprofileCollection.insertOne(newUser);
      res.send(result)
    })
     app.get('/userprofile', async (req, res) => {
      const query = {}
      const cursor = userprofileCollection.find(query)
      const userprofiles = await cursor.toArray()
      res.send(userprofiles)
    })

    //each user profile 
    app.get('/useprofile', async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail)
      const useremail = req.query.useremail;
      const query = { useremail: useremail };
      console.log('client', useremail)
      if (useremail === decodedEmail) {
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      }

    })

    
    //API CREATED ALL PRODUCT

    app.get('/product', async (req, res) => {
      const query = {}
      const cursor = productCollection.find(query)
      const products = await cursor.toArray()
      res.send(products)
    })

    //single product 
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const product = await productCollection.findOne(query);
      res.send(product)
    })

    // adding order quantity
    app.put('/product/:id', async (req, res) => {
      const id = req.params.id;
      const productUpdate = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          orderQunatity: productUpdate.orderQunatity
        },
      };
      const result = await productCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })


    // update pending status all orders 
    app.put('/order/:id', async (req, res) => {
      const id = req.params.id;
      const orderUpdate = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          shipped: true
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })


    //orders api created
    app.get('/order', async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders)
    })

    //query email each
    app.get('/useorder', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail)
      const clientemail = req.query.clientemail;
      const query = { clientemail: clientemail };
      console.log('client', clientemail)
      if (clientemail === decodedEmail) {
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      }

    })

    //order info plcement added
    app.post('/order', async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result)
    })


    //add post review
    app.post('/review', async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result)
    })

    
    //add product
    app.post('/product', async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result)
    })


    //delete product
    app.delete('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await productCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await orderCollection.findOne(query)
      res.send(result)
    })
    //delete order
    app.delete('/order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })


    //api review get


    app.get('/review', async (req, res) => {
      const query = {}
      const cursor = reviewCollection.find(query)
      const reviews = await cursor.toArray()
      res.send(reviews)
    })


    //LOGIN TIME JWT TOKEN 


    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const accessToken = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
      res.send({ result, accessToken })
    })


    //users api created
    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users)
    })


    //admin get database only admin showing all user
    app.get('/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email })
      // console.log(user.role)
      // const role=req.params.role;
      const isAdmin = (user.role === 'admin');
      res.send({ admin: isAdmin })
    })



    //admin created 
    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      // console.log(requester)
      const user = await userCollection.findOne({ email: requester });
      // const role = req.params.role;
      if (user.role == 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result)
      }
      else {
        return res.status(403).send({ message: 'forbidden access' })
      }

    })


    // //PAYMENT SUCESSS API CREATED
    app.post("/create-payment-intent", async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });


    // //payment store
    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const payment = req.body;
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transaction,
        }
      }
      const updatebooking = await orderCollection.updateOne(filter, updatedDoc)
      const result = await paymentCollection.insertOne(payment)
      res.send(updatedDoc)
    })






  }
  finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello tweleve World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})