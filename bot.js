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
  if (lastLog.length > 80) lastLog.pop();
}

// Each topic has its OWN set of unique Pexels image URLs
const postTopics = [
  {
    keyword: 'dog enrichment toys UK',
    problem: 'Is your dog bored, destructive or constantly chewing things around the house?',
    solution: 'Mental enrichment through puzzle feeders and sniff games can reduce destructive behaviour by up to 70 percent. Just 15 minutes of brain activity tires a dog more than a 45-minute walk.',
    cta: 'Search Dog Enrichment at BritishPaw to find the right toys for your breed',
    hashtags: '#DogEnrichmentUK #PuzzleFeeder #BoreDomFree #DogMentalHealth #BritishPaw #UKDogOwners #InteractiveDogToys',
    images: [
      'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?w=1080',
      'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg?w=1080',
      'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?w=1080',
    ]
  },
  {
    keyword: 'LED dog collar night walking UK',
    problem: 'Are you scared to walk your dog after dark because drivers cannot see you?',
    solution: 'LED and reflective collars make your dog visible from over 200 metres in the dark. UK road safety experts recommend high-visibility gear for all evening dog walks especially in winter.',
    cta: 'Search Safety Collar at BritishPaw to keep your dog safe on night walks',
    hashtags: '#NightWalkDog #LEDDogCollar #DogSafetyUK #ReflectiveDogGear #BritishPaw #UKDogWalking #WinterDogWalks',
    images: [
      'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg?w=1080',
      'https://images.pexels.com/photos/2252311/pexels-photo-2252311.jpeg?w=1080',
      'https://images.pexels.com/photos/3361739/pexels-photo-3361739.jpeg?w=1080',
    ]
  },
  {
    keyword: 'indoor cat boredom solutions UK',
    problem: 'Is your indoor cat scratching your furniture, meowing all night or becoming aggressive?',
    solution: 'Indoor cats need at least 30 minutes of active play per day. Cat enrichment toys and puzzle feeders mimic natural hunting behaviour and dramatically reduce stress.',
    cta: 'Search Cat Enrichment at BritishPaw to find what works for your cat',
    hashtags: '#IndoorCatUK #CatEnrichment #BoreDomFreeCat #CatMentalHealth #BritishPaw #UKCatOwners #CatToys',
    images: [
      'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg?w=1080',
      'https://images.pexels.com/photos/2071873/pexels-photo-2071873.jpeg?w=1080',
      'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?w=1080',
    ]
  },
  {
    keyword: 'dog anxiety calming products UK',
    problem: 'Does your dog shake, bark or hide during fireworks, storms or when left alone?',
    solution: 'Dog anxiety affects 1 in 4 UK pets. Calming accessories including anxiety wraps, enrichment toys and comfort beds have been shown to reduce stress signals in dogs within 20 minutes.',
    cta: 'Search Calming Dog at BritishPaw to help your anxious pet feel safe',
    hashtags: '#DogAnxietyUK #CalmingDog #SeparationAnxiety #AnxiousDog #BritishPaw #UKDogOwners #DogWellbeing',
    images: [
      'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?w=1080',
      'https://images.pexels.com/photos/1629781/pexels-photo-1629781.jpeg?w=1080',
      'https://images.pexels.com/photos/3361739/pexels-photo-3361739.jpeg?w=1080',
    ]
  },
  {
    keyword: 'luxury pet bed UK',
    problem: 'Is your dog or cat sleeping on a hard floor or flat uncomfortable surface every night?',
    solution: 'Orthopedic pet beds support joints and improve sleep quality especially for older pets and larger breeds. Quality sleep directly impacts your pet energy levels mood and long term health.',
    cta: 'Search Luxury Pet Bed at BritishPaw to find the perfect sleep solution',
    hashtags: '#LuxuryPetBed #OrthopedicDogBed #PetSleepUK #DogBedUK #BritishPaw #UKPetOwners #CatBed',
    images: [
      'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?w=1080',
      'https://images.pexels.com/photos/6568501/pexels-photo-6568501.jpeg?w=1080',
      'https://images.pexels.com/photos/4587998/pexels-photo-4587998.jpeg?w=1080',
    ]
  },
  {
    keyword: 'dog shedding solution UK',
    problem: 'Is dog hair covering your sofa clothes and car no matter how much you vacuum?',
    solution: 'Professional-grade deshedding tools remove up to 90 percent of loose undercoat hair at the source. Regular grooming also improves coat health and reduces skin problems in double-coated breeds.',
    cta: 'Search Dog Grooming Tools at BritishPaw to find the right brush for your breed',
    hashtags: '#DogSheddingUK #DeShedding #DogGroomingUK #PetGrooming #BritishPaw #UKDogOwners #DoubleCoat',
    images: [
      'https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg?w=1080',
      'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg?w=1080',
      'https://images.pexels.com/photos/1390361/pexels-photo-1390361.jpeg?w=1080',
    ]
  },
  {
    keyword: 'senior dog joint pain UK',
    problem: 'Is your older dog slowing down limping or struggling to climb the stairs?',
    solution: 'Joint pain affects over 80 percent of dogs over 8 years old. Orthopedic beds with memory foam reduce pressure on aching joints by up to 40 percent and can significantly improve mobility.',
    cta: 'Search Senior Dog at BritishPaw to help your older pet live comfortably',
    hashtags: '#SeniorDogUK #DogJointPain #OlderDog #ArthritisDog #BritishPaw #UKDogOwners #DogHealthUK',
    images: [
      'https://images.pexels.com/photos/1587300/pexels-photo-1587300.jpeg?w=1080',
      'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?w=1080',
      'https://images.pexels.com/photos/356378/pexels-photo-356378.jpeg?w=1080',
    ]
  },
  {
    keyword: 'dog pulling on lead UK',
    problem: 'Is walking your dog painful because they pull so hard it hurts your shoulder and back?',
    solution: 'No-pull harnesses distribute pressure across the chest not the throat. UK dog trainers recommend front-clip harnesses to reduce pulling by up to 80 percent without any training required.',
    cta: 'Search Dog Harness at BritishPaw to make walks enjoyable again',
    hashtags: '#DogPullingLead #NoPullHarness #DogHarnessUK #DogWalkingUK #BritishPaw #UKDogOwners #LeadTraining',
    images: [
      'https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?w=1080',
      'https://images.pexels.com/photos/1633522/pexels-photo-1633522.jpeg?w=1080',
      'https://images.pexels.com/photos/3098257/pexels-photo-3098257.jpeg?w=1080',
    ]
  },
  {
    keyword: 'cat scratching furniture UK',
    problem: 'Is your cat destroying your sofa carpet or wallpaper no matter what you try?',
    solution: 'Cats scratch to mark territory stretch muscles and sharpen claws. Providing a dedicated scratching post in the right location immediately redirects this natural behaviour away from your furniture.',
    cta: 'Search Cat Scratching Post at BritishPaw to save your furniture today',
    hashtags: '#CatScratchingUK #ScratchingPost #CatFurnitureProtection #CatBehaviourUK #BritishPaw #UKCatOwners #IndoorCat',
    images: [
      'https://images.pexels.com/photos/2071873/pexels-photo-2071873.jpeg?w=1080',
      'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg?w=1080',
      'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?w=1080',
    ]
  },
  {
    keyword: 'dog eating too fast UK',
    problem: 'Does your dog wolf down their food in seconds and then vomit or get bloated afterwards?',
    solution: 'Fast eating is a serious health risk in dogs. Slow feeder bowls and puzzle feeders extend meal time from 30 seconds to 10 minutes safely and make meal times fun.',
    cta: 'Search Slow Feeder at BritishPaw to make meal times safer for your dog',
    hashtags: '#DogEatingTooFast #SlowFeeder #DogBloat #PuzzleFeeder #BritishPaw #UKDogOwners #DogHealthUK',
    images: [
      'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?w=1080',
      'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?w=1080',
      'https://images.pexels.com/photos/3628100/pexels-photo-3628100.jpeg?w=1080',
    ]
  },
  {
    keyword: 'puppy training UK',
    problem: 'Is your new puppy chewing everything biting everyone and refusing to sleep at night?',
    solution: 'The first 16 weeks are the most important learning period in a puppy life. The right chew toys crates and training aids can reduce problem behaviours by 80 percent in just 2 weeks.',
    cta: 'Search Puppy Starter Kit at BritishPaw to get your puppy off to the best start',
    hashtags: '#PuppyTrainingUK #NewPuppyUK #PuppyChewing #PuppyBiting #BritishPaw #UKDogOwners #PuppyLife',
    images: [
      'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?w=1080',
      'https://images.pexels.com/photos/2607544/pexels-photo-2607544.jpeg?w=1080',
      'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg?w=1080',
    ]
  },
  {
    keyword: 'cat water fountain UK',
    problem: 'Is your cat not drinking enough water and getting repeated urinary tract infections?',
    solution: 'Cats instinctively prefer moving water over still water. A circulating cat water fountain encourages cats to drink 50 percent more water which dramatically reduces urinary and kidney problems.',
    cta: 'Search Cat Water Fountain at BritishPaw to improve your cat hydration',
    hashtags: '#CatWaterFountain #CatUTI #CatHealthUK #CatDrinkingWater #BritishPaw #UKCatOwners #CatKidneyHealth',
    images: [
      'https://images.pexels.com/photos/2071873/pexels-photo-2071873.jpeg?w=1080',
      'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?w=1080',
      'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg?w=1080',
    ]
  },
];

