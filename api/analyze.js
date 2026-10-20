/**
 * ReelKar AI Analysis Endpoint (Vercel Serverless Function)
 * Analyzes product photos via Google Gemini 2.5 Flash multimodal API.
 * Detects items, chooses optimal hook photo with rationale, extracts dominant colors,
 * and writes culturally natural captions in English, Hindi, Gujarati, or Hinglish.
 * 
 * Includes high-resilience deterministic fallback engine so the app NEVER fails.
 */

// Simple in-memory rate limiter (per-IP window)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

// Fallback deterministic templates (natural, high-converting copy)
const TEMPLATES = {
  jewellery: {
    en: {
      caption: "Timeless elegance crafted for moments that matter. ✨ Hand-finished in pure 22K gold with breathtaking gemstone detailing. Designed to make heads turn at every celebration.\n\n📍 Visit our boutique or tap WhatsApp to order with pan-India insured shipping.",
      hookRationale: "Front-facing intricate choker detailing captures viewer attention in the first 1.5 seconds.",
      titles: ['Royal Choker', 'Peacock Jhumka', 'Solitaire Ring', 'Antique Kadas', 'Bridal Polki'],
      tags: ['#IndianJewellery', '#GoldJewellery', '#BridalJewellery', '#KundanJewellery', '#TempleJewellery', '#JewelleryOfTheDay', '#WeddingJewellery', '#RoyalJewels', '#AntiqueGold', '#HandcraftedJewellery', '#IndianBride', '#JewelleryAddict']
    },
    hi: {
      caption: "हर खास मौके के लिए बेमिसाल खूबसूरती। ✨ 22K शुद्ध सोने और अनमोल कुंदन-मोती का अनोखा संगम। जब आप इसे पहनेंगी, तो हर निगाह आप पर ही ठहरेगी।\n\n📍 आज ही हमारे शोरूम पधारें या घर बैठे ऑर्डर करने के लिए WhatsApp पर मेसेज करें। ऑल इंडिया शिपिंग उपलब्ध!",
      hookRationale: "कुंदन और मोतियों की चमक पहले ही पल में दर्शकों का ध्यान आकर्षित करती है।",
      titles: ['शाही कुंदन चोकर', 'झुमका बालियां', 'सॉलिटेयर अंगूठी', 'पारंपरिक कड़े', 'राजपूती ब्राइडल सेट'],
      tags: ['#भारतीयगहने', '#सोनेकेगहने', '#दुल्हनगहने', '#कुंदनज्वेलरी', '#IndianJewellery', '#BridalJewellery', '#WeddingInspiration', '#GoldJewellery', '#DesiBride', '#TraditionalLook', '#ShubhVivah', '#JewelleryLover']
    },
    gu: {
      caption: "તમારા દરેક શુભ પ્રસંગને યાદગાર બનાવે તેવી અદભુત કારીગરી! ✨ શુદ્ધ ૨૨ કેરેટ સોનામાં કંડારેલું રાજવી કલેક્શન. લગ્ન પ્રસંગ કે તહેવારમાં આપશે આપને એકદમ રોયલ લુક.\n\n📍 અમારા શોરૂમની મુલાકાત લો અથવા ઘરે બેઠા મંગાવવા WhatsApp પર સંપર્ક કરો. સમગ્ર ભારતમાં સુરક્ષિત ડિલિવરી!",
      hookRationale: "ચોકરનો ભવ્ય લુક અને બારીક વર્ક પહેલી જ સેકન્ડે ગ્રાહકનું ધ્યાન ખેંચે છે.",
      titles: ['રાજવી કુંદન હાર', 'પરંપરાગત ઝુમખા', 'સોલિટેર વીંટી', 'એન્ટિક સોનાના કડા', 'બ્રાઈડલ સેટ'],
      tags: ['#દાગીના', '#સોનું', '#લગ્નસ્પેશ્યલ', '#ગુજરાતીવેડિંગ', '#IndianJewellery', '#GujaratiBride', '#GoldJewellery', '#BridalJewellery', '#KundanNecklace', '#WeddingSeason', '#AhmedabadJewellers', '#RajkotGold']
    },
    hinglish: {
      caption: "Shine karo apne special moments mein! ✨ Pure 22K gold aur detailed craftsmanship ke saath designed. Perfect for weddings, festivals aur aapke grand celebrations.\n\n📍 Store visit karein ya WhatsApp par direct message bhej kar order book karein. Pan-India shipping available!",
      hookRationale: "Detailed high-contrast sparkle gives thumb-stopping power on the Reels feed.",
      titles: ['Royal Gold Choker', 'Statement Jhumkas', 'Solitaire Ring', 'Heritage Kadas', 'Bridal Set'],
      tags: ['#ReelsKaro', '#IndianJewellery', '#GoldLovers', '#BridalInspo', '#WeddingLook', '#DesiFashion', '#KundanChoker', '#TrendingJewellery', '#HandcraftedGold', '#JewelleryGram', '#FestiveLook', '#InstaJewels']
    }
  },
  clothing: {
    en: {
      caption: "Drape yourself in royal heritage. ✨ Handwoven pure silk with authentic zari motifs that celebrate tradition with modern grace.\n\n📍 WhatsApp us with a screenshot to order directly.",
      hookRationale: "Vibrant silk drape and contrast border immediately establish luxury quality.",
      titles: ['Pure Silk Saree', 'Zari Border Detail', 'Bridal Palette', 'Intricate Pallu', 'Heritage Weave'],
      tags: ['#SareeLove', '#SilkSaree', '#IndianEthnic', '#HandloomLove', '#SareeTwitter', '#WeddingWear', '#BanarasiSilk', '#KanjivaramSaree', '#EthnicFashion', '#SareeNotSorry', '#DesiSwag', '#FestiveWear']
    },
    hi: {
      caption: "शाही बनारसी और कांजीवरम का जादू! ✨ असली ज़री और शुद्ध रेशम का यह कलेक्शन आपके हर उत्सव को बनाएगा और भी खास।\n\n📍 स्क्रीनशॉट लेकर WhatsApp पर भेजें और घर बैठे ऑर्डर प्राप्त करें।",
      hookRationale: "रेशम की भव्य चमक और जरी का काम पहली नज़र में ही पसंद आ जाता है।",
      titles: ['शाही सिल्क साड़ी', 'जरी पल्लू', 'ब्राइडल लहंगा', 'हैंडलूम बॉर्डर', 'त्यौहारी पोशाक'],
      tags: ['#साड़ीप्रेम', '#सिल्कसाड़ी', '#भारतीयपरिधान', '#दुल्हनपहनावा', '#SareeLove', '#IndianWear', '#DesiVibes', '#FestiveFashion', '#BridalSaree', '#EthnicWear', '#BanarasiLove', '#HandloomIndia']
    },
    gu: {
      caption: "શુદ્ધ પટોળા અને બાંધણીની અસલ પરંપરા! ✨ નજાકતભરી કારીગરી અને મનમોહક રંગોનું અનોખું સંગમ. લગ્ન અને પૂજા માટે ઉત્તમ પસંદગી.\n\n📍 મનપસંદ સાડીનો સ્ક્રીનશૉટ WhatsApp પર મોકલી તુરંત બુક કરાવો.",
      hookRationale: "બાંધણી અને પટોળાની વિશિષ્ટ ભાત જોતાં જ આકર્ષિત કરે છે.",
      titles: ['પ્યોર સિલ્ક સાડી', 'બાંધણી પલ્લુ', 'જરદોશી વર્ક', 'બ્રાઈડલ ચોલી', 'પરંપરાગત લહેંગા'],
      tags: ['#સાડી', '#પાટણપટોળા', '#બાંધણી', '#ગુજરાતીફેશન', '#GujaratiSaree', '#SilkSaree', '#IndianFashion', '#DesiLook', '#WeddingSaree', '#TraditionalWear', '#EthnicGlam', '#SareeFashion']
    },
    hinglish: {
      caption: "Desi glam at its finest! ✨ Gorgeous silk weave with stunning zari work that turns heads anywhere you go.\n\n📍 Screenshot bhejiye WhatsApp par aur apna order confirm karein. Limited pieces only!",
      hookRationale: "Rich fabric texture grabs attention during rapid scrolling.",
      titles: ['Pure Silk Saree', 'Heavy Zari Pallu', 'Festive Collection', 'Designer Cut', 'Royal Drape'],
      tags: ['#SareeStyle', '#EthnicVibes', '#DesiFit', '#WeddingSeason', '#SilkSareeLove', '#OOTDIndia', '#TrendingEthnic', '#FestiveFashion', '#IndianAttire', '#SareeStory', '#DesiGlam', '#FashionReel']
    }
  },
  food: {
    en: {
      caption: "Baked fresh with pure love, premium butter, and authentic ingredients. 🍰 Treat your sweet tooth to unforgettable artisan flavors.\n\n📍 Order on WhatsApp for same-day local delivery!",
      hookRationale: "Close-up textural richness and chocolate drizzle trigger instant appetite appeal.",
      titles: ['Artisan Cake', 'Fresh Frosting', 'Gourmet Treats', 'Celebration Slice', 'Bespoke Dessert'],
      tags: ['#BakersOfInstagram', '#FreshBakes', '#CakeLovers', '#ArtisanBakery', '#DessertTable', '#SweetTreats', '#ChocolateLover', '#CustomCakes', '#PastryChef', '#BakeryLife', '#FoodReels', '#InstaBake']
    },
    hi: {
      caption: "ताज़ा, स्वादिष्ट और शुद्ध प्यार से बना! 🍰 हर बाइट में मिलेगा रिच और क्रीमी स्वाद जो आपका दिन बना दे।\n\n📍 अपनी पार्टी या जन्मदिन के लिए आज ही WhatsApp पर ऑर्डर बुक करें!",
      hookRationale: "ताज़ा केक की क्रीम और सजावट देखते ही मुंह में पानी ला देती है।",
      titles: ['ताज़ा केक', 'चॉकलेट डिलाइट', 'स्पेशल पेस्ट्री', 'पार्टी डेसर्ट', 'आर्टिसन बाइट'],
      tags: ['#केक', '#बेकरी', '#मीठा', '#स्वाद', '#FoodieIndia', '#IndianBakers', '#CakeLovers', '#SweetTooth', '#PartyCakes', '#FreshBakery', '#FoodReel', '#DessertLove']
    },
    gu: {
      caption: "તાજું, મીઠું અને મનમોહક સ્વાદિષ્ટ! 🍰 ઘર જેવો શુદ્ધ સ્વાદ અને સ્પેસિયલાઇઝ્ડ ડિઝાઇન દરેક સેલિબ્રેશન માટે પરફેક્ટ.\n\n📍 અત્યારે જ WhatsApp પર મેસેજ કરી તમારો ઓર્ડર બુક કરો!",
      hookRationale: "સુશોભિત કેકની નજાકત જોતાં જ મન લલચાવી દે છે.",
      titles: ['સ્પેશ્યલ કેક', 'ચોકલેટ ફ્રોસ્ટિંગ', 'પાર્ટી ડીલાઈટ', 'તાજી પેસ્ટ્રી', 'બેકરી ખાસિયત'],
      tags: ['#ગુજરાતીસ્વાદ', '#કેક', '#બેકરી', '#ફૂડલવર', '#AhmedabadFood', '#SuratFoodies', '#FreshCake', '#CakeDesign', '#SweetBites', '#HomeBaker', '#DessertTime', '#FoodGram']
    },
    hinglish: {
      caption: "Pure happiness in every single bite! 🍰 Freshly baked artisan goodness prepared with supreme love.\n\n📍 WhatsApp par order karein aur enjoy karein same day delivery!",
      hookRationale: "Mouthwatering layers capture attention instantly.",
      titles: ['Signature Cake', 'Choco Dripping', 'Celebration Special', 'Sweet Delights', 'Artisan Treats'],
      tags: ['#FoodReel', '#CakeLover', '#BakersLife', '#SweetTooth', '#DessertGram', '#FreshBakes', '#FoodiesOfInsta', '#PartyVibes', '#ArtisanBakery', '#DeliciousEats', '#CakesOfInstagram', '#Yum']
    }
  },
  beauty: {
    en: {
      caption: "Glow with confidence. ✨ Professional bridal makeover and hair styling tailored to your natural radiance.\n\n📍 DM or tap WhatsApp to reserve your bridal slot.",
      hookRationale: "Flawless close-up bridal glow and eye makeup command attention.",
      titles: ['Bridal Radiance', 'HD Makeup', 'Royal Hairdo', 'Glam Transformation', 'Glass Skin Finish'],
      tags: ['#BridalMakeup', '#IndianBride', '#MakeupArtist', '#SalonLife', '#BridalGlow', '#WeddingMakeover', '#HairStylist', '#DesiBride', '#GlamLook', '#BeautyReels', '#InstaBeauty', '#BridalInspo']
    },
    hi: {
      caption: "आपकी खूबसूरती, हमारा समर्पण। ✨ ब्राइडल और पार्टी मेकओवर जो आपकी प्राकृतिक चमक को बनाए रखे सबसे खास।\n\n📍 अपना स्लॉट पहले से बुक करने के लिए WhatsApp पर सम्पर्क करें।",
      hookRationale: "ब्राइडल आई मेकअप और मुस्कान दर्शकों को तुरंत रोक लेती है।",
      titles: ['ब्राइडल ग्लो', 'पार्टी मेकओवर', 'हेयर स्टाइलिंग', 'शाही शृंगार', 'एचडी फिनिश'],
      tags: ['#ब्राइडलमेकअप', '#सैलून', '#खूबसूरती', '#दुल्हनशृंगार', '#MakeupArtistIndia', '#IndianBride', '#BridalGlow', '#DesiWedding', '#SalonVibes', '#GlamourLook', '#BeautyInspo', '#WeddingLook']
    },
    gu: {
      caption: "તમારા લગ્ન દિવસનો સૌથી સુંદર લુક! ✨ પ્રોફેશનલ બ્રાઈડલ મેકઅપ અને હેરસ્ટાઇલ જે આપશે આપને રાજકુમારી જેવો ગ્લો.\n\n📍 આપનું બુકિંગ કન્ફર્મ કરવા WhatsApp પર આજે જ સંપર્ક કરો.",
      hookRationale: "બ્રાઈડલ જ્વેલરી સાથે મેકઅપનો ગ્લો ખૂબ આકર્ષક લાગે છે.",
      titles: ['બ્રાઈડલ ગ્લો', 'શાહી મેકઓવર', 'હેર સ્ટાઈલ', 'પાર્ટી શૃંગાર', 'એચડી ટ્રાન્સફોર્મેશન'],
      tags: ['#બ્રાઈડલમેકઅપ', '#સલૂન', '#ગુજરાતીદુલ્હન', '#રૂપશૃંગાર', '#GujaratiBride', '#BridalMakeup', '#WeddingGlam', '#IndianSalon', '#BeautyTrends', '#HairStyle', '#DesiBridal', '#BridalGoals']
    },
    hinglish: {
      caption: "Flawless glam for your biggest moments! ✨ Customized bridal & party looks that let your inner light shine bright.\n\n📍 WhatsApp karein aur bridal bookings ke liye inquiry karein!",
      hookRationale: "Stunning transformation aesthetic hooks viewers in 1 second.",
      titles: ['Bridal Glam', 'Soft HD Finish', 'Hair Artistry', 'Party Transformation', 'Glow Up'],
      tags: ['#BridalVibes', '#MakeupReel', '#SalonGoals', '#DesiBride', '#GlamSquad', '#WeddingSeason', '#IndianMUA', '#BeautyHacks', '#OOTDIndia', '#BrideToBe', '#ReelsViral', '#InstaGlam']
    }
  }
};

