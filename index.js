require('dotenv').config();

// ================== IMPORTS ==================
const express = require('express');
const twilio = require('twilio');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

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

// ================== DATABASE ==================
const tenants = {};
const visitors = [];

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
function cleanVisitors() {
  const now = Date.now();

  for (let i = visitors.length - 1; i >= 0; i--) {
    if (visitors[i].expires < now) {
      visitors.splice(i, 1);
    }
  }
}
// 🔥 Check permit
function isPlateValid(plate) {
  const formatted = plate.toUpperCase();

  // ✅ Check tenant plates
  const tenantValid = Object.values(tenants).some(list =>
    list.includes(formatted)
  );

  if (tenantValid) return true;

  // ✅ Check visitors
  cleanVisitors();

  const visitorValid = visitors.some(v => v.plate === formatted);

  return visitorValid;
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
app.get('/tenant', (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif; text-align:center;">
        <h2>Tenant Parking Portal</h2>

        <h3>Add Plate</h3>
        <form action="/add-plate" method="POST">
          <input name="name" placeholder="Your Name or Unit" required /><br><br>
          <input name="plate" placeholder="License Plate" required /><br><br>
          <button>Add Plate</button>
        </form>

        <br><hr><br>

        <h3>Remove Plate</h3>
        <form action="/remove-plate" method="POST">
          <input name="name" placeholder="Your Name or Unit" required /><br><br>
          <input name="plate" placeholder="License Plate" required /><br><br>
          <button>Remove Plate</button>
        </form>

        <br><hr><br>

        <h3>View Plates</h3>
        <form action="/view-plates" method="GET">
          <input name="name" placeholder="Your Name or Unit" required /><br><br>
          <button>View Plates</button>
        </form>

      </body>
    </html>
  `);
});

<h3>View My Plates</h3>
<form action="/view-plates" method="GET">
  <input name="name" placeholder="Your Name or Unit" required /><br><br>
  <button>View Plates</button>
</form>
app.get('/view-plates', (req, res) => {
  const { name } = req.query;

  if (!name || !tenants[name]) {
    return res.send('No plates found');
  }

  const plates = tenants[name];

  res.send(`
    <h2>Plates for ${name}</h2>
    <ul>
      ${plates.map(p => `<li>${p}</li>`).join('')}
    </ul>
    <a href="/tenant">Back</a>
  `);
});
app.post('/remove-plate', (req, res) => {
  const { name, plate } = req.body;

  if (!tenants[name]) {
    return res.send('Tenant not found');
  }

  const formatted = plate.toUpperCase();

  tenants[name] = tenants[name].filter(p => p !== formatted);

  res.send('Plate removed');
});
// ➕ Add plate
app.post('/add-plate', (req, res) => {
  const { name, plate } = req.body;

  if (!name || !plate) {
    return res.send('Missing name or plate');
  }

  const formatted = plate.toUpperCase();

  if (!tenants[name]) {
    tenants[name] = [];
  }

  if (tenants[name].length >= 2) {
    return res.send('Max 2 plates allowed');
  }

  if (tenants[name].includes(formatted)) {
    return res.send('Plate already exists');
  }

  tenants[name].push(formatted);

  console.log('Tenants:', tenants);

  res.send('Plate added');
});
app.post('/add-visitor', (req, res) => {
  const { plate, hours } = req.body;

  if (!plate) {
    return res.send('Missing plate');
  }

  const expiration = Date.now() + (hours || 24) * 60 * 60 * 1000;

  visitors.push({
    plate: plate.toUpperCase(),
    expires: expiration
  });

  console.log('Visitors:', visitors);

  res.send('Visitor pass added');
});
app.post('/remove-visitor', (req, res) => {
  const { plate } = req.body;

  const formatted = plate.toUpperCase();

  const index = visitors.findIndex(v => v.plate === formatted);

  if (index === -1) {
    return res.send('Visitor not found');
  }

  visitors.splice(index, 1);

  res.send('Visitor removed');
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

// 🚀 Scan + enforcement
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
      // 🔥 TRIGGER SMS (FOR NOW SEND TO YOU)
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

// ================== START ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});