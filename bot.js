const https = require('https');
const http = require('http');

const FB_PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
const FB_PAGE_TOKEN = (process.env.FB_PAGE_TOKEN || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

let postIndex = 0;
let lastLog = [];

function addLog(msg) {
  const entry = '[' + new Date().toUTCString() + '] ' + msg;
  console.log(entry);
  lastLog.unshift(entry);
  if (lastLog.length > 50) lastLog.pop();
}

const postTopics = [
  { pet: 'dogs', topic: 'dog enrichment and mental stimulation' },
  { pet: 'dogs', topic: 'night walk safety and LED collar' },
  { pet: 'cats', topic: 'cat grooming and health tips' },
  { pet: 'dogs', topic: 'interactive toys for dogs UK' },
  { pet: 'dogs and cats', topic: 'luxury pet bed and sleep health' },
  { pet: 'dogs', topic: 'dog supplements for joint health' },
  { pet: 'dogs', topic: 'dog walking gear for UK weather' },
  { pet: 'cats', topic: 'cat mental stimulation and enrichment' },
  { pet: 'dogs', topic: 'calming anxious dogs UK' },
  { pet: 'dogs and cats', topic: 'pet accessories UK free shipping' },
];

function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5
    });
    const opts = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function generateCaption(topic, pet) {
  const prompt = 'Write a 2-sentence Facebook post for BritishPaw UK pet store about ' + topic + ' for ' + pet + '. ASCII only. End with: Shop at britishpaw.com #BritishPaw #UKPets';
  try {
    const res = await callGroq(prompt);
    if (res.choices && res.choices[0]) {
      let text = res.choices[0].message.content;
      text = text.replace(/[^\x20-\x7E\n]/g, '').trim();
      addLog('Caption OK');
      return text;
    }
  } catch(e) { addLog('Groq err: ' + e.message); }
  return 'Keep your ' + pet + ' happy with BritishPaw accessories. Shop at britishpaw.com #BritishPaw #UKPets';
}

async function postToFacebook(message) {
  return new Promise((resolve) => {
    try {
      addLog('Building request...');
      
      const cleanMsg = message.replace(/[^\x20-\x7E\n]/g, '').trim();
      const cleanToken = FB_PAGE_TOKEN.replace(/[^\x20-\x7E]/g, '').trim();
      const cleanId = FB_PAGE_ID.replace(/[^\x20-\x7E]/g, '').trim();
      
      addLog('Clean ID: ' + cleanId);
      addLog('Clean token length: ' + cleanToken.length);
      addLog('Clean msg length: ' + cleanMsg.length);

      const payload = JSON.stringify({
        message: cleanMsg,
        access_token: cleanToken
      });

      addLog('Payload built, length: ' + payload.length);

      const opts = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: '/v20.0/' + cleanId + '/feed',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      addLog('Making HTTPS request to: ' + opts.path);

      const req = https.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          addLog('Got response: ' + d.substring(0, 200));
          try {
            const parsed = JSON.parse(d);
            if (parsed.id) {
              addLog('SUCCESS: ' + parsed.id);
              resolve({ success: true, id: parsed.id, caption: cleanMsg });
            } else {
              const err = parsed.error ? parsed.error.message + ' (code:' + parsed.error.code + ')' : d;
              addLog('FB error: ' + err);
              resolve({ success: false, error: err });
            }
          } catch(e) {
            resolve({ success: false, error: 'Parse error: ' + d });
          }
        });
      });

      req.on('error', (e) => {
        addLog('HTTPS ERROR: ' + e.message);
        addLog('Error code: ' + e.code);
        addLog('Error stack: ' + e.stack);
        resolve({ success: false, error: e.message });
      });

      req.write(payload);
      req.end();
      addLog('Request sent!');

    } catch(e) {
      addLog('CATCH ERROR: ' + e.message);
      resolve({ success: false, error: e.message });
    }
  });
}

async function runScheduler() {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const d = now.getUTCDay();
  addLog('Scheduler: Day=' + d + ' ' + h + ':' + String(m).padStart(2,'0'));
  if (d === 0 || d === 6) { addLog('Weekend skip'); return; }
  if (h === 9 && m < 5) {
    const t = postTopics[postIndex % postTopics.length];
    const c = await generateCaption(t.topic, t.pet);
    await postToFacebook(c);
    postIndex++;
  }
  if (h === 19 && m < 5) {
    const t = postTopics[postIndex % postTopics.length];
    const c = await generateCaption(t.topic, t.pet);
    await postToFacebook(c);
    postIndex++;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>Test post sending...</h1><p>Wait 20 seconds...</p>');
    const t = postTopics[0];
    const caption = await generateCaption(t.topic, t.pet);
    const result = await postToFacebook(caption);
    if (result.success) {
      res.end('<h2 style="color:green">SUCCESS!</h2><p>Post ID: ' + result.id + '</p><pre style="background:#f0fff0;padding:16px;border-radius:8px;white-space:pre-wrap">' + result.caption + '</pre><a href="/">Back</a></body></html>');
    } else {
      res.end('<h2 style="color:red">Failed: ' + result.error + '</h2><pre style="background:#111;color:#f66;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap">' + lastLog.join('\n') + '</pre><a href="/">Back</a></body></html>');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw Auto Poster</h1><p style="color:green">Running!</p><p>Page: <code>' + FB_PAGE_ID + '</code></p><p>Token: <code>' + FB_PAGE_TOKEN.length + ' chars</code></p><p>Posts: <strong>' + postIndex + '</strong></p><p>' + new Date().toUTCString() + '</p><br><a href="/test" style="background:#1877f2;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Test Post NOW</a><h3>Logs</h3><pre style="background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:11px;white-space:pre-wrap">' + (lastLog.join('\n') || 'No logs') + '</pre></body></html>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('Port: ' + PORT);
  addLog('Ready!');
  addLog('Page ID raw: [' + FB_PAGE_ID + ']');
  addLog('Token length: ' + FB_PAGE_TOKEN.length);
});

setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
