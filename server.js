require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const {google} = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`
);

function base64UrlDecodeToBuffer(b64u) {
  let s = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function ensureDownloadsDir() {
  const d = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(d)) fs.mkdirSync(d);
  return d;
}

app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const {tokens} = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.redirect('/');
  } catch (err) {
    console.error('Token exchange error', err);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/search', async (req, res) => {
  const {senders} = req.body || {};
  if (!req.session.tokens) return res.status(401).json({error: 'Not authenticated'});
  if (!Array.isArray(senders) || senders.length === 0) return res.status(400).json({error: 'Provide `senders` array'});

  oauth2Client.setCredentials(req.session.tokens);
  const gmail = google.gmail({version: 'v1', auth: oauth2Client});

  const q = senders.map(s => `from:${s}`).join(' OR ');
  try {
    const listRes = await gmail.users.messages.list({userId: 'me', q, maxResults: 200});
    const messages = (listRes.data.messages || []);
    const downloads = [];
    const downloadsDir = ensureDownloadsDir();

    async function processMessage(m) {
      const msg = await gmail.users.messages.get({userId: 'me', id: m.id, format: 'full'});
      const parts = msg.data.payload.parts || [];
      const attachments = [];

      function walkParts(partsArray) {
        for (const p of partsArray) {
          if (p.filename && p.filename.length > 0 && p.body && p.body.attachmentId) {
            attachments.push({filename: p.filename, id: p.body.attachmentId});
          }
          if (p.parts) walkParts(p.parts);
        }
      }

      walkParts(parts);

      for (const att of attachments) {
        try {
          const ares = await gmail.users.messages.attachments.get({userId: 'me', messageId: m.id, id: att.id});
          const data = ares.data.data || ares.data;
          const buf = base64UrlDecodeToBuffer(data);
          const safeName = path.basename(att.filename) || `${m.id}-attachment`;
          const filePath = path.join(downloadsDir, `${m.id}-${safeName}`);
          fs.writeFileSync(filePath, buf);
          downloads.push({messageId: m.id, file: filePath});
        } catch (err) {
          console.error('Attachment download error', err);
        }
      }
    }

    for (const m of messages) await processMessage(m);

    res.json({count: downloads.length, files: downloads});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Failed to search or download attachments'});
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({authenticated: !!req.session.tokens});
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
