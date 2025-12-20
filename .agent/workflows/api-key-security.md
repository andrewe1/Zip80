---
description: Security rules for API keys and OAuth credentials
---

# API Keys & Credentials Security

## CRITICAL: Never Commit Secrets

The following credentials must NEVER be committed to the repository:

- **Google OAuth Client ID** (format: `xxx.apps.googleusercontent.com`)
- **Google API Key** (format: `AIzaSy...`)
- Any other API keys, tokens, or secrets

## How Credentials Work in This Project

### Protected Files (gitignored)
- `.env` - Contains actual credentials
- `src/js/config.js` - Generated from .env at build time

### Safe Files (in repo)
- `.env.example` - Template with placeholder values
- `src/js/gdrive.js` - References `Config.GOOGLE_CLIENT_ID` and `Config.GOOGLE_API_KEY`

### Build Process
1. Developer copies `.env.example` → `.env`
2. Fills in real credentials in `.env`
3. Runs `npm run build:config` → generates `config.js`
4. App reads credentials from `Config` object at runtime

## Before Making Changes

If you need to modify credential-related code:

1. **NEVER hardcode** actual API keys or Client IDs
2. **Always use** `Config.GOOGLE_CLIENT_ID` or `Config.GOOGLE_API_KEY`
3. **Verify** `.gitignore` includes `.env` and `src/js/config.js`
4. **Check** git status before committing to ensure no secrets are staged

## If Adding New Credentials

1. Add to `.env.example` with placeholder value
2. Add to `scripts/build-config.js` to inject at build time
3. Reference via `Config.NEW_CREDENTIAL_NAME` in code
4. Update this workflow document
