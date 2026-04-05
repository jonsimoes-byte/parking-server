require('dotenv').config();

// ================== IMPORTS ==================
const express = require('express');
const twilio = require('twilio');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const XLSX = require('xlsx');

// ================== APP INIT ==================
const app = express();
const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== CONFIG ==================
const client = twilio(
  process.env.ACCOUNT_SID,
  process.env.AUTH_TOKEN
);

const TWILIO_NUMBER = '+18339664635';

// ================== EXCEL ==================
let excelPlates = [];

function loadExcel() {
  try {
    const workbook = XLSX.readFile('plates.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    excelPlates = data.map(row => row.plate.toUpperCase());

    console.log('Loaded plates:', excelPlates);
  } catch (err) {
    console.error('Excel error:', err.message);
  }
}

function isPlateValid(plate) {
  return excelPlates.includes(plate.toUpperCase());
}

// ================== HELPERS ==================

// 🔥 Plate recognition
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

// 🔥 Send SMS
async function sendViolationSMS(phone) {
  try {
    await client.messages.create({
      body: `S&K Parking Services
Click here to pay and remove boot:

https://bit.ly/SKParking`,
      from: TWILIO_NUMBER,
      to: phone
    });

    console.log('SMS sent to', phone);
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

// ================== ROUTES ==================

// ✅ Home
app.get('/', (req, res) => {
  res.send('🚗 Parking System Live');
});

// 🔥 Twilio webhook (CRITICAL)
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

    await client.messages.create({
      body: message,
      from: '+18339664635',
      to: from
    });

  } catch (err) {
    console.error(err);
  }
});

// 🚀 Camera scanner
app.get('/upload', (req, res) => {
  res.send(`
    <html>
      <body style="text-align:center; font-family:sans-serif;">
        <h2>Scan License Plate</h2>
        <video id="video" width="300" autoplay></video>
        <br><br>
        <button onclick="capture()" style="font-size:20px;">Scan Plate</button>
        <canvas id="canvas" style="display:none;"></canvas>

        <script>
          const video = document.getElementById('video');

          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
              video.srcObject = stream;
            });

          function capture() {
            const canvas = document.getElementById('canvas');
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0);

            canvas.toBlob(blob => {
              const formData = new FormData();
              formData.append('image', blob, 'photo.jpg');

              fetch('/upload-plate', {
                method: 'POST',
                body: formData
              })
              .then(res => res.text())
              .then(data => {
                document.body.innerHTML = "<h2>" + data + "</h2>";
              });
            }, 'image/jpeg');
          }
        </script>
      </body>
    </html>
  `);
});

// 🚀 Scan + Excel validation
app.post('/upload-plate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.send('No image uploaded');
    }

    const plate = await recognizePlateFromBuffer(req.file.buffer);

    if (!plate) {
      return res.send('No plate detected');
    }

    const valid = isPlateValid(plate);

    if (valid) {
      return res.send(`
        <h2 style="color:green;">✅ VALID PERMIT</h2>
        <p>${plate}</p>
      `);
    } else {
      await sendViolationSMS('+19704570677');

      return res.send(`
        <h2 style="color:red;">❌ NO PERMIT</h2>
        <p>${plate}</p>
        <p>Payment link sent</p>
      `);
    }

  } catch (err) {
    console.error(err);
    res.send('Error scanning plate');
  }
});

// 🔄 Reload Excel
app.get('/reload-excel', (req, res) => {
  loadExcel();
  res.send('Excel reloaded');
});

// ================== START ==================
loadExcel();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});