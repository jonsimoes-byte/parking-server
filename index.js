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
      from: '+18339664635', // your Twilio number
      to: '+19704570677'    // your phone (for testing)
    });

    res.send('SMS sent!');
  } catch (err) {
    console.error(err);
    res.send('Error sending SMS');
  }
});

// ✅ MAIN AUTOMATION ROUTE (used by Twilio Studio)
app.post('/request-sms', async (req, res) => {
  try {
    const from = req.body.From;
    const lang = req.body.lang;

    // ✅ respond immediately
    res.sendStatus(200);

    let message;

    if (lang === 'es') {
      message = `S&K Servicios de Estacionamiento
Haga clic aquí para pagar y retirar el inmovilizador:
https://buy.stripe.com/00gbM58Co6Lt3zqcMP`;
    } else {
      message = `S&K Parking Services
Click here to pay to remove boot:
https://buy.stripe.com/00gbM58Co6Lt3zqcMP`;
    }

    // send SMS
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