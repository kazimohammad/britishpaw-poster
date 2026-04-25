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
  { pet: 'dogs and cats', topic: 'pet ownership cost UK quality accessories' },
  { pet: 'cats', topic: 'cat training positive reinforcement tricks' },
  { pet: 'dogs', topic: 'dog walking British weather rain gear' },
  { pet: 'dogs', topic: 'dog gut health microbiome probiotic UK 2025' },
  { pet: 'dogs', topic: 'orthopedic dog bed anxious senior dogs' },
  { pet: 'cats', topic: 'cat stress signs body language UK vets' },
  { pet: 'dogs', topic: 'dog harness breed specific fit UK trainers' },
  { pet: 'dogs and cats', topic: 'pet favourite spot luxury bed upgrade' },
  { pet: 'dogs', topic: 'dog subscription food UK fastest growing 2025' },
  { pet: 'dogs', topic: 'interactive play calmer dog at night' },
  { pet: 'dogs', topic: 'senior dog care joint support sleep exercise' },
  { pet: 'cats', topic: 'kitten proofing UK home hazards new kitten' },
  { pet: 'dogs', topic: 'dog dental teeth cleaning UK 2 minute routine' },
  { pet: 'dogs and cats', topic: 'BritishPaw UK pet store free shipping returns' },
  { pet: 'dogs', topic: '15 minute enrichment routine daily UK dogs' },
];

let postIndex = 0;
let lastLog = [];

function addLog(msg) {
  const entry = '[' + new Date().toUTCString() + '] ' + msg;
  console.log(entry);
  lastLog.unshift(entry);
  if (lastLog.length > 30) lastLog.pop();
}

function makeRequest(options, body) {
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
    if (body) req.write(body);
    req.end();
  });
}

async function generateCaption(topic, pet, slot) {
  const prompt = 'Write a Facebook post for BritishPaw, a UK pet accessories store at britishpaw.com. Topic: ' + topic + '. Pet focus: ' + pet + '. Time: ' + slot + '. Audience: UK pet owners aged 25-45. Write 3-4 short punchy sentences in British English. Include relevant UK pet keywords naturally. End with a question or call to action. Last line must be: Shop at britishpaw.com. Add 5 relevant UK hashtags. Do not use pound sign or special currency symbols. Write only the post, no explanation.';

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.8
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  try {
    addLog('Generating caption for: ' + topic);
    const response = await makeRequest(options, body);
    if (response.choices && response.choices[0]) {
      addLog('Caption generated OK');
      // Remove any special characters that cause issues
      let caption = response.choices[0].message.content.trim();
      caption = caption.replace(/[£€¥]/g, '');
      return caption;
    }
    addLog('Groq issue: ' + JSON.stringify(response).substring(0, 200));
    return getFallbackPost(pet);
  } catch (err) {
    addLog('Groq error: ' + err.message);
    return getFallbackPost(pet);
  }
}

function getFallbackPost(pet) {
  const posts = [
    'Keeping your ' + pet + ' healthy is easier than you think. Small daily habits make a huge difference for UK pet owners. What is your top tip for a healthy pet?\n\nShop at britishpaw.com\n\n#dogHealthUK #petAccessoriesUK #UKPetStore #britishpaw #petHealthTipsUK',
    'The UK pet care scene is changing fast and BritishPaw is right at the heart of it. Free shipping on orders over 59 GBP across the UK. What does your pet need this week?\n\nShop at britishpaw.com\n\n#UKPetStoreOnline #petAccessoriesUK #dogAccessoriesUK #britishpaw #petSuppliesUK',
    'Mental stimulation is just as important as physical exercise for your ' + pet + '. UK vets are recommending enrichment activities more than ever in 2025. Try something new this week!\n\nShop at britishpaw.com\n\n#dogEnrichmentUK #catMentalStimulation #interactiveDogToysUK #britishpaw #petHealthUK',
  ];
  return posts[Math.floor(Math.random() * posts.length)];
}

async function postToFacebook(message) {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
    addLog('ERROR: Missing FB_PAGE_ID or FB_PAGE_TOKEN');
    return { success: false, error: 'Missing FB credentials' };
  }

  // Use JSON body - more reliable with special characters
  const bodyObj = { message: message, access_token: FB_PAGE_TOKEN };
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
    addLog('Posting to FB Page ID: ' + FB_PAGE_ID);
    addLog('Token length: ' + FB_PAGE_TOKEN.length + ' chars, starts: ' + FB_PAGE_TOKEN.substring(0, 10));
    const response = await makeRequest(options, bodyStr);
    addLog('FB Response: ' + JSON.stringify(response));

    if (response.id) {
      addLog('SUCCESS! Post ID: ' + response.id);
      return { success: true, id: response.id, caption: message };
    } else {
      const errMsg = response.error ? (response.error.message + ' (code:' + response.error.code + ')') : JSON.stringify(response);
      addLog('FB Error: ' + errMsg);
      return { success: false, error: errMsg };
    }
  } catch (err) {
    addLog('Request error: ' + err.message);
    return { success: false, error: err.message };
  }
}

