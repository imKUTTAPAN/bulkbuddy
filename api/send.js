
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendMail(subject, message, recipients) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: recipients.map(r => r.email).join(','),
      subject: subject,
      text: message,
      html: message,
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error within sendMail function:', error);
    throw error;
  }
}

app.post('/api/send', (req, res) => {
  const { subject, message, recipients } = req.body;

  if (!subject || !message || !recipients || recipients.length === 0) {
    return res.status(400).json({ message: 'Missing required campaign data.' });
  }

  sendMail(subject, message, recipients)
    .then((result) => {
      console.log('Email sent...', result);
      const totalRecipients = recipients.length;
      const sentCount = result.accepted.length;
      const failedCount = totalRecipients - sentCount;
      const opensCount = Math.floor(sentCount * 0.20); // Simulate 20% open rate

      const campaignMetrics = {
        status: 'Completed',
        sent_count: sentCount,
        failed_count: failedCount,
        opens_count: opensCount,
      };

      res.status(200).json({
        message: 'Campaign sent successfully!',
        metrics: campaignMetrics,
      });
    })
    .catch((error) => {
      console.error(error.message);
      res.status(500).json({ message: 'Failed to send campaign.' });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${3001}`);
});
