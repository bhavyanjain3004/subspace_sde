const { BREVO_API_KEY, FROM_EMAIL, FROM_NAME } = require('../config');
const logger = require('../utils/logger');

async function sendEmail(contact) {
  const { firstName, email, company, industry } = contact;

  const emailBody = `Hi ${firstName},

I came across ${company} while looking into ${industry} companies and \
noticed you're building something interesting in the space.

We help ${industry} teams scale their outbound without adding headcount — \
most customers see a 3x lift in qualified pipeline within 60 days.

Worth a 15-minute call to see if there's a fit? Happy to work around \
your schedule.

Best,
${FROM_NAME}`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email, name: contact.fullName }],
        subject: `Quick question for ${company}`,
        textContent: emailBody
      })
    });

    const data = await response.json();

    if (response.status === 201 || response.status === 200 || data.messageId) {
      return { success: true, email };
    } else {
      return { success: false, email, error: data.message || `HTTP ${response.status}` };
    }
  } catch (err) {
    return { success: false, email, error: err.message };
  }
}

module.exports = {
  sendEmail
};