function callGroq(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
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

async function generateCaption(topic) {
  const prompt = `Write a Facebook post for BritishPaw, a UK pet accessories store.

SEO KEYWORD: ${topic.keyword}
PROBLEM: ${topic.problem}
SOLUTION: ${topic.solution}
CALL TO ACTION: ${topic.cta}

FORMAT:
- Start with the problem as a question in CAPS
- Empty line
- 2-3 sentences about the problem UK pet owners face
- Empty line
- 2-3 sentences with the solution mentioning BritishPaw naturally
- Empty line
- Call to action (NO URL NO LINK - just tell them to search on BritishPaw)
- Empty line
- Hashtags: ${topic.hashtags}

RULES:
- ASCII characters ONLY
- No URLs or web links
- 150-200 words total
- Friendly helpful UK tone
- No pound sign or special symbols

Write only the post. No explanation.`;

  try {
    const res = await callGroq(prompt);
    if (res.choices && res.choices[0]) {
      let text = res.choices[0].message.content;
      text = text.replace(/[^\x20-\x7E\n]/g, '').trim();
      text = text.replace(/https?:\/\/\S+/g, '').replace(/www\.\S+/g, '');
      addLog('Caption OK: ' + text.length + ' chars');
      return text;
    }
  } catch(e) { addLog('Groq err: ' + e.message); }
  return topic.problem + '\n\n' + topic.solution + '\n\n' + topic.cta + '\n\n' + topic.hashtags;
}

function downloadImageBuffer(url) {
  return new Promise((resolve) => {
    const chunks = [];
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
    const req = https.request(opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImageBuffer(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) { resolve(null); return; }
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function uploadPhotoToFB(imageBuffer) {
  return new Promise((resolve) => {
    const boundary = 'BP' + Date.now();
    const tokenClean = FB_PAGE_TOKEN.replace(/[^\x20-\x7E]/g, '').trim();
    const idClean = FB_PAGE_ID.replace(/[^\x20-\x7E]/g, '').trim();

    const part1 = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="access_token"\r\n\r\n' +
      tokenClean + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="published"\r\n\r\n' +
      'false\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="source"; filename="pet.jpg"\r\n' +
      'Content-Type: image/jpeg\r\n\r\n'
    );
    const part2 = Buffer.from('\r\n--' + boundary + '--\r\n');
    const body = Buffer.concat([part1, imageBuffer, part2]);

    const opts = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v20.0/' + idClean + '/photos',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
      }
    };

    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        addLog('Photo resp: ' + d.substring(0, 150));
        try { const p = JSON.parse(d); resolve(p.id || null); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', (e) => { addLog('Photo err: ' + e.message); resolve(null); });
    req.write(body);
    req.end();
  });
}

function postFeed(message, photoId) {
  return new Promise((resolve) => {
    const tokenClean = FB_PAGE_TOKEN.replace(/[^\x20-\x7E]/g, '').trim();
    const idClean = FB_PAGE_ID.replace(/[^\x20-\x7E]/g, '').trim();
    const msgClean = message.replace(/[^\x20-\x7E\n]/g, '').trim();

    const bodyObj = { message: msgClean, access_token: tokenClean };
    if (photoId) bodyObj.attached_media = [{ media_fbid: photoId }];

    const payload = JSON.stringify(bodyObj);
    const opts = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v20.0/' + idClean + '/feed',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };

    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        addLog('Feed resp: ' + d.substring(0, 200));
        try {
          const p = JSON.parse(d);
          if (p.id) { addLog('SUCCESS: ' + p.id); resolve({ success: true, id: p.id, caption: msgClean }); }
          else {
            const err = p.error ? p.error.message + ' (code:' + p.error.code + ')' : d;
            resolve({ success: false, error: err });
          }
        } catch(e) { resolve({ success: false, error: d.substring(0,100) }); }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function runPost(topicIndex) {
  const topic = postTopics[topicIndex % postTopics.length];
  addLog('=== Topic: ' + topic.keyword + ' ===');

  const caption = await generateCaption(topic);

  // Pick image specific to this topic - rotate through topic's own images
  const imgIndex = Math.floor(topicIndex / postTopics.length) % topic.images.length;
  const imgUrl = topic.images[imgIndex];
  addLog('Image for topic: ' + imgUrl);

  const imgBuf = await downloadImageBuffer(imgUrl);
  let photoId = null;

  if (imgBuf && imgBuf.length > 5000) {
    addLog('Image downloaded: ' + imgBuf.length + ' bytes');
    photoId = await uploadPhotoToFB(imgBuf);
    if (photoId) addLog('Photo uploaded: ' + photoId);
    else addLog('Photo upload failed - text only post');
  } else {
    addLog('Image download failed - text only post');
  }

  return await postFeed(caption, photoId);
}

async function runScheduler() {
  const now = new Date();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const d = now.getUTCDay();
  addLog('Scheduler tick: Day=' + d + ' ' + h + ':' + String(m).padStart(2,'0') + ' UTC');
  if (d === 0 || d === 6) { addLog('Weekend - skip'); return; }
  if (h === 9 && m < 5) {
    await runPost(postIndex);
    postIndex++;
  }
  if (h === 19 && m < 5) {
    await runPost(postIndex);
    postIndex++;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw - Sending test post...</h1><p>This takes ~20 seconds. Please wait.</p>');
    const result = await runPost(postIndex);
    if (result.success) {
      res.end('<h2 style="color:green">SUCCESS! Post is live on Facebook!</h2><p>Post ID: ' + result.id + '</p><pre style="background:#f0fff0;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px">' + result.caption + '</pre><a href="/">Back to dashboard</a></body></html>');
    } else {
      res.end('<h2 style="color:red">Failed: ' + result.error + '</h2><pre style="background:#111;color:#f66;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap">' + lastLog.slice(0,25).join('\n') + '</pre><a href="/">Back</a></body></html>');
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px"><h1>BritishPaw Auto Poster</h1><p style="color:green;font-size:18px">Running!</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;background:#f5f5f5"><b>Page ID</b></td><td style="padding:8px">' + FB_PAGE_ID + '</td></tr><tr><td style="padding:8px;background:#f5f5f5"><b>Token</b></td><td style="padding:8px">' + FB_PAGE_TOKEN.length + ' chars</td></tr><tr><td style="padding:8px;background:#f5f5f5"><b>Posts sent</b></td><td style="padding:8px">' + postIndex + '</td></tr><tr><td style="padding:8px;background:#f5f5f5"><b>Next topic</b></td><td style="padding:8px">' + postTopics[postIndex % postTopics.length].keyword + '</td></tr><tr><td style="padding:8px;background:#f5f5f5"><b>Schedule</b></td><td style="padding:8px">9:00 AM and 7:00 PM GMT, Mon-Fri</td></tr><tr><td style="padding:8px;background:#f5f5f5"><b>Time now</b></td><td style="padding:8px">' + new Date().toUTCString() + '</td></tr></table><a href="/test" style="display:inline-block;background:#1877f2;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Send Test Post NOW</a><h3>Logs</h3><pre style="background:#1a1a1a;color:#0f0;padding:16px;border-radius:8px;font-size:11px;white-space:pre-wrap">' + (lastLog.slice(0,30).join('\n') || 'No logs') + '</pre></body></html>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  addLog('BritishPaw Auto Poster ready on port ' + PORT);
  addLog('12 topics with unique images per topic');
  addLog('Posting Mon-Fri 9AM and 7PM GMT');
});

setInterval(runScheduler, 4 * 60 * 1000);
runScheduler();
