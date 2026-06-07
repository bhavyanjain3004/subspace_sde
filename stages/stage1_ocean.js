const { OCEAN_API_KEY } = require('../config');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

async function getLookalikeDomains(seedDomain, limit = 20) {
  const fetchLookalikes = async () => {
    const response = await fetch('https://api.ocean.io/v1/companies/similar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OCEAN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain: seedDomain, limit })
    });

    if (!response.ok) {
      throw new Error(`Ocean.io API returned HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  logger.log(`Querying Ocean.io for companies similar to: ${seedDomain}`);
  const data = await withRetry(fetchLookalikes, 3, 5000);

  if (!data) {
    throw new Error('Failed to retrieve lookalike domains from Ocean.io');
  }

  const rawCompanies = data.companies || [];
  const cleanSeed = seedDomain.toLowerCase().trim();

  const filtered = rawCompanies
    .map(c => ({
      domain: (c.domain || '').toLowerCase().trim(),
      companyName: c.name || c.companyName || '',
      industry: c.industry || 'Technology',
      employeeCount: c.employeeCount || c.size || c.employees || 0
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
  return filtered;
}

module.exports = {
  getLookalikeDomains
};
