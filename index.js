const { getLookalikeDomains } = require('./stages/stage1_ocean');
const { getContacts } = require('./stages/stage2_prospeo');
const { sendEmail } = require('./stages/stage3_brevo');
const { saveCSV } = require('./utils/csv');
const logger = require('./utils/logger');
const readline = require('readline');

function printBanner(text) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${text}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

function getTimestampString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const domainArg = args.find(arg => arg !== '--dry-run');

  if (!domainArg) {
    console.log('Usage: node index.js <company.domain> [--dry-run]');
    process.exit(1);
  }

  printBanner('COLD OUTREACH PIPELINE');

  // Trigger config validation early
  require('./config');
  logger.success('Config loaded');

  console.log('\n[1/3] Finding lookalike companies via Ocean.io...');
  let domains;
  try {
    domains = await getLookalikeDomains(domainArg, 20);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  console.log('\n[2/3] Discovering contacts via Prospeo...');
  let contacts;
  try {
    contacts = await getContacts(domains);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  if (contacts.length === 0) {
    logger.error('No contacts discovered across target domains. Exiting.');
    process.exit(1);
  }

  printBanner('CONTACTS READY TO EMAIL');
  for (const c of contacts) {
    const nameCol = c.fullName.padEnd(16).slice(0, 16);
    const titleCol = c.title.padEnd(14).slice(0, 14);
    const companyCol = c.company.padEnd(12).slice(0, 12);
    console.log(`  ${nameCol} · ${titleCol} · ${companyCol} · ${c.email}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`\n  ${contacts.length} personalized emails ready to send.`);

  let proceed = false;
  if (isDryRun) {
    console.log('  DRY RUN — skipping confirmation and actual send.');
  } else {
    const answer = await askQuestion('  Send now? [y/N]: ');
    if (answer.toLowerCase() === 'y') {
      proceed = true;
    }
  }

  const csvResults = [];

  if (proceed && !isDryRun) {
    console.log('\n[3/3] Sending via Brevo...');
    let sentCount = 0;
    for (const c of contacts) {
      const result = await sendEmail(c);
      if (result.success) {
        logger.success(`Sent → ${c.email}`);
        sentCount++;
        csvResults.push({ ...c, status: 'Sent', error: '' });
      } else {
        logger.error(`Failed → ${c.email} (${result.error})`);
        csvResults.push({ ...c, status: 'Failed', error: result.error });
      }
    }
    logger.success(`${sentCount} / ${contacts.length} sent`);
  } else {
    console.log('\nDRY RUN — no emails sent');
    for (const c of contacts) {
      csvResults.push({ ...c, status: 'Dry Run', error: '' });
    }
  }

  const timestamp = getTimestampString();
  const filename = `run_${timestamp}.csv`;
  await saveCSV(csvResults, filename);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  logger.error(`Fatal crash: ${err.message}`);
  process.exit(1);
});
