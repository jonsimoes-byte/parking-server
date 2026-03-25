const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

const twilio = require('twilio');

// 🔐 Replace these with your real credentials
require('dotenv').config();

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

const client = twilio(accountSid, authToken);

// ✅ TEST ROUTE (this is what was missing)
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

// homepage
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

app.post('/request-sms', async (req, res) => {
  try {
    const from = req.body.From;

    await client.messages.create({
      body: "Pay your parking violation here: https://buy.stripe.com/00gbM58Co6Lt3zqcMP",
      from: '+18339664635',
      to: from
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});