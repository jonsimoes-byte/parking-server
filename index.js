require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const twilio = require('twilio');

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

const client = twilio(accountSid, authToken);

const axios = require('axios');

async function recognizePlateFromUrl(imageUrl) {
  try {
    const response = await axios.post(
      'https://api.platerecognizer.com/v1/plate-reader/',
      { upload: imageUrl },
      {
        headers: {
          Authorization: `Token ${process.env.PLATE_API_KEY}`
        }
      }
    );

    const results = response.data.results;

    if (results && results.length > 0) {
      return results[0].plate; // e.g. "abc123"
    }
    return null;
  } catch (err) {
    console.error('Plate API error:', err.response?.data || err.message);
    return null;
  }
}
// ✅ TEST ROUTE
app.get('/send-sms', async (req, res) => {
  try {
    await client.messages.create({
      body: "Test SMS from your parking system 🚗",
      from: '+18339664635',
      to: '+19704570677' // your number for testing
    });

    res.send('SMS sent!');
  } catch (err) {
    console.error(err);
    res.send('Error sending SMS');
  }
});

// ✅ MAIN ROUTE (Twilio hits this)
app.post('/request-sms', async (req, res) => {
  try {
    const from = req.body.From;
    const lang = req.body.lang;

    // ✅ respond immediately (prevents call delay/cutoff)
    res.sendStatus(200);

    let message;

    if (lang === 'es') {
      message = `S&K Servicios de Estacionamiento
Pague aquí para retirar el inmovilizador:

https://bit.ly/SKParkingesp`;
    } else {
      message = `S&K Parking Services
Click here to pay and remove boot:

https://bit.ly/SKParking`;
    }

    // send SMS (runs after response)
    client.messages.create({
      body: message,
      from: '+18339664635',
      to: from
    });

  } catch (err) {
    console.error(err);
  }
});

app.get('/scan-plate', async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('Provide ?url=IMAGE_URL');
  }

  const plate = await recognizePlateFromUrl(imageUrl);

  if (plate) {
    return res.send(`Plate detected: ${plate.toUpperCase()}`);
  } else {
    return res.send('No plate detected');
  }
});
// ✅ HOMEPAGE
app.get('/', (req, res) => {
  res.send('Server is running');
});

// ✅ REQUIRED FOR RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
//test change

app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  // ✅ Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log('💰 PAYMENT RECEIVED');

    console.log({
      amount: session.amount_total,
      customer: session.customer_details,
      metadata: session.metadata
    });

    // 👇 You can later store this in DB
  }

  res.sendStatus(200);
});