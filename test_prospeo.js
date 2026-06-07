require('dotenv').config();

const API_KEY = process.env.PROSPEO_API_KEY;
const BASE = 'https://api.prospeo.io';
const HEADERS = { 'X-KEY': API_KEY, 'Content-Type': 'application/json' };

async function main() {
  // Step 1: search-person
  const searchRes = await fetch(`${BASE}/search-person`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      page: 1,
      filters: { company: { websites: { include: ['cashfree.com'] } } }
    })
  });
  const searchData = await searchRes.json();

  const first = searchData.results?.[0];
  console.log('=== RAW SEARCH RESULT ITEM ===');
  console.log(JSON.stringify(first, null, 2));

  if (!first) return;

  const p = first.person || first;

  // Step 2: enrich-person
  const enrichRes = await fetch(`${BASE}/enrich-person`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      data: {
        first_name: p.first_name,
        last_name: p.last_name,
        company_website: 'cashfree.com'
      }
    })
  });
  const enrichData = await enrichRes.json();

  console.log('\n=== RAW ENRICH RESULT ===');
  console.log(JSON.stringify(enrichData, null, 2));

  console.log('\n=== EMAIL FIELD TYPE ===');
  console.log('email:', enrichData?.person?.email);
  console.log('typeof email:', typeof enrichData?.person?.email);
}

main().catch(console.error);
