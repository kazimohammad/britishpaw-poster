const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const FB_PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
const FB_PAGE_TOKEN = (process.env.FB_PAGE_TOKEN || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// Unsplash public images - no auth needed, direct CDN links (pet-related, high quality)
// Using Unsplash Source API for free images by keyword
const imageTopics = [
  'dog+toys',
  'dog+walking',
  'cat+grooming',
  'dog+accessories',
  'pet+bed',
  'dog+supplements',
  'dog+rain+gear',
  'cat+toys',
  'dog+calm+relax',
  'pet+accessories',
];

let postIndex = 0;
let lastLog = [];

function addLog(msg) {
  const entry = '[' + new Date().toUTCString() + '] ' + msg;
  console.log(entry);
  lastLog.unshift(entry);
  if (lastLog.length > 100) lastLog.pop();
}

// ---------------------------------------------------------------------------
// Post topics: each has an SEO angle with a problem → solution structure
// NO links will appear in the caption. Brand name mentioned naturally instead.
// ---------------------------------------------------------------------------
const postTopics = [
  {
    pet: 'dogs',
    topic: 'dog enrichment and mental stimulation',
    imageKeyword: 'dog+puzzle+toy',
    seoHook: 'Is your dog bored at home and destroying furniture?',
  },
  {
    pet: 'dogs',
    topic: 'night walk safety with LED collar',
    imageKeyword: 'dog+night+walk+led',
    seoHook: 'Worried about walking your dog in the dark?',
  },
  {
    pet: 'cats',
    topic: 'cat grooming and shedding problems',
    imageKeyword: 'cat+grooming',
    seoHook: 'Struggling with cat hair all over your sofa?',
  },
  {
    pet: 'dogs',
    topic: 'interactive toys to stop dog boredom',
    imageKeyword: 'dog+interactive+toy',
    seoHook: 'Does your dog bark non-stop when left alone?',
  },
  {
    pet: 'dogs and cats',
    topic: 'orthopedic pet bed for better sleep',
    imageKeyword: 'luxury+pet+bed',
    seoHook: 'Is your pet waking up stiff or restless every morning?',
  },
  {
    pet: 'dogs',
    topic: 'joint supplements for older dogs',
    imageKeyword: 'senior+dog+supplements',
    seoHook: 'Noticed your dog limping or struggling to climb stairs?',
  },
  {
    pet: 'dogs',
    topic: 'waterproof dog walking gear for UK weather',
    imageKeyword: 'dog+raincoat+uk',
    seoHook: 'Tired of your dog coming home soaked every rainy walk?',
  },
  {
    pet: 'cats',
    topic: 'cat mental stimulation and indoor enrichment',
    imageKeyword: 'cat+enrichment+toy',
    seoHook: 'Is your indoor cat bored, aggressive or overweight?',
  },
  {
    pet: 'dogs',
    topic: 'calming anxious dogs naturally',
    imageKeyword: 'anxious+dog+calm',
    seoHook: 'Does your dog panic during fireworks or thunderstorms?',
  },
  {
    pet: 'dogs and cats',
    topic: 'best UK pet accessories and supplies',
    imageKeyword: 'pet+accessories+uk',
    seoHook: 'Looking for quality pet supplies without overpaying?',
  },
];

// ---------------------------------------------------------------------------
// Groq: generate SEO-optimised, problem-solving caption (NO links)
// ---------------------------------------------------------------------------
function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });
    const opts = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function generateCaption(topic, pet, seoHook) {
  const prompt = `You are a UK pet store social media expert. Write a Facebook post for BritishPaw UK pet store.

RULES:
- Start with this exact hook: "${seoHook}"
- Then explain the problem pet owners face (1 sentence, use words people search like "best dog toys UK", "stop dog boredom", "dog joint pain relief", etc.)
- Then give the solution and mention BritishPaw as the answer (1-2 sentences)
- Call to action: tell them to search "BritishPaw" on Google or type britishpaw.com in their browser — do NOT write a clickable URL or hyperlink
- Add 3-5 relevant hashtags at the end (e.g. #DogLoversUK #PetSuppliesUK #UKDogOwners)
- ASCII characters only
- Total length: 4-6 sentences max
- Topic: ${topic} for ${pet}
- Sound like a friendly human, not a robot`;

  try {
    const res = await callGroq(prompt);
    if (res.choices && res.choices[0]) {
      let text = res.choices[0].message.content;
      text = text.replace(/[^\x20-\x7E\n]/g, '').trim();
      addLog('Caption generated OK (' + text.length + ' chars)');
      return text;
    }
  } catch (e) {
    addLog('Groq error: ' + e.message);
  }

  // Fallback caption
  return (
    seoHook +
    ' Many ' + pet + ' owners in the UK struggle with this every day. ' +
    'BritishPaw has everything you need to solve it - from vet-recommended products to expert advice. ' +
    'Search "BritishPaw" on Google to find the right solution for your pet. ' +
    '#PetSuppliesUK #' + (pet.includes('dog') ? 'DogLoversUK' : 'CatLoversUK') + ' #BritishPaw #UKPets'
  );
}

