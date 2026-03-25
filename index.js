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
    console.log("Incoming request:", req.body);

    const from = req.body.From;

    await client.messages.create({
      body: `S&K Parking Services
Click here to pay to remove boot:
https://buy.stripe.com/00gbM58Co6Lt3zqcMP`,
      from: '+18339664635',
      to: from
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
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