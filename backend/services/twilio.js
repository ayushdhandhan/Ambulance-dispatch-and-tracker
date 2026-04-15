const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

const sendSMS = async (to, body) => {
  if (!client) {
    console.error('Twilio client not initialized. Check .env variables.');
    return false;
  }
  try {
    const message = await client.messages.create({
      body: body,
      from: twilioPhoneNumber,
      to: to
    });
    console.log(`[Twilio] SMS dispatched to ${to}: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('[Twilio] Failed to send SMS:', error.message || error);
    return false;
  }
};

module.exports = {
  sendSMS
};