// ---------------------------------------------------------------------------
// Download image from Unsplash Source (free, no API key needed)
// Falls back to Pexels static CDN URLs if Unsplash fails
// ---------------------------------------------------------------------------
const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=1200',  // dog
  'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=1200', // cat
  'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg?auto=compress&cs=tinysrgb&w=1200',  // dog toys
  'https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg?auto=compress&cs=tinysrgb&w=1200',    // dogs
  'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&cs=tinysrgb&w=1200', // cat
];

function downloadImageToBuffer(imageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    const req = protocol.get(imageUrl, { headers: { 'User-Agent': 'BritishPaw-Bot/1.0' } }, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        addLog('Image redirect -> ' + res.headers.location);
        return downloadImageToBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('Image HTTP ' + res.statusCode));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'image/jpeg';
        addLog('Image downloaded: ' + buf.length + ' bytes, type: ' + contentType);
        resolve({ buffer: buf, contentType });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Image download timeout')); });
  });
}

async function getImageBuffer(imageKeyword, topicIndex) {
  // Try Unsplash source
  const unsplashUrl = 'https://source.unsplash.com/1200x628/?' + imageKeyword;
  try {
    addLog('Fetching image for: ' + imageKeyword);
    const result = await downloadImageToBuffer(unsplashUrl);
    if (result.buffer.length > 10000) return result;
  } catch (e) {
    addLog('Unsplash failed: ' + e.message);
  }

  // Fallback to Pexels
  const fallbackUrl = FALLBACK_IMAGES[topicIndex % FALLBACK_IMAGES.length];
  addLog('Using fallback image: ' + fallbackUrl);
  try {
    return await downloadImageToBuffer(fallbackUrl);
  } catch (e) {
    addLog('Fallback image also failed: ' + e.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Facebook: upload photo and post with caption
// Using /photos endpoint which posts image + caption as a single post
// ---------------------------------------------------------------------------
function uploadPhotoToFacebook(imageBuffer, contentType, caption) {
  return new Promise((resolve) => {
    try {
      const cleanToken = FB_PAGE_TOKEN.replace(/[^\x20-\x7E]/g, '').trim();
      const cleanId = FB_PAGE_ID.replace(/[^\x20-\x7E]/g, '').trim();
      const cleanCaption = caption.replace(/[^\x20-\x7E\n]/g, '').trim();

      // Build multipart form data
      const boundary = '----BritishPawBoundary' + Date.now();
      const CRLF = '\r\n';

      const captionPart =
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="caption"' + CRLF + CRLF +
        cleanCaption + CRLF;

      const tokenPart =
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="access_token"' + CRLF + CRLF +
        cleanToken + CRLF;

      const imageHeader =
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="source"; filename="post.jpg"' + CRLF +
        'Content-Type: ' + contentType + CRLF + CRLF;

      const closingBoundary = CRLF + '--' + boundary + '--' + CRLF;

      const headerBuf = Buffer.from(captionPart + tokenPart + imageHeader, 'utf8');
      const closingBuf = Buffer.from(closingBoundary, 'utf8');
      const body = Buffer.concat([headerBuf, imageBuffer, closingBuf]);

      const opts = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: '/v20.0/' + cleanId + '/photos',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': body.length,
        },
      };

      addLog('Uploading photo to FB (' + body.length + ' bytes)...');

      const req = https.request(opts, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          addLog('FB response: ' + d.substring(0, 300));
          try {
            const parsed = JSON.parse(d);
            if (parsed.post_id || parsed.id) {
              const id = parsed.post_id || parsed.id;
              addLog('SUCCESS: post id=' + id);
              resolve({ success: true, id, caption: cleanCaption });
            } else {
              const err = parsed.error
                ? parsed.error.message + ' (code:' + parsed.error.code + ')'
                : d;
              addLog('FB error: ' + err);
              resolve({ success: false, error: err });
            }
          } catch (e) {
            resolve({ success: false, error: 'Parse error: ' + d });
          }
        });
      });

      req.on('error', (e) => {
        addLog('HTTPS ERROR: ' + e.message);
        resolve({ success: false, error: e.message });
      });

      req.write(body);
      req.end();
    } catch (e) {
      addLog('CATCH: ' + e.message);
      resolve({ success: false, error: e.message });
    }
  });
}

