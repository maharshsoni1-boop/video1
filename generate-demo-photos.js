import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const assetsDir = path.resolve('assets/demo');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const scenes = [
  {
    name: 'demo-1.jpg',
    title: 'Kundan Choker Necklace',
    tag: 'Bridal Kundan & Pearl Gold Choker',
    bg: 'linear-gradient(135deg, #1b0a11 0%, #2b0e1b 50%, #0d0408 100%)',
    accent: '#f6d365',
    drawSvg: `
      <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad1" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#3a1424"/>
            <stop offset="60%" stop-color="#190710"/>
            <stop offset="100%" stop-color="#090206"/>
          </radialGradient>
          <linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff4cc"/>
            <stop offset="25%" stop-color="#e5b842"/>
            <stop offset="50%" stop-color="#fdf1a9"/>
            <stop offset="75%" stop-color="#c99726"/>
            <stop offset="100%" stop-color="#936d10"/>
          </linearGradient>
          <linearGradient id="ruby" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4d6d"/>
            <stop offset="40%" stop-color="#c9184a"/>
            <stop offset="100%" stop-color="#590d22"/>
          </linearGradient>
          <radialGradient id="pearl" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#f0ece1"/>
            <stop offset="100%" stop-color="#d6ccb8"/>
          </radialGradient>
          <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="shadow1">
            <feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#000000" flood-opacity="0.8"/>
          </filter>
        </defs>
        <rect width="800" height="1000" fill="url(#bgGrad1)"/>
        <!-- Soft ambient pedestal -->
        <ellipse cx="400" cy="720" rx="280" ry="100" fill="#13050d" opacity="0.9"/>
        <ellipse cx="400" cy="700" rx="240" ry="80" fill="#200a16" opacity="0.6"/>

        <!-- Neckform silhouette -->
        <path d="M 280 280 Q 400 320 520 280 L 580 620 Q 400 680 220 620 Z" fill="#1a0812" opacity="0.85" filter="url(#shadow1)"/>

        <!-- Kundan Choker Arc -->
        <g filter="url(#shadow1)">
          <!-- Inner Band -->
          <path d="M 270 360 Q 400 450 530 360" fill="none" stroke="url(#gold1)" stroke-width="22" stroke-linecap="round"/>
          <path d="M 260 395 Q 400 495 540 395" fill="none" stroke="url(#gold1)" stroke-width="16" stroke-linecap="round"/>

          <!-- Gem settings across arc -->
          ${Array.from({length: 11}).map((_, i) => {
            const t = (i + 1) / 12;
            const x = 270 + (530 - 270) * t;
            const y = 360 + Math.sin(t * Math.PI) * 85;
            return `
              <g transform="translate(${x}, ${y})">
                <circle cx="0" cy="0" r="16" fill="url(#gold1)" stroke="#805b0d" stroke-width="2"/>
                <circle cx="0" cy="0" r="11" fill="url(#ruby)"/>
                <polygon points="0,-10 7,0 0,10 -7,0" fill="#fff" opacity="0.35"/>
                <!-- Hanging pearl drop -->
                <line x1="0" y1="16" x2="0" y2="34" stroke="url(#gold1)" stroke-width="3"/>
                <circle cx="0" cy="40" r="8" fill="url(#pearl)" stroke="#c4b89b" stroke-width="1"/>
              </g>
            `;
          }).join('')}

          <!-- Central Grand Pendant -->
          <g transform="translate(400, 480)" filter="url(#glow1)">
            <polygon points="0,0 45,45 0,90 -45,45" fill="url(#gold1)" stroke="#ffeaa7" stroke-width="2"/>
            <polygon points="0,15 30,45 0,75 -30,45" fill="url(#ruby)"/>
            <circle cx="0" cy="45" r="8" fill="#ffffff" opacity="0.85"/>
            <!-- Tiered hanging pearls -->
            <line x1="-20" y1="70" x2="-20" y2="95" stroke="url(#gold1)" stroke-width="2.5"/>
            <circle cx="-20" cy="102" r="7" fill="url(#pearl)"/>
            <line x1="0" y1="90" x2="0" y2="120" stroke="url(#gold1)" stroke-width="3"/>
            <circle cx="0" cy="128" r="10" fill="url(#pearl)"/>
            <line x1="20" y1="70" x2="20" y2="95" stroke="url(#gold1)" stroke-width="2.5"/>
            <circle cx="20" cy="102" r="7" fill="url(#pearl)"/>
          </g>
        </g>

        <!-- Sparkle Highlights -->
        <g fill="#ffffff" opacity="0.9">
          <circle cx="340" cy="380" r="3" filter="url(#glow1)"/>
          <path d="M 400 435 Q 400 445 410 445 Q 400 445 400 455 Q 400 445 390 445 Q 400 445 400 435" fill="#fff" filter="url(#glow1)"/>
          <path d="M 460 380 Q 460 388 468 388 Q 460 388 460 396 Q 460 388 452 388 Q 460 388 460 380" fill="#fff" filter="url(#glow1)"/>
        </g>

        <!-- Subtle Label Watermark -->
        <text x="400" y="880" text-anchor="middle" fill="#d4af37" font-family="'Playfair Display', serif" font-size="28" letter-spacing="4" font-weight="600">ROYAL KUNDAN CHOKER</text>
        <text x="400" y="915" text-anchor="middle" fill="#aa9260" font-family="'Inter', sans-serif" font-size="14" letter-spacing="2">22K GOLD • FRESHWATER PEARLS</text>
      </svg>
    `
  },
  {
    name: 'demo-2.jpg',
    title: 'Heritage Jhumka Earrings',
    tag: 'Classic Peacock Temple Gold Jhumkas',
    bg: 'linear-gradient(135deg, #0d1b1e 0%, #172c30 50%, #081113 100%)',
    accent: '#ffd166',
    drawSvg: `
      <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad2" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="#143438"/>
            <stop offset="60%" stop-color="#0a1d20"/>
            <stop offset="100%" stop-color="#040b0d"/>
          </radialGradient>
          <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff8db"/>
            <stop offset="30%" stop-color="#e8bf53"/>
            <stop offset="70%" stop-color="#c4972f"/>
            <stop offset="100%" stop-color="#8c6414"/>
          </linearGradient>
          <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#52b788"/>
            <stop offset="50%" stop-color="#1b4332"/>
            <stop offset="100%" stop-color="#081c15"/>
          </linearGradient>
          <radialGradient id="pearl2" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#eae6dd"/>
            <stop offset="100%" stop-color="#c9c1b1"/>
          </radialGradient>
          <filter id="shadow2">
            <feDropShadow dx="0" dy="20" stdDeviation="16" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
        </defs>
        <rect width="800" height="1000" fill="url(#bgGrad2)"/>

        <!-- Pedestal / Stand reflection -->
        <ellipse cx="400" cy="780" rx="300" ry="80" fill="#061214" opacity="0.9"/>

        <!-- Jhumka Pair: Left & Right -->
        ${[-130, 130].map(offsetX => `
          <g transform="translate(${400 + offsetX}, 260)" filter="url(#shadow2)">
            <!-- Ear Stud: Peacock / Floral Motif -->
            <circle cx="0" cy="0" r="32" fill="url(#gold2)"/>
            <circle cx="0" cy="0" r="22" fill="url(#emerald)"/>
            <circle cx="0" cy="0" r="10" fill="#fff" opacity="0.8"/>
            <circle cx="0" cy="0" r="5" fill="url(#emerald)"/>

            <!-- Connector stem & link -->
            <line x1="0" y1="32" x2="0" y2="70" stroke="url(#gold2)" stroke-width="7"/>
            <circle cx="0" cy="70" r="10" fill="url(#gold2)"/>

            <!-- Bell / Dome of Jhumka -->
            <path d="M -60 145 C -60 75 60 75 60 145 Z" fill="url(#gold2)" stroke="#b88922" stroke-width="3"/>
            <!-- Filigree ribs on dome -->
            <path d="M -40 142 C -40 95 -10 82 0 80 C 10 82 40 95 40 142" fill="none" stroke="#fff8db" stroke-width="2" opacity="0.6"/>
            <path d="M -20 145 C -20 105 0 90 0 80 C 0 90 20 105 20 145" fill="none" stroke="#8c6414" stroke-width="2"/>
            
            <!-- Dome rim -->
            <rect x="-65" y="145" width="130" height="14" rx="7" fill="url(#gold2)"/>

            <!-- Dangling tiny pearl drops along the rim -->
            ${[-50, -35, -20, -5, 10, 25, 40, 52].map(px => `
              <g transform="translate(${px}, 160)">
                <line x1="0" y1="0" x2="0" y2="18" stroke="url(#gold2)" stroke-width="2.5"/>
                <circle cx="0" cy="22" r="5.5" fill="url(#pearl2)"/>
              </g>
            `).join('')}

            <!-- Center hanging statement pearl drop -->
            <line x1="0" y1="155" x2="0" y2="200" stroke="url(#gold2)" stroke-width="4"/>
            <circle cx="0" cy="214" r="13" fill="url(#pearl2)"/>
          </g>
        `).join('')}

        <!-- Sparkles -->
        <path d="M 270 260 Q 270 270 280 270 Q 270 270 270 280 Q 270 270 260 270 Q 270 270 270 260" fill="#fff"/>
        <path d="M 530 260 Q 530 270 540 270 Q 530 270 530 280 Q 530 270 520 270 Q 530 270 530 260" fill="#fff"/>
        <circle cx="400" cy="420" r="2.5" fill="#fff"/>

        <text x="400" y="880" text-anchor="middle" fill="#e8bf53" font-family="'Playfair Display', serif" font-size="28" letter-spacing="4" font-weight="600">TEMPLE JHUMKA EARRINGS</text>
        <text x="400" y="915" text-anchor="middle" fill="#8cb3a8" font-family="'Inter', sans-serif" font-size="14" letter-spacing="2">HANDCRAFTED FILIGREE • NATURAL EMERALD</text>
      </svg>
    `
  },
  {
    name: 'demo-3.jpg',
    title: 'Solitaire Emerald Ring',
    tag: 'Diamond Halo & Zambian Emerald Ring',
    bg: 'linear-gradient(135deg, #181512 0%, #241e19 50%, #0d0a08 100%)',
    accent: '#52b788',
    drawSvg: `
      <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad3" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#2a231b"/>
            <stop offset="60%" stop-color="#14100c"/>
            <stop offset="100%" stop-color="#080605"/>
          </radialGradient>
          <linearGradient id="roseGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffeedb"/>
            <stop offset="35%" stop-color="#f4a261"/>
            <stop offset="70%" stop-color="#e76f51"/>
            <stop offset="100%" stop-color="#9a3e26"/>
          </linearGradient>
          <linearGradient id="emeraldCut" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#74c69d"/>
            <stop offset="30%" stop-color="#40916c"/>
            <stop offset="70%" stop-color="#1b4332"/>
            <stop offset="100%" stop-color="#081c15"/>
          </linearGradient>
          <filter id="shadow3">
            <feDropShadow dx="0" dy="26" stdDeviation="20" flood-color="#000000" flood-opacity="0.9"/>
          </filter>
          <filter id="gemGlow">
            <feGaussianBlur stdDeviation="6" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
        </defs>
        <rect width="800" height="1000" fill="url(#bgGrad3)"/>

        <!-- Velvet box / Marble ring riser -->
        <g filter="url(#shadow3)">
          <path d="M 220 580 L 400 480 L 580 580 L 400 680 Z" fill="#1b1713"/>
          <path d="M 220 580 L 400 680 L 400 740 L 220 640 Z" fill="#120f0c"/>
          <path d="M 580 580 L 400 680 L 400 740 L 580 640 Z" fill="#0d0a08"/>
        </g>

        <!-- Ring Band in 3D Perspective -->
        <g transform="translate(400, 480)" filter="url(#shadow3)">
          <!-- Lower Ring Ellipse -->
          <ellipse cx="0" cy="40" rx="95" ry="55" fill="none" stroke="url(#roseGold)" stroke-width="26"/>
          
          <!-- Diamond Pave on Shoulders -->
          ${[-60, -45, -30, 30, 45, 60].map(dx => `
            <circle cx="${dx}" cy="${35 + Math.abs(dx)*0.1}" r="4.5" fill="#ffffff" stroke="#e76f51" stroke-width="1"/>
          `).join('')}

          <!-- Center Crown Mount -->
          <polygon points="-75,-25 75,-25 55,20 -55,20" fill="url(#roseGold)" stroke="#fff" stroke-width="1"/>

          <!-- Diamond Halo encircling emerald -->
          <rect x="-85" y="-95" width="170" height="130" rx="16" fill="#e76f51" stroke="url(#roseGold)" stroke-width="3"/>
          ${Array.from({length: 16}).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const x = Math.cos(angle) * 72;
            const y = Math.sin(angle) * 54 - 30;
            return `<circle cx="${x}" cy="${y}" r="6.5" fill="#ffffff" stroke="#c9c9c9" stroke-width="1"/>`;
          }).join('')}

          <!-- Emerald Step Cut Centerpiece -->
          <g filter="url(#gemGlow)">
            <rect x="-55" y="-72" width="110" height="84" rx="8" fill="url(#emeraldCut)" stroke="#95d5b2" stroke-width="2.5"/>
            <!-- Octagonal inner facets -->
            <polygon points="-40,-58 40,-58 50,-30 40,-2 -40,-2 -50,-30" fill="#2d6a4f" opacity="0.8"/>
            <polygon points="-28,-46 28,-46 36,-30 28,-14 -28,-14 -36,-30" fill="#52b788" opacity="0.9"/>
            <!-- Table reflection highlight -->
            <polygon points="-20,-42 20,-42 24,-30 -24,-30" fill="#d8f3dc" opacity="0.6"/>
          </g>

          <!-- Prongs -->
          <circle cx="-50" cy="-68" r="5" fill="url(#roseGold)"/>
          <circle cx="50" cy="-68" r="5" fill="url(#roseGold)"/>
          <circle cx="-50" cy="8" r="5" fill="url(#roseGold)"/>
          <circle cx="50" cy="8" r="5" fill="url(#roseGold)"/>
        </g>

        <!-- Light flares -->
        <path d="M 430 410 Q 430 422 442 422 Q 430 422 430 434 Q 430 422 418 422 Q 430 422 430 410" fill="#ffffff"/>
        <path d="M 370 470 Q 370 480 380 480 Q 370 480 370 490 Q 370 480 360 480 Q 370 480 370 470" fill="#ffffff"/>

        <text x="400" y="880" text-anchor="middle" fill="#f4a261" font-family="'Playfair Display', serif" font-size="28" letter-spacing="4" font-weight="600">ROYAL SOLITAIRE RING</text>
        <text x="400" y="915" text-anchor="middle" fill="#b3876a" font-family="'Inter', sans-serif" font-size="14" letter-spacing="2">ZAMBIAN EMERALD • 18K ROSE GOLD</text>
      </svg>
    `
  },
  {
    name: 'demo-4.jpg',
    title: 'Antique Gold Bangles',
    tag: 'Handcrafted Antique Temple Kadas',
    bg: 'linear-gradient(135deg, #1c1109 0%, #291b10 50%, #0d0703 100%)',
    accent: '#ffb703',
    drawSvg: `
      <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad4" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stop-color="#331c0c"/>
            <stop offset="60%" stop-color="#170c04"/>
            <stop offset="100%" stop-color="#080401"/>
          </radialGradient>
          <linearGradient id="antiqueGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffea9f"/>
            <stop offset="25%" stop-color="#d4af37"/>
            <stop offset="60%" stop-color="#aa821b"/>
            <stop offset="85%" stop-color="#6d4f0d"/>
            <stop offset="100%" stop-color="#453106"/>
          </linearGradient>
          <filter id="shadow4">
            <feDropShadow dx="0" dy="24" stdDeviation="18" flood-color="#000000" flood-opacity="0.9"/>
          </filter>
        </defs>
        <rect width="800" height="1000" fill="url(#bgGrad4)"/>

        <!-- Display Cushion -->
        <ellipse cx="400" cy="620" rx="280" ry="140" fill="#1f0f06" filter="url(#shadow4)"/>
        <ellipse cx="400" cy="600" rx="250" ry="120" fill="#2d170b" opacity="0.8"/>

        <!-- Bangle Pair resting slightly overlapping -->
        ${[-50, 45].map((yOffset, idx) => `
          <g transform="translate(400, ${420 + yOffset}) rotate(${idx === 0 ? -12 : 14})" filter="url(#shadow4)">
            <!-- Outer bangle ring -->
            <ellipse cx="0" cy="0" rx="170" ry="110" fill="none" stroke="url(#antiqueGold)" stroke-width="40"/>
            <!-- Inner cavity -->
            <ellipse cx="0" cy="0" rx="145" ry="85" fill="#120803" opacity="0.6"/>
            
            <!-- Floral embossing studs around circumference -->
            ${Array.from({length: 18}).map((_, i) => {
              const ang = (i / 18) * Math.PI * 2;
              const bx = Math.cos(ang) * 170;
              const by = Math.sin(ang) * 110;
              return `
                <circle cx="${bx}" cy="${by}" r="7" fill="#ffea9f" stroke="#7a5811" stroke-width="1.5"/>
                <circle cx="${bx}" cy="${by}" r="3" fill="#800020"/>
              `;
            }).join('')}

            <!-- Center relief crest -->
            <rect x="-24" y="-125" width="48" height="26" rx="6" fill="#ffd166" stroke="#aa821b" stroke-width="2"/>
            <circle cx="0" cy="-112" r="6" fill="#800020"/>
          </g>
        `).join('')}

        <path d="M 450 330 Q 450 340 460 340 Q 450 340 450 350 Q 450 340 440 340 Q 450 340 450 330" fill="#ffffff"/>
        <path d="M 330 480 Q 330 490 340 490 Q 330 490 330 500 Q 330 490 320 490 Q 330 490 330 480" fill="#ffffff"/>

        <text x="400" y="880" text-anchor="middle" fill="#d4af37" font-family="'Playfair Display', serif" font-size="28" letter-spacing="4" font-weight="600">ANTIQUE KADA BANGLES</text>
        <text x="400" y="915" text-anchor="middle" fill="#9f8150" font-family="'Inter', sans-serif" font-size="14" letter-spacing="2">NAKSHI CRAFTED • 22K SOLID GOLD</text>
      </svg>
    `
  },
  {
    name: 'demo-5.jpg',
    title: 'Bridal Polki Set',
    tag: 'Heritage Rajputana Polki & Ruby Set',
    bg: 'linear-gradient(135deg, #1f0b18 0%, #301026 50%, #0d030a 100%)',
    accent: '#d4af37',
    drawSvg: `
      <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGrad5" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#3d1431"/>
            <stop offset="60%" stop-color="#1c0716"/>
            <stop offset="100%" stop-color="#0a0208"/>
          </radialGradient>
          <linearGradient id="polkiGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff6d6"/>
            <stop offset="25%" stop-color="#e2b947"/>
            <stop offset="60%" stop-color="#c19426"/>
            <stop offset="100%" stop-color="#735209"/>
          </linearGradient>
          <linearGradient id="rubyDeep" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff3366"/>
            <stop offset="45%" stop-color="#a4133c"/>
            <stop offset="100%" stop-color="#590d22"/>
          </linearGradient>
          <filter id="shadow5">
            <feDropShadow dx="0" dy="20" stdDeviation="16" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
        </defs>
        <rect width="800" height="1000" fill="url(#bgGrad5)"/>

        <!-- Maang Tikka (Forehead ornament) Top Center -->
        <g transform="translate(400, 160)" filter="url(#shadow5)">
          <line x1="0" y1="-50" x2="0" y2="40" stroke="url(#polkiGold)" stroke-width="4"/>
          ${[ -30, -10, 10, 30 ].map(ly => `<circle cx="0" cy="${ly}" r="4" fill="#ffffff"/>`).join('')}
          <circle cx="0" cy="65" r="28" fill="url(#polkiGold)"/>
          <circle cx="0" cy="65" r="18" fill="url(#rubyDeep)"/>
          <circle cx="0" cy="65" r="8" fill="#ffffff"/>
          <circle cx="0" cy="100" r="7" fill="#f0ece1"/>
        </g>

        <!-- Grand Multi-Strand Necklace -->
        <g transform="translate(400, 480)" filter="url(#shadow5)">
          <!-- 3 curved layered strands -->
          <path d="M -180 -120 Q 0 -20 180 -120" fill="none" stroke="url(#polkiGold)" stroke-width="12"/>
          <path d="M -210 -80 Q 0 40 210 -80" fill="none" stroke="url(#polkiGold)" stroke-width="14"/>
          <path d="M -240 -40 Q 0 100 240 -40" fill="none" stroke="url(#polkiGold)" stroke-width="16"/>

          <!-- Hanging chandelier tassels -->
          ${[-120, -60, 0, 60, 120].map((dx, i) => {
            const dy = Math.abs(dx) * 0.4 + 40;
            return `
              <g transform="translate(${dx}, ${dy})">
                <circle cx="0" cy="0" r="14" fill="url(#polkiGold)"/>
                <circle cx="0" cy="0" r="9" fill="url(#rubyDeep)"/>
                <line x1="0" y1="14" x2="0" y2="40" stroke="url(#polkiGold)" stroke-width="3"/>
                <circle cx="0" cy="46" r="7" fill="#f0ece1"/>
              </g>
            `;
          }).join('')}

          <!-- Giant Center Medallion -->
          <polygon points="0,60 40,100 0,140 -40,100" fill="url(#polkiGold)" stroke="#ffeaa7" stroke-width="2"/>
          <circle cx="0" cy="100" r="16" fill="url(#rubyDeep)"/>
          <circle cx="0" cy="100" r="7" fill="#ffffff"/>
          <circle cx="0" cy="155" r="9" fill="#f0ece1"/>
        </g>

        <!-- Matching Pair of Polki Studs on sides -->
        ${[-260, 260].map(ex => `
          <g transform="translate(${400 + ex}, 400)" filter="url(#shadow5)">
            <circle cx="0" cy="0" r="24" fill="url(#polkiGold)"/>
            <circle cx="0" cy="0" r="15" fill="url(#rubyDeep)"/>
            <circle cx="0" cy="0" r="6" fill="#fff"/>
            <circle cx="0" cy="32" r="6" fill="#f0ece1"/>
          </g>
        `).join('')}

        <path d="M 400 580 Q 400 590 410 590 Q 400 590 400 600 Q 400 590 390 590 Q 400 590 400 580" fill="#ffffff"/>

        <text x="400" y="880" text-anchor="middle" fill="#d4af37" font-family="'Playfair Display', serif" font-size="28" letter-spacing="4" font-weight="600">ROYAL POLKI BRIDAL SET</text>
        <text x="400" y="915" text-anchor="middle" fill="#c497b7" font-family="'Inter', sans-serif" font-size="14" letter-spacing="2">UNLUCENT POLKI • BURMESE RUBIES</text>
      </svg>
    `
  }
];

// Write SVGs and render JPEGs using Chrome headless
for (const scene of scenes) {
  const svgPath = path.join(assetsDir, scene.name.replace('.jpg', '.svg'));
  const jpgPath = path.join(assetsDir, scene.name);
  const tempHtml = path.join(assetsDir, 'temp_' + scene.name.replace('.jpg', '.html'));

  fs.writeFileSync(svgPath, scene.drawSvg.trim());

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width: 800px; height: 1000px; overflow: hidden; background: #000; }
  img { width: 800px; height: 1000px; display: block; }
</style>
</head>
<body>
  <img src="${scene.name.replace('.jpg', '.svg')}" />
</body>
</html>`;
  fs.writeFileSync(tempHtml, html);

  try {
    execSync(`"${chromePath}" --headless --disable-gpu --window-size=800,1000 --screenshot="${jpgPath}" "${tempHtml}"`, { stdio: 'pipe' });
    console.log(`Rendered: ${scene.name} (${fs.statSync(jpgPath).size} bytes)`);
  } catch (err) {
    console.error(`Failed to screenshot ${scene.name}, fallback to copy:`, err.message);
  } finally {
    if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
  }
}

console.log('Finished generating sample product photos.');
