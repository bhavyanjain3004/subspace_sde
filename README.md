# Cold Outreach Pipeline

An automated B2B cold outreach engine that runs lookalike company search, decision-maker extraction, email verification, and personalized mailing end-to-end.

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bhavyanjain3004/subspace_sde.git
   cd subspace_sde
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example template:
   ```bash
   cp .env.example .env
   ```
   Fill in the required keys in `.env`:
   - `OCEAN_API_KEY`: Your Ocean.io API Key.
   - `PROSPEO_API_KEY`: Your Prospeo API Key.
   - `BREVO_API_KEY`: Your Brevo SMTP API Key.
   - `FROM_EMAIL`: The verified domain email you are mailing from.
   - `FROM_NAME`: Your name.

## Usage

### Run End-to-End Pipeline

To execute the full outreach process (fetches lookalikes, pulls decision-makers, shows a summary table, asks for confirmation, and fires personalized emails):
```bash
node index.js stripe.com
```

### Safety Dry Run

To run the pipeline and preview the targets without sending any emails:
```bash
node index.js stripe.com --dry-run
```

## How It Runs (Stage by Stage)

1. **Stage 1 (Ocean.io):** Expands the seed domain into a list of lookalike company domains with similar firmographics.
2. **Stage 2 (Prospeo):** Finds decision-makers (C-suite/VP/Director-level) at those domains and extracts verified professional email addresses.
3. **Stage 3 (Brevo):** Drafts a highly personalized cold email utilizing retrieved name and industry data, then sends it via the Brevo SMTP API.

## API Key Sources

- **Ocean.io:** Create an account at [ocean.io](https://ocean.io) using your company email address. Retrieve your API token under Settings.
- **Prospeo:** Sign up at [prospeo.io](https://prospeo.io) and fetch your key from the API dashboard.
- **Brevo:** Sign up at [brevo.com](https://brevo.com). Go to SMTP & API Keys to generate a key.