// Text-only fallback if image fails
function postTextToFacebook(caption) {
  return new Promise((resolve) => {
    const cleanCaption = caption.replace(/[^\x20-\x7E\n]/g, '').trim();
    const cleanToken = FB_PAGE_TOKEN.replace(/[^\x20-\x7E]/g, '').trim();
    const cleanId = FB_PAGE_ID.replace(/[^\x20-\x7E]/g, '').trim();

    const payload = JSON.stringify({ message: cleanCaption, access_token: cleanToken });
    const opts = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v20.0/' + cleanId + '/feed',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.id) {
            addLog('Text-only post SUCCESS: ' + parsed.id);
            resolve({ success: true, id: parsed.id, caption: cleanCaption });
          } else {
            resolve({ success: false, error: parsed.error ? parsed.error.message : d });
          }
        } catch (e) {
          resolve({ success: false, error: 'Parse error: ' + d });
        }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main post function: generate caption + get image + post to FB
// ---------------------------------------------------------------------------
async function createAndPost(topicObj, topicIndex) {
  const { pet, topic, imageKeyword, seoHook } = topicObj;

  addLog('=== Starting post: ' + topic + ' ===');

  // 1. Generate SEO caption
  const caption = await generateCaption(topic, pet, seoHook);

  // 2. Get image
  const imgData = await getImageBuffer(imageKeyword, topicIndex);

  // 3. Post
  if (imgData && imgData.buffer && imgData.buffer.length > 5000) {
    const result = await uploadPhotoToFacebook(imgData.buffer, imgData.contentType, caption);
    if (result.success) return result;
    addLog('Photo upload failed, falling back to text post');
  } else {
    addLog('No image available, posting text only');
  }

  // Fallback: text only
  return await postTextToFacebook(caption);
}

// ---------------------------------------------------------------------------
// Scheduler: 2 posts per day, Mon-Fri, 9 AM and 7 PM UTC
// ---------------------------------------------------------------------------
async function runScheduler() {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const d = now.getUTCDay(); // 0=Sun, 6=Sat
  addLog('Scheduler tick: Day=' + d + ' ' + h + ':' + String(m).padStart(2, '0') + ' UTC');

  if (d === 0 || d === 6) { addLog('Weekend - skip'); return; }

  // Post at 9:00-9:04 UTC (morning) and 19:00-19:04 UTC (evening)
  const isMorning = h === 9 && m < 5;
  const isEvening = h === 19 && m < 5;

  if (isMorning || isEvening) {
    const slot = isEvening ? 'Evening' : 'Morning';
    addLog(slot + ' post time!');
    const t = postTopics[postIndex % postTopics.length];
    await createAndPost(t, postIndex % postTopics.length);
    postIndex++;
  }
}

// ---------------------------------------------------------------------------
// HTTP server for monitoring and manual test
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // Manual test trigger
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write(`<!DOCTYPE html><html><head><title>BritishPaw Test</title>
<style>body{font-family:sans-serif;max-width:750px;margin:40px auto;padding:20px;background:#f5f5f5}
h1{color:#1877f2}pre{background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:11px;white-space:pre-wrap;overflow-x:auto}
.success{background:#e8f5e9;border-left:4px solid #4caf50;padding:12px;border-radius:4px}
.fail{background:#ffebee;border-left:4px solid #f44336;padding:12px;border-radius:4px}
a{color:#1877f2}</style></head><body>
<h1>BritishPaw - Sending test post...</h1><p>This takes ~20 seconds. Please wait.</p>`);

    const t = postTopics[0];
    const result = await createAndPost(t, 0);

    if (result.success) {
      res.end(`<div class="success"><h2>SUCCESS!</h2>
<p><strong>Post ID:</strong> ${result.id}</p>
<p><strong>Caption:</strong></p>
<pre style="background:#f0fff0;color:#333">${result.caption}</pre></div>
<h3>Logs</h3><pre>${lastLog.join('\n')}</pre>
<br><a href="/">Back to dashboard</a></body></html>`);
    } else {
      res.end(`<div class="fail"><h2>Failed: ${result.error}</h2></div>
<h3>Logs</h3><pre>${lastLog.join('\n')}</pre>
<br><a href="/">Back</a></body></html>`);
    }
    return;
  }

  // Dashboard
  const nextTopic = postTopics[postIndex % postTopics.length];
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><title>BritishPaw Auto Poster</title>
<style>body{font-family:sans-serif;max-width:750px;margin:40px auto;padding:20px;background:#f5f5f5}
h1{color:#1877f2}.card{background:#fff;border-radius:8px;padding:20px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.badge{display:inline-block;background:#e3f2fd;color:#1877f2;border-radius:20px;padding:4px 12px;font-size:13px}
.btn{display:inline-block;background:#1877f2;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px}
pre{background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:11px;white-space:pre-wrap;max-height:400px;overflow-y:auto}
table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #eee}th{background:#f5f5f5;font-size:13px}
</style></head><body>
<h1>BritishPaw Auto Poster</h1>
<div class="card">
  <span class="badge">LIVE</span>
  <table style="margin-top:12px">
    <tr><th>Page ID</th><td><code>${FB_PAGE_ID}</code></td></tr>
    <tr><th>Token</th><td>${FB_PAGE_TOKEN.length} chars</td></tr>
    <tr><th>Posts sent</th><td><strong>${postIndex}</strong></td></tr>
    <tr><th>Schedule</th><td>Mon-Fri @ 9:00 AM & 7:00 PM UTC</td></tr>
    <tr><th>Time now</th><td>${new Date().toUTCString()}</td></tr>
    <tr><th>Next topic</th><td>${nextTopic.seoHook}</td></tr>
    <tr><th>Images</th><td>Auto-fetched from Unsplash (pet photos)</td></tr>
    <tr><th>Links in posts</th><td>NONE (organic reach safe)</td></tr>
  </table>
  <a href="/test" class="btn">Send Test Post NOW</a>
</div>
<div class="card">
  <h3 style="margin-top:0">Post Topics (${postTopics.length} topics rotating)</h3>
  <table>
    <tr><th>#</th><th>Hook</th><th>Pet</th></tr>
    ${postTopics.map((t, i) => `<tr><td>${i + 1}</td><td>${t.seoHook}</td><td>${t.pet}</td></tr>`).join('')}
  </table>
</div>
<div class="card">
  <h3 style="margin-top:0">Live Logs</h3>
  <pre>${lastLog.join('\n') || 'No logs yet'}</pre>
</div>
</body></html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('=== BritishPaw Bot Started ===');
  addLog('Port: ' + PORT);
  addLog('Page ID: ' + FB_PAGE_ID);
  addLog('Token length: ' + FB_PAGE_TOKEN.length);
  addLog('Schedule: Mon-Fri 09:00 & 19:00 UTC');
  addLog('Topics loaded: ' + postTopics.length);
  addLog('Features: Image posts + SEO captions + No links');
});

// Check every 4 minutes
setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
