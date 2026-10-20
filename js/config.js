/**
 * ReelKar Global Configuration
 * To rename or rebrand the entire application, simply modify this file.
 */

export const CONFIG = {
  APP_NAME: 'ReelKar',
  TAGLINE: 'Upload 5 photos. Get a reel ready to post.',
  SUBTITLE: 'Built for Indian businesses: jewellers, saree boutiques, bakeries & salons.',
  VERSION: '1.0.0',

  // Video Generation Settings
  VIDEO: {
    WIDTH: 1080,
    HEIGHT: 1920,
    FPS: 30,
    SLIDE_DURATION_SEC: 2.6, // seconds per photo
    OUTRO_DURATION_SEC: 2.5, // seconds for outro CTA
    TRANSITION_DURATION_SEC: 0.45,
    MIN_PHOTOS: 3,
    MAX_PHOTOS: 8,
    DEFAULT_PHOTO_COUNT: 5,
  },

  // Image Downscaling (keeps request payload << 4.5 MB for Vercel)
  IMAGE_PROCESSING: {
    MAX_DIMENSION: 768, // px longest side
    JPEG_QUALITY: 0.72,
    MAX_PAYLOAD_MB: 4.0,
  },

  // Business Categories
  CATEGORIES: [
    { id: 'jewellery', label: 'Jewellery', defaultTag: '22K Gold • Handcrafted' },
    { id: 'clothing', label: 'Saree & Clothing', defaultTag: 'Pure Silk • Designer Wear' },
    { id: 'food', label: 'Food & Bakery', defaultTag: 'Fresh Baked • Artisan Delights' },
    { id: 'beauty', label: 'Salon & Beauty', defaultTag: 'Bridal Makeover • Luxury Care' },
    { id: 'other', label: 'Handicraft & Other', defaultTag: 'Handmade • Premium Quality' },
  ],

  // Caption Languages
  LANGUAGES: [
    { id: 'en', label: 'English', desc: 'Modern & High-Converting' },
    { id: 'hi', label: 'हिंदी (Hindi)', desc: 'Natural & Engaging' },
    { id: 'gu', label: 'ગુજરાતી (Gujarati)', desc: 'Culturally Tailored' },
    { id: 'hinglish', label: 'Hinglish', desc: 'Casual & Relatable' },
  ],

  // Festival Mode Presets
  FESTIVALS: [
    { id: 'none', label: 'Regular (No Festival)', badge: null },
    { id: 'diwali', label: 'Diwali Dhamaka', badge: '✨ Diwali Special Collection ✨', blessing: 'Happy Diwali' },
    { id: 'dhanteras', label: 'Dhanteras Shubh Labh', badge: '🪙 Shubh Dhanteras Exclusive 🪙', blessing: 'Shubh Dhanteras' },
    { id: 'wedding', label: 'Wedding Season', badge: '💫 Royal Bridal Edit 💫', blessing: 'Royal Wedding Collection' },
    { id: 'akshaya', label: 'Akshaya Tritiya', badge: '🌟 Akshaya Tritiya Gold 🌟', blessing: 'Akshaya Tritiya Blessings' },
    { id: 'new_arrivals', label: 'New Arrivals', badge: '🔥 Fresh Stock Just Dropped 🔥', blessing: 'New Festive Arrivals' },
  ],

  // Demo Sample Photos (Loaded on 1-click test)
  SAMPLE_PHOTOS: [
    {
      src: 'assets/demo/demo-1.jpg',
      name: 'Royal Kundan Choker',
      price: '₹34,999',
      itemType: 'Kundan Choker Necklace',
      dominantColor: '#d4af37'
    },
    {
      src: 'assets/demo/demo-2.jpg',
      name: 'Temple Jhumka Earrings',
      price: '₹18,500',
      itemType: 'Gold Filigree Jhumkas',
      dominantColor: '#ffd166'
    },
    {
      src: 'assets/demo/demo-3.jpg',
      name: 'Solitaire Emerald Ring',
      price: '₹22,999',
      itemType: 'Emerald Halo Ring',
      dominantColor: '#52b788'
    },
    {
      src: 'assets/demo/demo-4.jpg',
      name: 'Antique Kada Bangles',
      price: '₹42,000',
      itemType: 'Antique Gold Kadas',
      dominantColor: '#d4af37'
    },
    {
      src: 'assets/demo/demo-5.jpg',
      name: 'Rajputana Polki Bridal Set',
      price: '₹85,000',
      itemType: 'Complete Bridal Set',
      dominantColor: '#e5b842'
    }
  ]
};
