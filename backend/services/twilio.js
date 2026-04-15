const twilio = require('twilio');
const { normalizeIndianPhone } = require('../utils/phone');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Use as-is, don't normalize (could be US +1 or other)

let client;
if (accountSid && authToken && twilioPhoneNumber) {
  client = twilio(accountSid, authToken);
}

const isConfigured = () => Boolean(client);

const sendSMS = async (to, body) => {
  const recipient = normalizeIndianPhone(to);

  if (!client) {
    console.warn('[Twilio] Client not initialized. SMS skipped because environment variables are incomplete.');
    console.warn('[Twilio] ACCOUNT_SID:', accountSid ? '✓ set' : '✗ missing');
    console.warn('[Twilio] AUTH_TOKEN:', authToken ? '✓ set' : '✗ missing');
    console.warn('[Twilio] PHONE_NUMBER:', twilioPhoneNumber ? '✓ set' : '✗ missing');
    return false;
  }

  if (!recipient) {
    console.warn(`[Twilio] Refusing to send SMS to invalid number: ${to}`);
    return false;
  }
  try {
    console.log(`[Twilio] Sending SMS to ${recipient}...`);
    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to: recipient,
    });
    console.log(`[Twilio] ✓ SMS sent to ${recipient}: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('[Twilio] ✗ Failed to send SMS:', error.message || error);
    console.error('[Twilio] Full error:', JSON.stringify(error, null, 2));
    return false;
  }
};

module.exports = {
  isConfigured,
  sendSMS,
};
