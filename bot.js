const https = require('https');
const http = require('http');

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const postTopics = [
  { type: 'health', pet: 'dogs', topic: 'dog enrichment activities and mental stimulation' },
  { type: 'safety', pet: 'dogs', topic: 'night walk safety LED collar reflective gear' },
  { type: 'nutrition', pet: 'dogs', topic: 'raw food diet for dogs UK vets advice' },
  { type: 'grooming', pet: 'cats', topic: 'cat grooming habits prevent hairballs' },
  { type: 'product', pet: 'dogs', topic: 'interactive puzzle feeder toys mental health' },
  { type: 'product', pet: 'dogs and cats', topic: 'luxury pet bed sleep quality health' },
  { type: 'health', pet: 'dogs', topic: 'dog supplements joint health gut health UK' },
  { type: 'travel', pet: 'dogs and cats', topic: 'pet carrier travel UK staycation' },
  { type: 'health', pet: 'dogs', topic: 'decompression sniff walk reduce dog stress' },
  { type: 'product', pet: 'dogs and cats', topic: 'best selling UK pet accessories weekend' },
  { type: 'enrichment', pet: 'cats', topic: 'cat mental stimulation indoor cat boredom' },
  { type: 'walking', pet: 'dogs', topic: 'dog walking accessories UK rain mud safety' },
  { type: 'grooming', pet: 'dogs', topic: 'dog grooming frequency breed guide UK' },
  { type: 'behaviour', pet: 'dogs', topic: 'calming anxious dog separation anxiety UK' },
  { type: 'nutrition', pet: 'cats', topic: 'cat food vs treats balance UK vets' },
  { type: 'gift', pet: 'dogs and cats', topic: 'pet gifts UK free shipping britishpaw' },
  { type: 'health', pet: 'dogs', topic: 'dog exercise daily requirements breed guide' },
  { type: 'travel', pet: 'cats', topic: 'cat carrier personality type travel UK' },
  { type: 'enrichment', pet: 'dogs', topic: 'scatter feeding sniff enrichment weekend challenge' },
  { type: 'health', pet: 'dogs', topic: 'dog coat skin health UK climate winter' },
  { type: 'cost', pet: 'dogs and cats', topic: 'pet ownership cost UK quality accessories' },
  { type: 'training', pet: 'cats', topic: 'cat training positive reinforcement tricks' },
  { type: 'walking', pet: 'dogs', topic: 'dog walking British weather rain gear' },
  { type: 'health', pet: 'dogs', topic: 'dog gut health microbiome probiotic UK 2025' },
  { type: 'product', pet: 'dogs', topic: 'orthopedic dog bed anxious senior dogs' },
  { type: 'behaviour', pet: 'cats', topic: 'cat stress signs body language UK vets' },
  { type: 'walking', pet: 'dogs', topic: 'dog harness breed specific fit UK trainers' },
  { type: 'product', pet: 'dogs and cats', topic: 'pet favourite spot luxury bed upgrade' },
  { type: 'nutrition', pet: 'dogs', topic: 'dog subscription food UK fastest growing 2025' },
  { type: 'behaviour', pet: 'dogs', topic: 'interactive play calmer dog at night' },
  { type: 'health', pet: 'dogs', topic: 'senior dog care joint support sleep exercise' },
  { type: 'health', pet: 'cats', topic: 'kitten proofing UK home hazards new kitten' },
  { type: 'health', pet: 'dogs', topic: 'dog dental teeth cleaning UK 2 minute routine' },
  { type: 'brand', pet: 'dogs and cats', topic: 'BritishPaw UK pet store free shipping returns' },
  { type: 'enrichment', pet: 'dogs', topic: '15 minute enrichment routine daily UK dogs' },
];

let postIndex = 0;
let isMorning = true;

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function generateCaption(topic, pet, slot) {
  const prompt = `Write a Facebook post for BritishPaw, a UK pet accessories store at britishpaw.com.

Topic: ${topic}
Pet focus: ${pet}
Posting time: ${slot}
Audience: UK pet owners aged 25-45

Rules:
- 3-4 short punchy sentences in British English
- Include 2-3 of these keywords naturally: UK pet health, pet accessories UK, dog enrichment UK, interactive dog toys UK, cat health tips UK, night walk dog safety, luxury pet bed UK, dog supplements UK, cat mental stimulation, pet carrier travel UK
- End with either a question to drive comments OR a call to action
- Last line must be: Shop at britishpaw.com
- Add 5 relevant UK hashtags at the end
- Never use more than one exclamation mark
- Friendly, expert, warm tone

Write only the post. No explanation.`;

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
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  try {
    const response = await makeRequest(options, body);
    if (response.choices && response.choices[0]) {
      return response.choices[0].message.content.trim();
    }
    throw new Error('No content from Groq');
  } catch (err) {
    console.error('Groq error:', err.message);
    return getFallbackPost(topic, pet, slot);
  }
}

