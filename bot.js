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

function makePostRequest(pageId, token, message) {
  return new Promise((resolve, reject) => {
    const postData = 'message=' + encodeURIComponent(message) + '&access_token=' + encodeURIComponent(token);
    
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v20.0/' + pageId + '/feed',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function makeGroqRequest(prompt) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function generateCaption(topic, pet) {
  const prompt = 'Write a Facebook post for BritishPaw, a UK pet accessories store at britishpaw.com. Topic: ' + topic + '. Pet: ' + pet + '. Write 3 short sentences. Use only simple English letters and punctuation. No pound sign, no euro sign, no special symbols. End with: Shop at britishpaw.com. Add 5 hashtags on last line.';
  try {
    addLog('Generating: ' + topic);
    const res = await makeGroqRequest(prompt);
    if (res.choices && res.choices[0]) {
      let text = res.choices[0].message.content;
      // Remove ALL non-ASCII characters
      text = text.replace(/[^\x20-\x7E\n]/g, '').trim();
      addLog('Caption: ' + text.substring(0, 60));
      return text;
    }
  } catch (e) {
    addLog('Groq error: ' + e.message);
  }
  return 'Keeping your ' + pet + ' healthy starts with simple daily habits. UK pet owners trust BritishPaw for quality accessories. What does your pet love most?\n\nShop at britishpaw.com\n\n#dogHealthUK #petAccessoriesUK #UKPetStore #britishpaw #petHealthTipsUK';
}

async function postToFacebook(message) {
  addLog('Posting to FB page: ' + FB_PAGE_ID);
  addLog('Token length: ' + FB_PAGE_TOKEN.length);
  try {
    const res = await makePostRequest(FB_PAGE_ID, FB_PAGE_TOKEN, message);
    addLog('FB response: ' + JSON.stringify(res).substring(0, 200));
    if (res.id) {
      addLog('SUCCESS! Post ID: ' + res.id);
      return { success: true, id: res.id, caption: message };
    }
    const err = res.error ? res.error.message + ' (code ' + res.error.code + ')' : JSON.stringify(res);
    addLog('FB error: ' + err);
    return { success: false, error: err };
  } catch (e) {
    addLog('Post error: ' + e.message);
    return { success: false, error: e.message };
  }
}

async function runScheduler() {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const d = now.getUTCDay();
  addLog('Scheduler: Day=' + d + ' ' + h + ':' + String(m).padStart(2,'0') + ' UTC');
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
      res.end('<h2 style="color:red">Failed: ' + result.error + '</h2><ul><li>Page ID: ' + FB_PAGE_ID + '</li><li>Token length: ' + FB_PAGE_TOKEN.length + ' chars</li><li>Token start: ' + FB_PAGE_TOKEN.substring(0,15) + '</li></ul><pre style="background:#111;color:#f66;padding:16px;border-radius:8px;font-size:12px;white-space:pre-wrap">' + lastLog.join('\n') + '</pre><a href="/">Back</a></body></html>');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw Auto Poster</h1><p style="color:green;font-size:18px;font-weight:bold">Running!</p><p>Page ID: <code>' + FB_PAGE_ID + '</code></p><p>Token: <code>' + (FB_PAGE_TOKEN ? FB_PAGE_TOKEN.length + ' chars OK' : 'MISSING') + '</code></p><p>Groq: <code>' + (GROQ_API_KEY ? 'OK' : 'MISSING') + '</code></p><p>Posts sent: <strong>' + postIndex + '</strong></p><p>Time: ' + new Date().toUTCString() + '</p><br><a href="/test" style="display:inline-block;background:#1877f2;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Send Test Post NOW</a><h3>Recent Logs</h3><pre style="background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:12px;white-space:pre-wrap">' + (lastLog.join('\n') || 'No logs yet') + '</pre></body></html>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('Port: ' + PORT);
  addLog('BritishPaw Auto Poster ready!');
});

setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
