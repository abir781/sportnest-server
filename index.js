require('dotenv').config();
const express = require('express');
const cors = require('cors');



const app=express();
const port=process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.knekqnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// app.use(cors({
//   origin: 'http://localhost:5173', // frontend origin
//   credentials: true // only if you're using cookies
// }));

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const courtscollection=client.db('sportnest').collection('court');
    const bookingsCollection=client.db('sportnest').collection('bookings');
    const paymentsCollection = client.db('sportnest').collection('payments');
    const usersCollection = client.db('sportnest').collection('users');
    const couponsCollection = client.db('sportnest').collection('coupons');
    // Send a ping to confirm a successful connection


    app.post('/users',async(req,res)=>{
      const email=req.body.email;
      const userExists= await usersCollection.findOne({email});
      if(userExists){
        return res.status(200).send({message:'user already exist',inserted:false});

      }

      const user=req.body;
      const result= await usersCollection.insertOne(user);
      res.send(result);
    })



     app.get('/courts',async(req,res)=>{
      const page=parseInt(req.query.page);
      const size=parseInt(req.query.size);
      const result=await courtscollection.find()
      .skip(page*size)
      .limit(size)
      .toArray();
      res.send(result);
    })

     app.get('/courtscount',async(req,res)=>{
      const count=await courtscollection.estimatedDocumentCount();
      res.send({count});
    })

    app.post('/courts', async (req, res) => {
  const court = req.body;
  const result = await courtscollection.insertOne(court);
  res.send(result);
});

app.delete('/courts/:id', async (req, res) => {
  const id = req.params.id;
  const result = await courtscollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// UPDATE court
app.patch('/courts/:id', async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  const result = await courtscollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  res.send(result);
});


app.get('/announcements', async (req, res) => {
  const announcements = await client.db('sportnest').collection('announcements').find().sort({ createdAt: -1 }).toArray();
  res.send(announcements);
});

app.post('/announcements', async (req, res) => {
  const announcement = {
    ...req.body,
    createdAt: new Date()
  };
  const result = await client.db('sportnest').collection('announcements').insertOne(announcement);
  res.send(result);
});

app.patch('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  const update = { $set: req.body };
  const result = await client.db('sportnest').collection('announcements').updateOne({ _id: new ObjectId(id) }, update);
  res.send(result);
});

