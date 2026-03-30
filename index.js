require('dotenv').config();

const express = require('express');
const app = express();

const twilio = require('twilio');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

const client = twilio(accountSid, authToken);

//
// 🔥 HELPER: Scan plate from uploaded file
//
async function recognizePlateFromBuffer(buffer) {
  try {
    const formData = new FormData();

    formData.append('upload', buffer, {
      filename: 'plate.jpg'
    });

    formData.append('regions', 'us');

    const response = await axios.post(
      'https://api.platerecognizer.com/v1/plate-reader/',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Token ${process.env.PLATE_API_KEY}`
        }
      }
    );

    const results = response.data.results;

    if (results && results.length > 0) {
      return results[0].plate.toUpperCase();
    }

    return null;

  } catch (err) {
    console.error('Plate API error:', err.response?.data || err.message);
    return null;
  }
}

//
// 🔥 OPTIONAL: scan from URL (for testing)
//
async function recognizePlateFromUrl(imageUrl) {
  try {
    const response = await axios.post(
      'https://api.platerecognizer.com/v1/plate-reader/',
      {
        upload_url: imageUrl,
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
      return results[0].plate.toUpperCase();
    }

    return null;

  } catch (err) {
    console.error('Plate API error:', err.response?.data || err.message);
    return null;
  }
}

//
// ✅ TEST SMS
//
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

//
// ✅ MAIN SMS AUTOMATION
//
app.post('/request-sms', async (req, res) => {
  try {
    const from = req.body.From;
    const lang = req.body.lang;

    res.sendStatus(200); // respond instantly

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

    await client.messages.create({
      body: message,
      from: '+18339664635',
      to: from
    });

  } catch (err) {
    console.error(err);
  }
});

//
// 🚀 PHONE UPLOAD PAGE (THIS IS YOUR REAL TOOL)
//
app.get('/upload', (req, res) => {
  res.send(`
    <h2>Scan License Plate</h2>
    <form action="/upload-plate" method="post" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/*" capture="environment" />
      <br><br>
      <button type="submit">Scan Plate</button>
    </form>
  `);
});

//
// 🚀 HANDLE PHOTO UPLOAD + SCAN
//
app.post('/upload-plate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.send('No image uploaded');
    }

    const plate = await recognizePlateFromBuffer(req.file.buffer);

    if (plate) {
      return res.send(`Plate detected: ${plate}`);
    }

    res.send('No plate detected');

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.send('Error scanning plate');
  }
});

//
// 🚀 URL TEST ROUTE (optional)
//
app.get('/scan-plate', async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('Provide ?url=IMAGE_URL');
  }

  const plate = await recognizePlateFromUrl(imageUrl);

  if (plate) {
    res.send(`Plate detected: ${plate}`);
  } else {
    res.send('No plate detected');
  }
});

//
// ✅ HOMEPAGE
//
app.get('/', (req, res) => {
  res.send('Server Running (Plate System Ready)');
});

//
// ✅ START SERVER
//
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});