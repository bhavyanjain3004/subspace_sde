const { PROSPEO_API_KEY } = require('../config');
const logger = require('../utils/logger');

const BASE = 'https://api.prospeo.io';
const HEADERS = { 'X-KEY': PROSPEO_API_KEY, 'Content-Type': 'application/json' };

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getSeniorityScore(title) {
  const t = (title || '').toLowerCase();
  if (/\b(ceo|founder|co-founder)\b/.test(t)) return 1;
  if (/\b(cto|cmo|cfo|cpo|cro)\b/.test(t)) return 2;
  if (/\bvp\b|\bvice president\b/.test(t)) return 3;
  if (/\bhead of\b/.test(t)) return 4;
  if (/\bdirector\b/.test(t)) return 5;
  return 6;
}

async function searchPeopleForDomain(domain) {
  const body = {
    page: 1,
    filters: {
      company: {
        websites: { include: [domain] }
      }
    }
  };

  const res = await fetch(`${BASE}/search-person`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`search-person failed: ${JSON.stringify(data)}`);
  }

  return data.results || [];
}

async function enrichPerson(firstName, lastName, companyWebsite) {
  const body = {
    data: {
      first_name: firstName,
      last_name: lastName,
      company_website: companyWebsite
    }
  };

  const res = await fetch(`${BASE}/enrich-person`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (data.error) return null;
  return data.person || null;
}

async function getContactsForDomain(domainObj, maxPerDomain = 2) {
  const { domain, industry, companyName } = domainObj;

  let results;
  try {
    results = await searchPeopleForDomain(domain);
  } catch (err) {
    logger.error(`search-person failed for ${domain}: ${err.message}`);
    return [];
  }

  if (!results.length) return [];

  const ranked = results
    .map(r => {
      const p = r.person || r;
      const score = getSeniorityScore(p.current_job_title);
      return { ...p, seniorityScore: score };
    })
    .filter(p => p.seniorityScore <= 5)
    .sort((a, b) => a.seniorityScore - b.seniorityScore)
    .slice(0, maxPerDomain);

  const contacts = [];

  for (const p of ranked) {
    const firstName = p.first_name || '';
    const lastName = p.last_name || '';

    if (!firstName) continue;

    await sleep(3500);

    let emailStr = null;

    const enriched = await enrichPerson(firstName, lastName, domain);
    if (
      enriched &&
      enriched.email &&
      enriched.email.revealed === true &&
      enriched.email.status === 'VERIFIED' &&
      enriched.email.email
    ) {
      emailStr = enriched.email.email;
    }

    if (!emailStr) {
      logger.log(`No verified email for ${firstName} ${lastName} @ ${domain}`);
      continue;
    }

    contacts.push({
      firstName: firstName || 'there',
      lastName,
      fullName: p.full_name || `${firstName} ${lastName}`.trim(),
      title: p.current_job_title || '',
      email: emailStr.toLowerCase().trim(),
      linkedinUrl: p.linkedin_url || '',
      company: companyName || domain,
      domain,
      industry,
      seniorityScore: p.seniorityScore
    });

    logger.success(`Got contact: ${firstName} ${lastName} <${emailStr}> (${p.current_job_title})`);
  }

  return contacts;
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
        logger.log(`No contacts with email found for ${domainObj.domain}`);
      }
    } catch (err) {
      logger.error(`Error for ${domainObj.domain}: ${err.message}`);
    }

    await sleep(15000);
  }

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

module.exports = { getContacts };