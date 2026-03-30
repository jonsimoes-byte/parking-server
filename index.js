require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const twilio = require('twilio');
const axios = require('axios');

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

const client = twilio(accountSid, authToken);

// 🚀 Plate recognition function
async function recognizePlateFromUrl(imageUrl) {
  try {
    const response = await axios.post(
  'https://api.platerecognizer.com/v1/plate-reader/',
  {
    upload: imageUrl,
    regions: ["us"]
  },
  {
    headers: {
      Authorization: `Token ${process.env.PLATE_API_KEY}`
    }
  }
);

    const results = response.data.results;

    if (results && results.length > 0) {
      return results[0].plate;
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
      to: '+19704570677'
    });

    res.send('SMS sent!');
  } catch (err) {
    console.error(err);
    res.send('Error sending SMS');
  }
});

// ✅ MAIN SMS ROUTE
app.post('/request-sms', async (req, res) => {
  try {
    const from = req.body.From;
    const lang = req.body.lang;

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

    client.messages.create({
      body: message,
      from: '+18339664635',
      to: from
    });

  } catch (err) {
    console.error(err);
  }
});

// 🚀 PLATE SCAN ROUTE
app.get('/scan-plate', async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('Provide ?url=IMAGE_URL');
  }

  const plate = await recognizePlateFromUrl(imageUrl);

  if (plate) {
    res.send(`Plate detected: ${plate.toUpperCase()}`);
  } else {
    res.send('No plate detected');
  }
});

// ✅ HOMEPAGE
app.get('/', (req, res) => {
  res.send('Server Running (License Plate)');
});

// ✅ SERVER START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});