/**
 * Generate smart deterministic fallback response
 */
function getDeterministicResponse({ category = 'jewellery', lang = 'en', count = 5, shopName = '' }) {
  const catKey = TEMPLATES[category] ? category : 'jewellery';
  const langKey = TEMPLATES[catKey][lang] ? lang : 'en';
  const data = TEMPLATES[catKey][langKey];

  const defaultColors = ['#d4af37', '#ffd166', '#52b788', '#e76f51', '#c4972f'];
  const photos = Array.from({ length: count }).map((_, i) => ({
    index: i,
    title: data.titles[i % data.titles.length],
    itemType: `${category.charAt(0).toUpperCase() + category.slice(1)} Article ${i + 1}`,
    dominantColor: defaultColors[i % defaultColors.length],
    bestSuitedOccasion: i === 0 ? 'Bridal & Grand Reception' : 'Festive Celebrations',
    hookScore: i === 0 ? 98 : 85 - i * 5
  }));

  return {
    offlineMode: true,
    bestHookIndex: 0,
    hookRationale: data.hookRationale,
    suggestedOrder: Array.from({ length: count }, (_, i) => i),
    caption: `${shopName ? `✨ ${shopName} Presents ✨\n\n` : ''}${data.caption}`,
    hashtags: data.tags,
    photos
  };
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  const { images, shopName, city, productType, language = 'en', festival = 'none' } = req.body || {};

  // Validation
  if (!Array.isArray(images) || images.length < 3) {
    return res.status(400).json({ error: 'Please provide at least 3 images' });
  }

  if (images.length > 8) {
    return res.status(400).json({ error: 'Maximum 8 images allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // If API key is missing, execute deterministic fallback gracefully
  if (!apiKey) {
    console.warn('[REELKAR] Missing GEMINI_API_KEY, using deterministic fallback');
    const fallback = getDeterministicResponse({
      category: productType,
      lang: language,
      count: images.length,
      shopName
    });
    return res.status(200).json(fallback);
  }

  try {
    // Construct Gemini multimodal payload
    const imageParts = images.map((b64, idx) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: b64
      }
    }));

    const langInstructions = {
      en: 'Write the reel caption and hook in fluent, high-converting English.',
      hi: 'Write the reel caption in natural, culturally rich, authentic Hindi (Devanagari script), sounding like a warm Indian boutique owner.',
      gu: 'Write the reel caption in authentic, elegant Gujarati (ગુજરાતી લિપિ), culturally tailored for Gujarat weddings and festivals.',
      hinglish: 'Write the reel caption in friendly, modern Hinglish (conversational Hindi written in English letters).'
    };

    const systemPrompt = `You are an expert social media strategist and copywriter for luxury Indian retail shops (jewellery, sarees, bakeries, salons).
Analyze the provided ${images.length} product photos for store "${shopName || 'Boutique'}" in ${city || 'India'}, product category: "${productType || 'Jewellery'}", festival context: "${festival}".
Language requirement: ${langInstructions[language] || langInstructions.en}

You must return ONLY a valid, raw JSON object (no markdown fences, no triple backticks, no comments) with this exact schema:
{
  "bestHookIndex": <integer index 0 to ${images.length - 1} of the single most visually striking photo that stops scrolling>,
  "hookRationale": "<1 concise sentence explaining why this photo is the strongest hook>",
  "suggestedOrder": [<array of original indices 0 to ${images.length - 1} starting with bestHookIndex then optimal visual rhythm>],
  "caption": "<engaging, ready-to-post Instagram caption in requested language with emojis, benefits, and CTA to DM/WhatsApp>",
  "hashtags": [<array of 12 highly relevant, trending hashtags>],
  "photos": [
    {
      "index": 0,
      "title": "<short elegant title max 4 words>",
      "itemType": "<specific item detected, e.g. Kundan Choker Necklace>",
      "dominantColor": "<hex color code, e.g. #D4AF37>",
      "bestSuitedOccasion": "<e.g. Wedding Reception / Diwali Puja>"
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500); // 4.5s fast timeout for snappy experience

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              ...imageParts
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[REELKAR] Gemini API error:', geminiRes.status, errText);
      // Fallback on API error
      const fallback = getDeterministicResponse({
        category: productType,
        lang: language,
        count: images.length,
        shopName
      });
      return res.status(200).json(fallback);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    // Clean any accidental markdown wrap
    const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanedText);

    // Verify minimum required fields
    if (typeof parsed.bestHookIndex !== 'number' || !Array.isArray(parsed.photos)) {
      throw new Error('Invalid JSON structure from Gemini');
    }

    parsed.offlineMode = false;
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('[REELKAR] Analyze handler exception, activating fallback:', error.message);
    const fallback = getDeterministicResponse({
      category: productType,
      lang: language,
      count: images.length,
      shopName
    });
    return res.status(200).json(fallback);
  }
}
