const https = require('https');
const http = require('http');

const FB_PAGE_ID = (process.env.FB_PAGE_ID || '').trim();
const FB_PAGE_TOKEN = (process.env.FB_PAGE_TOKEN || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

const postTopics = [
  { pet: 'dogs', topic: 'dog enrichment activities and mental stimulation' },
  { pet: 'dogs', topic: 'night walk safety LED collar reflective gear' },
  { pet: 'dogs', topic: 'raw food diet for dogs UK vets advice' },
  { pet: 'cats', topic: 'cat grooming habits prevent hairballs' },
  { pet: 'dogs', topic: 'interactive puzzle feeder toys mental health' },
  { pet: 'dogs and cats', topic: 'luxury pet bed sleep quality health' },
  { pet: 'dogs', topic: 'dog supplements joint health gut health UK' },
  { pet: 'dogs and cats', topic: 'pet carrier travel UK staycation' },
  { pet: 'dogs', topic: 'decompression sniff walk reduce dog stress' },
  { pet: 'dogs and cats', topic: 'best selling UK pet accessories weekend' },
  { pet: 'cats', topic: 'cat mental stimulation indoor cat boredom' },
  { pet: 'dogs', topic: 'dog walking accessories UK rain mud safety' },
  { pet: 'dogs', topic: 'dog grooming frequency breed guide UK' },
  { pet: 'dogs', topic: 'calming anxious dog separation anxiety UK' },
  { pet: 'cats', topic: 'cat food vs treats balance UK vets' },
  { pet: 'dogs and cats', topic: 'pet gifts UK free shipping britishpaw' },
  { pet: 'dogs', topic: 'dog exercise daily requirements breed guide' },
  { pet: 'cats', topic: 'cat carrier personality type travel UK' },
  { pet: 'dogs', topic: 'scatter feeding sniff enrichment weekend challenge' },
  { pet: 'dogs', topic: 'dog coat skin health UK climate winter' },
];

let postIndex = 0;
let lastLog = [];

function addLog(msg) {
  const entry = '[' + new Date().toUTCString() + '] ' + msg;
  console.log(entry);
  lastLog.unshift(entry);
  if (lastLog.length > 30) lastLog.pop();
}

function makeRequest(options, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function cleanText(text) {
  return text
    .replace(/[\u00A3\u20AC\u00A5]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
}

async function generateCaption(topic, pet) {
  const prompt = 'Write a Facebook post for BritishPaw, a UK pet accessories store at britishpaw.com. Topic: ' + topic + '. Pet focus: ' + pet + '. Write 3-4 short sentences. Use only basic ASCII characters, no special symbols, no currency signs. End with: Shop at britishpaw.com. Add 5 hashtags. Write only the post.';

  const bodyObj = {
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 350,
    temperature: 0.7
  };
  const bodyStr = JSON.stringify(bodyObj);

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  };

  try {
    addLog('Generating caption for: ' + topic);
    const response = await makeRequest(options, bodyStr);
    if (response.choices && response.choices[0]) {
      const caption = cleanText(response.choices[0].message.content);
      addLog('Caption OK: ' + caption.substring(0, 50));
      return caption;
    }
    return getFallback(pet);
  } catch (err) {
    addLog('Groq error: ' + err.message);
    return getFallback(pet);
  }
}

function getFallback(pet) {
  return 'Keeping your ' + pet + ' healthy is easier than you think. Small daily habits make a huge difference. What is your top tip for a happy pet?\n\nShop at britishpaw.com\n\n#dogHealthUK #petAccessoriesUK #UKPetStore #britishpaw #petHealthTipsUK';
}

async function postToFacebook(message) {
  const cleanMessage = cleanText(message);
  
  const bodyObj = {
    message: cleanMessage,
    access_token: FB_PAGE_TOKEN
  };
  const bodyStr = JSON.stringify(bodyObj);

  const options = {
    hostname: 'graph.facebook.com',
    path: '/v20.0/' + FB_PAGE_ID + '/feed',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  };

  try {
    addLog('Posting to page: ' + FB_PAGE_ID);
    const response = await makeRequest(options, bodyStr);
    addLog('FB response: ' + JSON.stringify(response));
    if (response.id) {
      addLog('SUCCESS! Post ID: ' + response.id);
      return { success: true, id: response.id, caption: cleanMessage };
    }
    const err = response.error ? response.error.message + ' (code:' + response.error.code + ')' : JSON.stringify(response);
    addLog('FB error: ' + err);
    return { success: false, error: err };
  } catch (err) {
    addLog('Request error: ' + err.message);
    return { success: false, error: err.message };
  }
}

async function runScheduler() {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const d = now.getUTCDay();
  addLog('Check: Day=' + d + ' ' + h + ':' + String(m).padStart(2,'0') + ' UTC');
  if (d === 0 || d === 6) { addLog('Weekend - skip'); return; }
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
    res.write('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>Sending test post...</h1><p>Wait 15 seconds...</p>');
    const t = postTopics[0];
    const caption = await generateCaption(t.topic, t.pet);
    const result = await postToFacebook(caption);
    if (result.success) {
      res.end('<h2 style="color:green">SUCCESS! Post is live on Facebook!</h2><p>Post ID: ' + result.id + '</p><pre style="background:#f0fff0;padding:16px;border-radius:8px;white-space:pre-wrap">' + result.caption + '</pre><br><a href="/">Back</a></body></html>');
    } else {
      res.end('<h2 style="color:red">Failed</h2><p>' + result.error + '</p><ul><li>Page ID: ' + FB_PAGE_ID + '</li><li>Token: ' + FB_PAGE_TOKEN.length + ' chars</li><li>Groq: ' + (GROQ_API_KEY ? 'OK' : 'MISSING') + '</li></ul><pre style="background:#1a1a1a;color:#f66;padding:16px;border-radius:8px;font-size:12px">' + lastLog.join('\n') + '</pre><a href="/">Back</a></body></html>');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw Auto Poster</h1><p style="color:green;font-weight:bold">Running!</p><p>Page ID: ' + FB_PAGE_ID + '</p><p>Token: ' + (FB_PAGE_TOKEN ? FB_PAGE_TOKEN.length + ' chars' : 'MISSING') + '</p><p>Posts: ' + postIndex + '</p><p>Time: ' + new Date().toUTCString() + '</p><br><a href="/test" style="background:#1877f2;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Send Test Post NOW</a><h3>Logs</h3><pre style="background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:12px">' + (lastLog.join('\n') || 'No logs yet') + '</pre></body></html>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('Running on port ' + PORT);
  addLog('BritishPaw Auto Poster ready!');
});

setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
