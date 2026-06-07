const { PROSPEO_API_KEY } = require('../config');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

function getSeniorityScore(title) {
  const t = title.toLowerCase();
  if (/\b(ceo|founder|co-founder)\b/.test(t)) return 1;
  if (/\b(cto|cmo|cfo|cpo|cro)\b/.test(t)) return 2;
  if (/\bvp\b|\bvice president\b/.test(t)) return 3;
  if (/\bhead of\b/.test(t)) return 4;
  if (/\bdirector\b/.test(t)) return 5;
  return 6;
}

async function getContactsForDomain(domainObj) {
  const domain = domainObj.domain;
  const industry = domainObj.industry;

  const fetchContacts = async () => {
    const response = await fetch('https://api.prospeo.io/domain-search', {
      method: 'POST',
      headers: {
        'X-KEY': PROSPEO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain, limit: 5 })
    });

    if (!response.ok) {
      throw new Error(`Prospeo API returned HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  const data = await withRetry(fetchContacts, 3, 5000);
  if (!data || !data.response || !data.response.email_list) {
    return [];
  }

  const emails = data.response.email_list;
  const contacts = [];

  for (const c of emails) {
    if (!c.email) continue;

    const title = c.title || '';
    const score = getSeniorityScore(title);
    if (score === 6) continue; // Filter out junior roles

    let firstName = '';
    let lastName = '';
    let fullName = '';

    if (c.name) {
      if (typeof c.name === 'object') {
        firstName = c.name.first_name || '';
        lastName = c.name.last_name || '';
        fullName = c.name.full_name || `${firstName} ${lastName}`.trim();
      } else if (typeof c.name === 'string') {
        fullName = c.name;
        const parts = c.name.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
    } else {
      firstName = c.first_name || '';
      lastName = c.last_name || '';
      fullName = c.full_name || `${firstName} ${lastName}`.trim();
    }

    const companyName = c.company && c.company.name ? c.company.name : domainObj.companyName;

    contacts.push({
      firstName: firstName || 'there',
      lastName,
      fullName: fullName || 'Contact',
      title,
      email: c.email.toLowerCase().trim(),
      linkedinUrl: c.linkedin || c.linkedin_url || '',
      company: companyName,
      domain,
      industry,
      seniorityScore: score
    });
  }

  contacts.sort((a, b) => a.seniorityScore - b.seniorityScore);
  return contacts.slice(0, 2);
}

async function getContacts(domains) {
  logger.log(`Discovering contacts across ${domains.length} domains...`);
  const allContacts = [];

  for (const domainObj of domains) {
    try {
      const domainContacts = await getContactsForDomain(domainObj);
      if (domainContacts.length > 0) {
        logger.success(`Found ${domainContacts.length} contact(s) for ${domainObj.domain}`);
        allContacts.push(...domainContacts);
      } else {
        logger.log(`No decision-maker contacts found for ${domainObj.domain}`);
      }
    } catch (err) {
      logger.error(`Error querying domain ${domainObj.domain}: ${err.message}`);
    }
  }

  // Deduplicate by email address
  const uniqueContacts = [];
  const seenEmails = new Set();

  for (const c of allContacts) {
    if (!seenEmails.has(c.email)) {
      seenEmails.add(c.email);
      uniqueContacts.push(c);
    }
  }

  logger.success(`Discovered ${allContacts.length} raw contacts, deduplicated to ${uniqueContacts.length} unique decision-makers`);
  return uniqueContacts;
}

module.exports = {
  getContacts
};
