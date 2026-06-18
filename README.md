# Gmail Bank Statement Downloader (Minimal)

This project provides a minimal Node.js Express scaffold that lets you sign in with Google, search your Gmail for emails from given bank senders, and download attachments (bank statements) to a local `downloads/` folder.

Setup

1. Copy `.env.example` to `.env` and fill in `CLIENT_ID`, `CLIENT_SECRET`, and `REDIRECT_URI`.

2. Install dependencies and start:

```bash
npm install
npm start
```

3. Open `http://localhost:3000` and click "Sign in with Google". After sign-in, enter bank sender emails (comma separated) and click "Download statements".

Notes
- The app uses Gmail API with `https://www.googleapis.com/auth/gmail.readonly` scope.
- Downloaded files are saved under `downloads/`.
- This is a minimal example. Do not deploy to production without adding proper token storage, CSRF protection, and hardened session handling.
# muneem
Muneem is an AI agent to automate personal finance
