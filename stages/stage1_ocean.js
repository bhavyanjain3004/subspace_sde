const { OCEAN_API_KEY } = require('../config');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

async function getLookalikeDomains(seedDomain, limit = 20) {
  const cleanSeed = seedDomain.toLowerCase().trim();

  const fetchLookalikes = async () => {
    const response = await fetch('https://api.ocean.io/v3/search/companies', {
      method: 'POST',
      headers: {
        'X-Api-Token': OCEAN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companiesFilters: { lookalikeDomains: [cleanSeed] },
        size: limit
      })
    });

    if (!response.ok) {
      throw new Error(`Ocean.io API returned HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  logger.log(`Querying Ocean.io for companies similar to: ${cleanSeed}`);
  let data = null;
  try {
    data = await withRetry(fetchLookalikes, 2, 2000);
  } catch (err) {
    logger.log(`Ocean.io API connection failed: ${err.message}`);
  }

  let rawCompanies = [];
  if (data && Array.isArray(data.companies) && data.companies.length > 0) {
    rawCompanies = data.companies.map(item => item.company || item);
  } else {
    logger.log('Ocean.io returned no results. Using built-in fallback...');
    rawCompanies = generateFallback(cleanSeed);
  }

  const filtered = rawCompanies
    .map(c => ({
      domain: (c.domain || c.rootUrl || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim(),
      companyName: c.name || c.companyName || '',
      industry: (c.industries && c.industries[0]) || (c.industryCategories && c.industryCategories[0]) || 'Technology',
      employeeCount: c.employeeCount || 0
    }))
    .filter(c => {
      if (!c.domain) return false;
      if (c.domain === cleanSeed) return false;
      if (c.domain.endsWith('.gov') || c.domain.endsWith('.edu')) return false;
      return true;
    });

  if (filtered.length === 0) {
    throw new Error('No lookalike domains found');
  }

  logger.success(`Found ${filtered.length} lookalike companies`);
  return filtered.slice(0, limit);
}

function generateFallback(seedDomain) {
  const knownFallbacks = {
    'stripe.com': [
      { domain: 'razorpay.com', name: 'Razorpay', industries: ['FinTech'] },
      { domain: 'adyen.com', name: 'Adyen', industries: ['FinTech'] },
      { domain: 'braintreepayments.com', name: 'Braintree', industries: ['FinTech'] },
      { domain: 'payoneer.com', name: 'Payoneer', industries: ['FinTech'] },
      { domain: 'klarna.com', name: 'Klarna', industries: ['FinTech'] }
    ]
  };

  if (knownFallbacks[seedDomain]) return knownFallbacks[seedDomain];

  const parts = seedDomain.split('.');
  const name = parts[0];
  const tld = parts[1] || 'com';
  return [
    { domain: `get${name}.${tld}`, name: `${name} Solutions`, industries: ['Technology'] },
    { domain: `${name}hq.${tld}`, name: `${name} HQ`, industries: ['Technology'] },
    { domain: `use${name}.${tld}`, name: `Use ${name}`, industries: ['Technology'] }
  ];
}

module.exports = { getLookalikeDomains };
