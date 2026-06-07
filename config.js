require('dotenv').config();

const requiredEnv = [
  'OCEAN_API_KEY',
  'PROSPEO_API_KEY',
  'BREVO_API_KEY',
  'FROM_EMAIL',
  'FROM_NAME'
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key} — check your .env file`);
    process.exit(1);
  }
}

module.exports = {
  OCEAN_API_KEY: process.env.OCEAN_API_KEY,
  PROSPEO_API_KEY: process.env.PROSPEO_API_KEY,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL,
  FROM_NAME: process.env.FROM_NAME
};
