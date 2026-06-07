const { OCEAN_API_KEY, PROSPEO_API_KEY } = require('../config');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const SENIOR_TITLES = ['ceo', 'founder', 'co-founder', 'cto', 'cmo', 'cfo', 'cpo', 'cro', 'vp ', 'vice president', 'head of', 'director'];

function isSenior(person) {
  const title = (person.jobTitle || '').toLowerCase();
  const seniorities = (person.seniorities || []).map(s => s.toLowerCase());
  if (seniorities.some(s => s.includes('c-level') || s.includes('founder') || s.includes('vp') || s.includes('director'))) return true;
  return SENIOR_TITLES.some(t => title.includes(t));
}

async function getPeopleFromOcean(seedDomain, limit) {
  const response = await fetch('https://api.ocean.io/v3/search/people', {
    method: 'POST',
    headers: {
      'X-Api-Token': OCEAN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      companiesFilters: { lookalikeDomains: [seedDomain] },
      size: limit
    })
  });

  if (!response.ok) {
    throw new Error(`Ocean.io people API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.people || [];
}

async function enrichEmail(person, companyDomain) {
  const payload = {
    data: {
      first_name: person.firstName,
      last_name: person.lastName,
      company_website: companyDomain
    }
  };

  const response = await fetch('https://api.prospeo.io/enrich-person', {
    method: 'POST',
    headers: {
      'X-KEY': PROSPEO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Prospeo API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) return null;

  const r = data.response || {};
  return r.email || null;
}

async function getContacts(domains, seedDomain) {
  const seed = seedDomain || (domains[0] && domains[0].domain) || 'stripe.com';
  logger.log(`Discovering senior contacts via Ocean.io + Prospeo...`);

  let rawPeople = [];
  try {
    rawPeople = await withRetry(() => getPeopleFromOcean(seed, 30), 2, 3000);
  } catch (err) {
    logger.error(`Ocean.io people search failed: ${err.message}`);
    return [];
  }

  const seniorPeople = rawPeople.filter(isSenior);
  logger.log(`Found ${seniorPeople.length} senior people out of ${rawPeople.length} total`);

  const allContacts = [];
  const seenEmails = new Set();
  const domainSet = new Set(domains.map(d => d.domain));

  for (const person of seniorPeople) {
    const companyDomain = person.domain;
    if (!domainSet.has(companyDomain)) continue;

    const companyObj = domains.find(d => d.domain === companyDomain) || {};
    const companyName = (person.company && person.company.name) || companyObj.companyName || companyDomain;
    const industry = companyObj.industry || 'Technology';

    let email = null;
    try {
      email = await enrichEmail(person, companyDomain);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      logger.log(`Prospeo enrich failed for ${person.name}: ${err.message}`);
    }

    if (!email) {
      logger.log(`No email for ${person.name} (${companyDomain})`);
      continue;
    }

    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    const firstName = person.firstName || (person.name || '').split(' ')[0] || 'there';
    const lastName = person.lastName || (person.name || '').split(' ').slice(1).join(' ') || '';

    allContacts.push({
      firstName,
      lastName,
      fullName: person.name || `${firstName} ${lastName}`.trim(),
      title: person.jobTitle || '',
      email,
      linkedinUrl: person.linkedinUrl || '',
      company: companyName,
      domain: companyDomain,
      industry
    });

    logger.success(`Found ${person.name} <${email}> at ${companyDomain}`);

    if (allContacts.length >= 20) break;
  }

  logger.success(`Discovered ${allContacts.length} contacts with verified emails`);
  return allContacts;
}

module.exports = { getContacts };