async function runScheduler() {
  const now = new Date();
  const ukHour = now.getUTCHours();
  const ukMinute = now.getUTCMinutes();
  const dayOfWeek = now.getUTCDay();

  addLog('Scheduler: Day=' + dayOfWeek + ' Time=' + ukHour + ':' + String(ukMinute).padStart(2, '0') + ' UTC');

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    addLog('Weekend - no posting');
    return;
  }

  if (ukHour === 9 && ukMinute < 5) {
    addLog('Morning post time!');
    const t = postTopics[postIndex % postTopics.length];
    const caption = await generateCaption(t.topic, t.pet, '9:00 AM morning');
    await postToFacebook(caption);
    postIndex++;
  }

  if (ukHour === 19 && ukMinute < 5) {
    addLog('Evening post time!');
    const t = postTopics[postIndex % postTopics.length];
    const caption = await generateCaption(t.topic, t.pet, '7:00 PM evening');
    await postToFacebook(caption);
    postIndex++;
  }
}

const server = http.createServer(async (req, res) => {

  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<!DOCTYPE html><html><head><title>Test</title></head><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>Sending test post to Facebook...</h1><p>Please wait 15 seconds...</p>');

    const t = postTopics[0];
    const caption = await generateCaption(t.topic, t.pet, 'test');
    const result = await postToFacebook(caption);

    if (result.success) {
      res.end('<h2 style="color:green">SUCCESS! Post is live on your Facebook page!</h2><p>Post ID: ' + result.id + '</p><div style="background:#f0fff0;padding:16px;border-radius:8px;white-space:pre-wrap">' + caption + '</div><br><a href="/">Back to dashboard</a></body></html>');
    } else {
      res.end('<h2 style="color:red">Post Failed</h2><p>Error: ' + result.error + '</p><h3>Debug Info:</h3><ul><li>FB_PAGE_ID: <code>' + (FB_PAGE_ID || 'MISSING') + '</code></li><li>Token length: <code>' + (FB_PAGE_TOKEN ? FB_PAGE_TOKEN.length + ' chars' : 'MISSING') + '</code></li><li>Token starts: <code>' + (FB_PAGE_TOKEN ? FB_PAGE_TOKEN.substring(0, 15) + '...' : 'MISSING') + '</code></li><li>GROQ: <code>' + (GROQ_API_KEY ? 'Set OK' : 'MISSING') + '</code></li></ul><h3>Logs:</h3><pre style="background:#1a1a1a;color:#ff6666;padding:16px;border-radius:8px;font-size:12px">' + lastLog.join('\n') + '</pre><a href="/">Back</a></body></html>');
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><head><title>BritishPaw Auto Poster</title></head><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw Auto Poster</h1><p style="color:green;font-weight:bold;font-size:18px">Running and active</p><div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0"><h3>Status</h3><p>FB Page ID: <code>' + (FB_PAGE_ID || 'MISSING') + '</code></p><p>FB Token: <code>' + (FB_PAGE_TOKEN ? 'Set OK (' + FB_PAGE_TOKEN.length + ' chars)' : 'MISSING') + '</code></p><p>Groq API: <code>' + (GROQ_API_KEY ? 'Set OK' : 'MISSING') + '</code></p><p>Posts this session: <strong>' + postIndex + '</strong></p><p>UTC time: <strong>' + new Date().toUTCString() + '</strong></p></div><div style="background:#e8f0fa;padding:16px;border-radius:8px;margin:16px 0"><h3>Schedule</h3><p>Morning: 9:00 AM GMT (Mon-Fri)</p><p>Evening: 7:00 PM GMT (Mon-Fri)</p></div><a href="/test" style="display:inline-block;background:#1877f2;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Send Test Post to Facebook NOW</a><h3 style="margin-top:24px">Recent Logs</h3><pre style="background:#1a1a1a;color:#00ff00;padding:16px;border-radius:8px;font-size:12px">' + (lastLog.length ? lastLog.join('\n') : 'No activity yet...') + '</pre></body></html>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('Dashboard running on port ' + PORT);
  addLog('BritishPaw Auto Poster ready!');
});

setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
