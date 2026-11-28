const http = require('http');
const fs = require('fs');
const { Expo } = require('expo-server-sdk');

const port = process.env.PORT || 3000;
const expo = new Expo();
const NTFY_BASE_URL = 'https://ntfy.sh';

const TOKEN_FILE = 'tokens.json';
let pushTokens = [];

if (fs.existsSync(TOKEN_FILE)) {
  try {
    pushTokens = JSON.parse(fs.readFileSync(TOKEN_FILE));
  } catch (e) {
    console.error('Error loading tokens', e);
  }
}

function saveTokens() {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(pushTokens));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LU Connect push service alive\n');
    return;
  }

  // NEW: Send via ntfy
  if (req.method === 'POST' && req.url === '/send-ntfy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { userId, title, message } = data;
        
        if (!userId || !title || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing userId, title, or message' }));
          return;
        }

        const topicUrl = `${NTFY_BASE_URL}/lu-connect-user-${userId}`;
        console.log(`Sending ntfy to: ${topicUrl}`);

        // Send HTTP POST to ntfy
        const ntfyResponse = await fetch(topicUrl, {
          method: 'POST',
          headers: {
            'Title': title,
            'Priority': 'high',
            'Tags': 'bell'
          },
          body: message
        });

        if (ntfyResponse.ok) {
          console.log('Ntfy sent successfully!');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sent via ntfy' }));
        } else {
          const errText = await ntfyResponse.text();
          console.error('Ntfy error:', errText);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ntfy delivery failed', details: errText }));
        }
      } catch (e) {
        console.error(e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
    return;
  }

  // ... (Keep the old /register and /send endpoints below if you still want them) ...
  // For brevity, I'm omitting them here, but you can paste them back if you want to keep Expo fallback.
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`LU Connect Push Server listening on port ${port}`);
});
