/**
 * ReelKar Prototype Feedback Endpoint (Vercel Serverless Function)
 * Captures user feedback from founders, investors, and business owners.
 * Logs structured feedback to Vercel runtime logs and optionally forwards
 * to an external webhook (Slack, Discord, Google Sheet, etc.).
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, businessType, willingToPay, feedback, rating } = req.body || {};

    const payload = {
      timestamp: new Date().toISOString(),
      name: (name || 'Anonymous').trim(),
      businessType: businessType || 'Not specified',
      willingToPay: willingToPay || 'Not specified',
      rating: rating || 5,
      feedback: (feedback || '').trim(),
      userAgent: req.headers?.['user-agent'] || 'unknown',
      clientIp: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    };

    // 1. Structured log for Vercel Observability
    console.log('[REELKAR_FEEDBACK]', JSON.stringify(payload));

    // 2. Optional webhook forwarding if configured in env
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📢 **New ReelKar Feedback**\n**From:** ${payload.name} (${payload.businessType})\n**Willing to pay:** ${payload.willingToPay}\n**Rating:** ${'⭐'.repeat(payload.rating)}\n**Feedback:** ${payload.feedback}`
          })
        });
      } catch (webhookErr) {
        console.warn('[REELKAR] Webhook forward failed:', webhookErr.message);
      }
    }

    return res.status(200).json({ success: true, message: 'Thank you for your feedback!' });

  } catch (err) {
    console.error('[REELKAR] Feedback error:', err);
    return res.status(500).json({ error: 'Failed to record feedback' });
  }
}
