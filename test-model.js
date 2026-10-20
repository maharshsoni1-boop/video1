const key = 'AIzaSyDDIBw-Ojua3Mwjh7Zhr_wui93LanR_17k';

async function test() {
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello in 2 words' }] }] })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`SUCCESS with ${m}:`, data.candidates[0].content.parts[0].text.trim());
        return m;
      } else {
        console.log(`FAILED with ${m}:`, data.error?.message || data.error);
      }
    } catch (e) {
      console.log(`ERR with ${m}:`, e.message);
    }
  }
}

test();
