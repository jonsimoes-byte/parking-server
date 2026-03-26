require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

const twilio = require('twilio');

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

const client = twilio(accountSid, authToken);

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
https://buy.stripe.com/5kQ7sK7dSaO49EpgOq4ZG05`;
    } else {
      message = `S&K Parking Services
Click here to pay to remove boot:
https://buy.stripe.com/00gbM58Co6Lt3zqcMP`;
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

// ✅ HOMEPAGE
app.get('/', (req, res) => {
  res.send('Server is running');
});

// ✅ REQUIRED FOR RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});