app.delete('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  const result = await client.db('sportnest').collection('announcements').deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});


    app.get('/users', async (req, res) => {
  const search = req.query.search || '';

  const query = {
    name: { $regex: search, $options: 'i' } // Only match name
  };

  try {
    const users = await client.db('sportnest').collection('users').find(query).toArray();
    res.send(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/users/role/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send({ role: user.role || 'user' }); // default to 'user' if role not set
  } catch (error) {
    console.error('Error getting user role:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


//     app.get('/bookings', async (req, res) => {
//   const email = req.query.email;

//   let query = {};
//   if (email) {
//     query = { userEmail: email };
//   }

//   try {
//     const result = await bookingsCollection.find(query).toArray();
//     res.send(result);
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).send({ message: 'Server error' });
//   }
// });

app.get('/bookings', async (req, res) => {
  const email = req.query.email;

  let query = { status: 'pending' }; // Always filter pending

  if (email) {
    // query.email = email; // Add email condition if present
    query.userEmail = email;
  }

  const result = await bookingsCollection.find(query).toArray();
  res.send(result);
});

app.get('/bookings/approved', async (req, res) => {
  const email = req.query.email;

  let query = { status: 'approved' }; // Always filter approved

  if (email) {
    query.userEmail = email; // Filter by user if email is present
  }

  const result = await bookingsCollection.find(query).toArray();
  res.send(result);
});

app.get('/bookings/approved/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const query = {
      _id: new ObjectId(id),
      status: 'approved'
    };

    const booking = await bookingsCollection.findOne(query);

    if (!booking) {
      return res.status(404).send({ message: 'Approved booking not found' });
    }

    res.send(booking);
  } catch (error) {
    console.error('Error fetching approved booking:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/bookings/confirmed', async (req, res) => {
  const email = req.query.email;
  const query = { status: 'confirmed' };

  if (email) {
    query.userEmail = email;
  }

  const result = await bookingsCollection.find(query).toArray();
  res.send(result);
});

app.get('/payments', async (req, res) => {
  const email = req.query.email;
  const query = email ? { email } : {};

  try {
    const result = await client.db('sportnest').collection('payments').find(query).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/coupons', async (req, res) => {
  try {
    const coupons = await couponsCollection.find().toArray();
    res.send(coupons);
  } catch (error) {
    console.error('Failed to fetch coupons:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/bookings/manage', async (req, res) => {
  const search = req.query.search || '';
  const query = {
    status: 'confirmed',
    courtType: { $regex: search, $options: 'i' } // courtType contains the title
  };

  try {
    const bookings = await bookingsCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(bookings);
  } catch (error) {
    console.error('Error fetching confirmed bookings:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/members', async (req, res) => {
  const search = req.query.search || '';
  const query = {
    role: 'member',
    name: { $regex: search, $options: 'i' },
  };

  try {
    const result = await usersCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get user by email from users collection
app.get('/users/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/admin/stats', async (req, res) => {
  try {
    const totalCourts = await courtscollection.estimatedDocumentCount();
    const totalUsers = await usersCollection.estimatedDocumentCount();
    const totalMembers = await usersCollection.countDocuments({ role: 'member' });

    res.send({ totalCourts, totalUsers, totalMembers });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.get('/coupons/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const coupon = await client.db('sportnest').collection('coupons').findOne({ code });
    if (!coupon) {
      return res.status(404).send({ message: 'Invalid coupon' });
    }
    res.send(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get all coupons
app.get('/coupons', async (req, res) => {
  try {
    const coupons = await client.db('sportnest').collection('coupons').find().toArray();
    res.send(coupons);
  } catch (err) {
    res.status(500).send({ message: 'Failed to fetch coupons' });
  }
});

// Add a coupon
app.post('/coupons', async (req, res) => {
  try {
    const result = await client.db('sportnest').collection('coupons').insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Failed to add coupon' });
  }
});

// Delete a coupon
app.delete('/coupons/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await client.db('sportnest').collection('coupons').deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Failed to delete coupon' });
  }
});

// Update a coupon
app.patch('/coupons/:id', async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  try {
    const result = await client.db('sportnest').collection('coupons').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Failed to update coupon' });
  }
});



// app.get('/bookings', async (req, res) => {
//   const email = req.query.email;
//   console.log('Fetching bookings for email:', email);

//   const query = {
//     status: 'pending',
//     ...(email && { email }) // Only adds 'email' key if it's truthy
//   };

//   try {
//     const result = await bookingsCollection.find(query).toArray();
//     res.send(result);
//   } catch (err) {
//     console.error('Error fetching bookings:', err);
//     res.status(500).send({ message: 'Server error' });
//   }
// });

app.delete('/members/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).send({ message: 'Failed to delete member' });
  }
});

// app.patch('/bookings/:id', async (req, res) => {
//   const id = req.params.id;
//   const { status,email } = req.body;

//   if (!status) {
//     return res.status(400).send({ message: 'Status is required.' });
//   }

//   try {
//     const filter = { _id: new ObjectId(id) };
//     const updateDoc = {
//       $set: {
//         status: status
//       }
//     };

//     const result = await bookingsCollection.updateOne(filter, updateDoc);

//     if(status==='approved'){
//       const userQuery={email};
//       const userupdateDoc={
//         $set:{
//           role:'member'
//         }
//       };
//       const roleresult= await usersCollection.updateOne(userQuery,userupdateDoc)
//     }

//     if (result.modifiedCount === 0) {
//       return res.status(404).send({ message: 'Booking not found or status already set.' });
//     }

//     res.send({ message: 'Booking status updated successfully.', result });
//   } catch (error) {
//     console.error('Failed to update booking status:', error);
//     res.status(500).send({ message: 'Server error' });
//   }
// });


app.patch('/bookings/:id', async (req, res) => {
  const id = req.params.id;
  const { status, email } = req.body;

  if (!status) {
    return res.status(400).send({ message: 'Status is required.' });
  }

  try {
    // 1. Update booking status
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: status
      }
    };

    const result = await bookingsCollection.updateOne(filter, updateDoc);

    // 2. If approved, update user role + membership time
    if (status === 'approved') {
      const userQuery = { email };
      const userUpdateDoc = {
        $set: {
          role: 'member',
          membership_created_at: new Date().toISOString()  // ✅ Store time of becoming member
        }
      };
      await usersCollection.updateOne(userQuery, userUpdateDoc);
    }

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'Booking not found or status already set.' });
    }

    res.send({ message: 'Booking status updated successfully.', result });
  } catch (error) {
    console.error('Failed to update booking status:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


    app.post('/bookings', async (req, res) => {
  try {
    const booking = req.body;
    booking.createdAt = new Date();
    const result = await bookingsCollection.insertOne(booking);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Failed to book', error: err.message });
  }
});

app.post('/payments', async (req, res) => {
  const payment = req.body;
  const bookingId = payment.bookingId;

  try {
    // 1. ✅ Insert payment into `payments` collection
    const paymentResult = await paymentsCollection.insertOne(payment);

    // 2. ✅ Update the booking's status to 'confirmed'
    const bookingUpdateResult = await bookingsCollection // ✅ this is correct for your collection
.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: { status: 'confirmed' } }
      );

    res.send({
      message: 'Payment saved and booking confirmed',
      insertedId: paymentResult.insertedId,
      bookingUpdate: bookingUpdateResult.modifiedCount,
    });
  } catch (error) {
    console.error('Error storing payment and updating booking:', error);
    res.status(500).json({ error: 'Failed to save payment and update booking' });
  }
});



  app.delete('/bookings/:id', async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: 'Invalid booking ID' });
  }

  try {
    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
     res.status(200).send({ success: true, message: 'Booking deleted' });
    } else {
      res.status(404).send({ success: false, message: 'Booking not found' });
    }
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

app.post('/create-payment-intent',async(req,res)=>{
  const {amount}=req.body;
  try{
    const paymentIntent= await stripe.paymentIntents.create({
      amount,
      currency:'usd',
      payment_method_types:['card'],
    });
    res.json({clientSecret:paymentIntent.client_secret})
  } catch(error){
    res.status(500).json({error:error.message})
  }

})


    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


 app.get('/', (req, res) => {
      res.send("Backend is running with native MongoDB");
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});