function getFallbackPost(topic, pet, slot) {
  const fallbacks = [
    `Keeping your ${pet} healthy doesn't have to be complicated. Small daily habits — the right nutrition, regular grooming, and mental stimulation — make a huge difference. UK pet owners are seeing amazing results with these simple changes. What's your top tip for a healthy pet?\n\nShop at britishpaw.com\n\n#dogHealthUK #petAccessoriesUK #UKPetStore #britishpaw #petHealthTipsUK`,
    `The UK's pet care scene is changing fast — and BritishPaw is right at the heart of it. From safety walking gear to luxury pet beds, everything we stock is chosen for UK pets and UK lifestyles. Free shipping over £59. What does your pet need this week?\n\nShop at britishpaw.com\n\n#UKPetStoreOnline #petAccessoriesUK #dogAccessoriesUK #britishpaw #petSuppliesUK`,
    `Did you know that mental stimulation is just as important as physical exercise for your pet? UK vets are recommending enrichment activities more than ever in 2025. Try something new with your pet this week and let us know how it goes.\n\nShop at britishpaw.com\n\n#dogEnrichmentUK #catMentalStimulation #interactiveDogToysUK #britishpaw #petHealthUK`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function postToFacebook(message) {
  const body = JSON.stringify({ message, access_token: FB_PAGE_TOKEN });
  const options = {
    hostname: 'graph.facebook.com',
    path: `/v19.0/${FB_PAGE_ID}/feed`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  try {
    const response = await makeRequest(options, body);
    if (response.id) {
      console.log(`✅ Posted successfully! Post ID: ${response.id}`);
      return true;
    } else {
      console.error('❌ Facebook error:', JSON.stringify(response));
      return false;
    }
  } catch (err) {
    console.error('❌ Post failed:', err.message);
    return false;
  }
}

async function runScheduler() {
  const now = new Date();
  const ukHour = (now.getUTCHours() + 0) % 24; // GMT
  const ukMinute = now.getUTCMinutes();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  console.log(`⏰ Check: ${now.toUTCString()} | Day: ${dayOfWeek} | Hour: ${ukHour}:${ukMinute}`);

  // Only post Mon-Fri (1-5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('📅 Weekend — no posting today');
    return;
  }

  // Morning post at 9:00 AM GMT
  if (ukHour === 9 && ukMinute < 5) {
    console.log('🌅 Morning post time!');
    const topicData = postTopics[postIndex % postTopics.length];
    const caption = await generateCaption(topicData.topic, topicData.pet, '9:00 AM morning');
    console.log('📝 Caption generated:\n', caption);
    await postToFacebook(caption);
    postIndex++;
  }

  // Evening post at 7:00 PM GMT
  if (ukHour === 19 && ukMinute < 5) {
    console.log('🌆 Evening post time!');
    const topicData = postTopics[postIndex % postTopics.length];
    const caption = await generateCaption(topicData.topic, topicData.pet, '7:00 PM evening');
    console.log('📝 Caption generated:\n', caption);
    await postToFacebook(caption);
    postIndex++;
  }
}

// Keep-alive web server for Railway
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
    <head><title>BritishPaw Auto Poster</title></head>
    <body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px">
      <h1>🐾 BritishPaw Auto Poster</h1>
      <p style="color:green;font-weight:bold">✅ Running and active</p>
      <p>Posts automatically to your BritishPaw Facebook page:</p>
      <ul>
        <li>🌅 <strong>9:00 AM GMT</strong> — Morning post (Mon–Fri)</li>
        <li>🌆 <strong>7:00 PM GMT</strong> — Evening post (Mon–Fri)</li>
      </ul>
      <p>Total topics in rotation: <strong>${postTopics.length}</strong></p>
      <p>Posts published so far this session: <strong>${postIndex}</strong></p>
      <p>Current time (UTC): <strong>${new Date().toUTCString()}</strong></p>
      <hr>
      <p style="color:#666;font-size:14px">AI content powered by Groq · Posted to britishpaw.com Facebook page</p>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Status page running on port ${PORT}`);
  console.log(`🐾 BritishPaw Auto Poster started!`);
  console.log(`📅 Will post Mon-Fri at 9:00 AM and 7:00 PM GMT`);
});

// Check every 4 minutes
setInterval(runScheduler, 4 * 60 * 1000);
runScheduler(); // Run immediately on start
