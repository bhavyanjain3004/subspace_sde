const { PROSPEO_API_KEY } = require('../config');
const logger = require('../utils/logger');

async function getContactsForDomain(domainObj) {
  const domain = domainObj.domain;

  const response = await fetch('https://api.prospeo.io/domain-search', {
    method: 'POST',
    headers: {
      'X-KEY': PROSPEO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain, limit: 5 })
  });

  if (!response.ok) {
    throw new Error(`Prospeo API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.response || !data.response.email_list) {
    return [];
  }

  const emails = data.response.email_list;
  const contacts = [];

  for (const c of emails) {
    if (!c.email) continue;

    const title = c.title || '';
    const name = c.name || {};
    const firstName = typeof name === 'object' ? name.first_name : '';
    const lastName = typeof name === 'object' ? name.last_name : '';

    contacts.push({
      firstName: firstName || 'there',
      lastName,
      fullName: typeof name === 'object' ? name.full_name : String(name),
      title,
      email: c.email.toLowerCase().trim(),
      linkedinUrl: c.linkedin || '',
      company: domainObj.companyName,
      domain,
      industry: domainObj.industry
    });
  }

  return contacts;
}

async function getContacts(domains) {
  logger.log(`Discovering contacts across ${domains.length} domains...`);
  const allContacts = [];

  for (const domainObj of domains) {
    try {
      const domainContacts = await getContactsForDomain(domainObj);
      allContacts.push(...domainContacts);
    } catch (err) {
      logger.error(`Error querying domain ${domainObj.domain}: ${err.message}`);
    }
  }

  return allContacts;
}

module.exports = {
  getContacts
};
