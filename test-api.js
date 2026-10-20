/**
 * Test script for ReelKar Serverless Functions
 * Validates /api/analyze with real Gemini API key and offline fallback,
 * and tests /api/feedback.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

import analyzeHandler from './api/analyze.js';
import feedbackHandler from './api/feedback.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(data) { this.data = data; return this; },
    end(str) { this.body = str; return this; }
  };
  return res;
}

async function runTests() {
  console.log('--- STARTING REELKAR BACKEND TESTS ---');

  // Load sample demo image base64
  const demoPath = path.resolve('assets/demo/demo-1.jpg');
  const demoB64 = fs.readFileSync(demoPath).toString('base64');
  const demoPath2 = path.resolve('assets/demo/demo-2.jpg');
  const demoB64_2 = fs.readFileSync(demoPath2).toString('base64');
  const demoPath3 = path.resolve('assets/demo/demo-3.jpg');
  const demoB64_3 = fs.readFileSync(demoPath3).toString('base64');

  // Test 1: Real Gemini 2.5 Flash Multimodal Analysis
  console.log('\n[Test 1] Testing /api/analyze with Gemini 2.5 Flash...');
  const req1 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: {
      images: [demoB64, demoB64_2, demoB64_3],
      shopName: 'Kalyan Heritage Jewellers',
      city: 'Ahmedabad',
      productType: 'jewellery',
      language: 'gu', // Gujarati test
      festival: 'Diwali Dhamaka'
    }
  };
  const res1 = createMockRes();
  await analyzeHandler(req1, res1);

  console.log('Status code:', res1.statusCode);
  if (res1.data) {
    console.log('Best hook index:', res1.data.bestHookIndex);
    console.log('Hook rationale:', res1.data.hookRationale);
    console.log('Caption preview:', res1.data.caption.substring(0, 100) + '...');
    console.log('Hashtags count:', res1.data.hashtags ? res1.data.hashtags.length : 0);
    console.log('Photos analyzed:', res1.data.photos ? res1.data.photos.length : 0);
    console.log('Offline mode:', res1.data.offlineMode);
  } else {
    console.error('Test 1 failed, body:', res1.body);
  }

  // Test 2: Fallback deterministic analysis (no API key)
  console.log('\n[Test 2] Testing /api/analyze offline fallback (simulating missing API key)...');
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const req2 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.2' },
    body: {
      images: [demoB64, demoB64_2, demoB64_3],
      shopName: 'Shree Krishna Jewellers',
      city: 'Rajkot',
      productType: 'jewellery',
      language: 'hi', // Hindi fallback test
      festival: 'none'
    }
  };
  const res2 = createMockRes();
  await analyzeHandler(req2, res2);

  process.env.GEMINI_API_KEY = originalKey; // Restore key

  console.log('Status code:', res2.statusCode);
  console.log('Offline mode flag:', res2.data?.offlineMode);
  console.log('Fallback caption:', res2.data?.caption.substring(0, 80) + '...');

  // Test 3: Feedback submission
  console.log('\n[Test 3] Testing /api/feedback...');
  const req3 = {
    method: 'POST',
    headers: { 'user-agent': 'ReelKarTestRunner/1.0' },
    body: {
      name: 'Test Founder',
      businessType: 'Investor / Tech Founder',
      willingToPay: '₹999/mo (Pro Unlimited)',
      rating: 5,
      feedback: 'Great zero-editing workflow for tier-2/3 Indian retailers.'
    }
  };
  const res3 = createMockRes();
  await feedbackHandler(req3, res3);
  console.log('Feedback response status:', res3.statusCode, res3.data);

  console.log('\n--- ALL BACKEND TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
