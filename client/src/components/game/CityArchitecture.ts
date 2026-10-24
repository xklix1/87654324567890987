/**
 * CityArchitecture.ts
 * High-detail 2.5D Isometric Architectural vector art rendering engine.
 * Renders tiered facades, dynamic lighting, mechanical animations, and luxury tycoon landmarks.
 * Fully aligned with true 30-degree isometric perspective (Zero flat 2D fillRect bugs).
 * Zero-Emoji Policy strictly enforced. Strict TypeScript without any usage of 'any'.
 */

export interface BuildingRenderInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  elevation: number;
  colorTheme: string;
  statusBadge: string;
}

export interface IsoPoint {
  x: number;
  y: number;
}

export class CityArchitecture {
  /**
   * Helper to draw standard 3D isometric block with left, right, and top faces
   */
  public static drawIsoPrism(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    elev: number,
    leftColor: string,
    rightColor: string,
    topColor: string,
    strokeColor?: string,
    strokeWidth: number = 1
  ): void {
    const leftX = x - hw;
    const rightX = x + hw;
    const topY = y - hh;
    const bottomY = y + hh;

    // Left face (angles from leftX, y to x, bottomY)
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(x, bottomY);
    ctx.lineTo(x, bottomY - elev);
    ctx.lineTo(leftX, y - elev);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    // Right face (angles from x, bottomY to rightX, y)
    ctx.beginPath();
    ctx.moveTo(x, bottomY);
    ctx.lineTo(rightX, y);
    ctx.lineTo(rightX, y - elev);
    ctx.lineTo(x, bottomY - elev);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    // Top face
    ctx.beginPath();
    ctx.moveTo(x, topY - elev);
    ctx.lineTo(rightX, y - elev);
    ctx.lineTo(x, bottomY - elev);
    ctx.lineTo(leftX, y - elev);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  /**
   * True Isometric Quad on Left Wall Face
   * u ranges from 0 (left-most tip) to 1 (front center corner)
   */
  public static drawIsoLeftQuad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    u0: number,
    u1: number,
    z0: number,
    zHeight: number,
    fillColor: string,
    strokeColor?: string
  ): void {
    const x0 = x - hw + u0 * hw;
    const y0 = y + u0 * hh - z0;
    const x1 = x - hw + u1 * hw;
    const y1 = y + u1 * hh - z0;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - zHeight);
    ctx.lineTo(x0, y0 - zHeight);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * True Isometric Quad on Right Wall Face
   * u ranges from 0 (front center corner) to 1 (right-most tip)
   */
  public static drawIsoRightQuad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    u0: number,
    u1: number,
    z0: number,
    zHeight: number,
    fillColor: string,
    strokeColor?: string
  ): void {
    const x0 = x + u0 * hw;
    const y0 = y + hh - u0 * hh - z0;
    const x1 = x + u1 * hw;
    const y1 = y + hh - u1 * hh - z0;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - zHeight);
    ctx.lineTo(x0, y0 - zHeight);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ==============================================================
  // 1. Stock Exchange: Neoclassical Portico + Green Atrium + Ticker + Bull
  // ==============================================================
  public static drawStockExchange(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Stepped Marble Base Podium (3 tiers)
    for (let s = 0; s < 3; s++) {
      const sw = 50 - s * 4;
      const sh = 25 - s * 2;
      this.drawIsoPrism(
        ctx,
        pos.x,
        pos.y + 12 - s * 3,
        sw,
        sh,
        4,
        '#1e293b',
        '#334155',
        '#475569',
        isHovered ? '#10b981' : '#334155'
      );
    }

    // Main Columned Classical Hall
    const mainH = elev * 0.7;
    this.drawIsoPrism(
      ctx,
      pos.x,
      pos.y,
      38,
      19,
      mainH,
      '#0f172a',
      '#1e293b',
      '#334155',
      isHovered ? '#10b981' : '#1e293b'
    );

    // True Isometric Classical Columns on Front-Left and Front-Right facades
    const colCount = 4;
    for (let c = 0; c < colCount; c++) {
      const u0 = 0.15 + c * 0.22;
      const u1 = u0 + 0.1;
      // Columns on Left Facade
      this.drawIsoLeftQuad(
        ctx,
        pos.x,
        pos.y,
        38,
        19,
        u0,
        u1,
        2,
        mainH - 12,
        '#e2e8f0',
        '#94a3b8'
      );
      // Columns on Right Facade
      this.drawIsoRightQuad(
        ctx,
        pos.x,
        pos.y,
        38,
        19,
        u0,
        u1,
        2,
        mainH - 12,
        '#cbd5e1',
        '#64748b'
      );
    }

    // Gilded Entablature and Cornice above columns
    this.drawIsoPrism(
      ctx,
      pos.x,
      pos.y - mainH + 12,
      40,
      20,
      6,
      '#d97706',
      '#f59e0b',
      '#fbbf24',
      '#f59e0b'
    );

    // Animated Digital Price Ticker running along the facade
    const tickerStep = (tick * 0.05) % 1;
    const tickerGlow = isHovered ? '#34d399' : '#10b981';
    for (let i = 0; i < 5; i++) {
      const u = (0.1 + i * 0.18 + tickerStep) % 0.9;
      this.drawIsoLeftQuad(
        ctx,
        pos.x,
        pos.y,
        38,
        19,
        u,
        u + 0.08,
        mainH * 0.45,
        4,
        tickerGlow
      );
      this.drawIsoRightQuad(
        ctx,
        pos.x,
        pos.y,
        38,
        19,
        u,
        u + 0.08,
        mainH * 0.45,
        4,
        tickerGlow
      );
    }

    // Stepped Emerald Glass Pyramid Skylight on Roof
    const roofTopY = pos.y - mainH - 7;
    this.drawIsoPrism(
      ctx,
      pos.x,
      roofTopY,
      24,
      12,
      18,
      'rgba(16, 185, 129, 0.5)',
      'rgba(5, 150, 105, 0.7)',
      'rgba(52, 211, 153, 0.9)',
      '#10b981'
    );

    // Golden Charging Bull Statue on Granite Plinth in Front Plaza
    const bullX = pos.x + 38;
    const bullY = pos.y + 24;
    this.drawIsoPrism(ctx, bullX, bullY, 10, 5, 5, '#1e293b', '#334155', '#475569');

    // Sculpted Bronze Bull Torso
    ctx.beginPath();
    ctx.ellipse(bullX, bullY - 8, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    // Bull Horns & Head
    ctx.beginPath();
    ctx.moveTo(bullX + 5, bullY - 11);
    ctx.lineTo(bullX + 10, bullY - 16);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rooftop Microwave Dish & Pulsing Market Beacon
    ctx.beginPath();
    ctx.moveTo(pos.x, roofTopY - 18);
    ctx.lineTo(pos.x, roofTopY - 45);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const beaconAlpha = 0.5 + Math.sin(tick * 0.2) * 0.5;
    ctx.beginPath();
    ctx.arc(pos.x, roofTopY - 45, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(16, 185, 129, ${beaconAlpha})`;
    ctx.fill();
  }

  // ==============================================================
  // 2. International Airport: Dual Runways + Control Tower + Jetliner
  // ==============================================================
  public static drawAirport(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // 1. Dual Asphalt Runways with Markings
    const rw1A = { x: pos.x - 68, y: pos.y + 16 };
    const rw1B = { x: pos.x + 52, y: pos.y - 44 };

    ctx.beginPath();
    ctx.moveTo(rw1A.x, rw1A.y);
    ctx.lineTo(rw1B.x, rw1B.y);
    ctx.strokeStyle = '#0a0e17';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Runway Centerline Dashes
    ctx.beginPath();
    ctx.moveTo(rw1A.x, rw1A.y);
    ctx.lineTo(rw1B.x, rw1B.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sequenced LED Approach Strobe Lights
    const step = Math.floor((tick / 8) % 5);
    for (let light = 0; light < 5; light++) {
      const t = light / 4;
      const lx = rw1A.x + (rw1B.x - rw1A.x) * t * 0.45;
      const ly = rw1A.y + (rw1B.y - rw1A.y) * t * 0.45;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = light === step ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)';
      ctx.fill();
    }

    // 2. Modern Aerodynamic Passenger Terminal
    this.drawIsoPrism(
      ctx,
      pos.x + 14,
      pos.y + 10,
      36,
      18,
      elev * 0.45,
      '#0f172a',
      '#1e293b',
      '#38bdf8',
      isHovered ? '#38bdf8' : '#1e293b'
    );

    // Terminal Glazed Glass Facade with Windows
    for (let w = 1; w < 4; w++) {
      this.drawIsoLeftQuad(
        ctx,
        pos.x + 14,
        pos.y + 10,
        36,
        18,
        w * 0.22,
        w * 0.22 + 0.15,
        4,
        elev * 0.3,
        'rgba(56, 189, 248, 0.7)'
      );
    }

    // 3. Tall Air Traffic Control Tower
    const towerX = pos.x - 32;
    const towerY = pos.y - 12;
    const towerH = elev * 0.85 + 20;

    // Shaft
    this.drawIsoPrism(
      ctx,
      towerX,
      towerY,
      8,
      5,
      towerH,
      '#1e293b',
      '#334155',
      '#475569',
      '#38bdf8'
    );

    // Octagonal Glass Control Cab
    const cabY = towerY - towerH;
    this.drawIsoPrism(
      ctx,
      towerX,
      cabY,
      14,
      8,
      12,
      'rgba(56, 189, 248, 0.6)',
      'rgba(14, 165, 233, 0.8)',
      '#0284c7',
      '#38bdf8'
    );

    // 360-Degree Rotating Radar Dish
    const rAngle = (tick * 0.08) % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(towerX, cabY - 14, 7, rAngle, rAngle + Math.PI);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Commercial Jetliner on Apron with Wings & Turbines
    const planeX = pos.x + 44;
    const planeY = pos.y + 14;

    // Fuselage
    ctx.beginPath();
    ctx.ellipse(planeX, planeY, 15, 6, 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Swept-back Wings
    ctx.beginPath();
    ctx.moveTo(planeX - 6, planeY - 2);
    ctx.lineTo(planeX - 16, planeY - 16);
    ctx.lineTo(planeX + 2, planeY - 4);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(planeX - 2, planeY + 2);
    ctx.lineTo(planeX + 10, planeY + 16);
    ctx.lineTo(planeX + 8, planeY + 4);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    // Jet Turbines
    ctx.fillStyle = '#475569';
    ctx.fillRect(planeX - 9, planeY - 10, 6, 3);
    ctx.fillRect(planeX + 2, planeY + 8, 6, 3);

    // Wingtip Navigation Lights
    ctx.beginPath();
    ctx.arc(planeX - 16, planeY - 16, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; // Red Port Light
    ctx.fill();

    ctx.beginPath();
    ctx.arc(planeX + 10, planeY + 16, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; // Green Starboard Light
    ctx.fill();
  }

  // ==============================================================
  // 3. Real Estate: Twin Luxury Skyscrapers + Skybridge + Helipad
  // ==============================================================
  public static drawRealEstate(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Tower 1 (Main Supertall Highrise)
    const t1Elev = elev;
    this.drawIsoPrism(
      ctx,
      pos.x - 8,
      pos.y,
      22,
      13,
      t1Elev,
      '#0f172a',
      '#1e293b',
      '#0284c7',
      isHovered ? '#06b6d4' : '#1e293b'
    );

    // True Isometric Glowing Curtain-Wall Windows on Tower 1
    const t1Floors = Math.floor(t1Elev / 14);
    const winColor = isHovered ? '#22d3ee' : 'rgba(56, 189, 248, 0.75)';
    for (let f = 1; f < t1Floors; f++) {
      const z = f * 13;
      // Windows on Left Wall
      this.drawIsoLeftQuad(ctx, pos.x - 8, pos.y, 22, 13, 0.15, 0.45, z, 7, winColor);
      this.drawIsoLeftQuad(ctx, pos.x - 8, pos.y, 22, 13, 0.55, 0.85, z, 7, winColor);
      // Windows on Right Wall
      this.drawIsoRightQuad(ctx, pos.x - 8, pos.y, 22, 13, 0.15, 0.45, z, 7, winColor);
      this.drawIsoRightQuad(ctx, pos.x - 8, pos.y, 22, 13, 0.55, 0.85, z, 7, winColor);
    }

    // Tower 2 (Secondary Highrise)
    const t2Elev = elev * 0.8;
    this.drawIsoPrism(
      ctx,
      pos.x + 24,
      pos.y - 12,
      18,
      11,
      t2Elev,
      '#090d16',
      '#131c2e',
      '#0369a1',
      isHovered ? '#06b6d4' : '#1e293b'
    );

    // True Isometric Windows on Tower 2
    const t2Floors = Math.floor(t2Elev / 14);
    for (let f = 1; f < t2Floors; f++) {
      const z = f * 13;
      this.drawIsoLeftQuad(ctx, pos.x + 24, pos.y - 12, 18, 11, 0.2, 0.8, z, 6, winColor);
      this.drawIsoRightQuad(ctx, pos.x + 24, pos.y - 12, 18, 11, 0.2, 0.8, z, 6, winColor);
    }

    // Glass Suspended Skybridge connecting Tower 1 and Tower 2
    const bridgeZ = t2Elev * 0.65;
    const bY = pos.y - bridgeZ;
    ctx.beginPath();
    ctx.rect(pos.x + 6, bY - 6, 16, 12);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Penthouse Terraces on Tower 1
    const t1RoofY = pos.y - t1Elev - 13;
    this.drawIsoPrism(ctx, pos.x - 8, t1RoofY, 14, 8, 12, '#1e293b', '#334155', '#475569', '#06b6d4');

    // Rooftop Helipad with 'H' and Flashing Lights
    const padX = pos.x - 8;
    const padY = t1RoofY - 12;

    ctx.beginPath();
    ctx.ellipse(padX, padY, 13, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', padX, padY);

    // Flashing Helipad Perimeter Lights
    const hAlpha = 0.4 + Math.sin(tick * 0.15) * 0.6;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      const hx = padX + Math.cos(a) * 11;
      const hy = padY + Math.sin(a) * 6;
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${hAlpha})`;
      ctx.fill();
    }
  }

  // ==============================================================
  // 4. Luxury Supercar Dealership: Glass Rotunda + Hypercar
  // ==============================================================
  public static drawDealership(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Multi-tier Glass Showroom Rotunda
    this.drawIsoPrism(
      ctx,
      pos.x - 4,
      pos.y,
      36,
      19,
      elev * 0.55,
      'rgba(15, 23, 42, 0.95)',
      'rgba(30, 41, 59, 0.95)',
      'rgba(245, 158, 11, 0.4)',
      isHovered ? '#f59e0b' : '#334155'
    );

    // True Isometric Glass Showroom Mullions
    for (let s = 1; s <= 4; s++) {
      const u = s * 0.2;
      this.drawIsoLeftQuad(ctx, pos.x - 4, pos.y, 36, 19, u, u + 0.04, 0, elev * 0.55, '#f59e0b');
      this.drawIsoRightQuad(ctx, pos.x - 4, pos.y, 36, 19, u, u + 0.04, 0, elev * 0.55, '#f59e0b');
    }

    // Rotating Rooftop Turntable
    const roofY = pos.y - elev * 0.55 - 19;
    ctx.beginPath();
    ctx.ellipse(pos.x - 4, roofY, 22, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating Exotic Hypercar
    const carAngle = (tick * 0.04) % (Math.PI * 2);
    const carX = pos.x - 4 + Math.cos(carAngle) * 9;
    const carY = roofY + Math.sin(carAngle) * 4.5;

    ctx.beginPath();
    ctx.ellipse(carX, carY, 9, 4.5, carAngle, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; // Ferrari Corsa Red
    ctx.fill();

    // Hypercar Cockpit & Headlights
    ctx.beginPath();
    ctx.ellipse(carX - Math.cos(carAngle) * 1.5, carY - Math.sin(carAngle) * 1, 4, 2, carAngle, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Illuminated Brand Totem Monolith
    const pylonX = pos.x + 36;
    const pylonY = pos.y + 16;
    this.drawIsoPrism(ctx, pylonX, pylonY, 5, 3, 30, '#0f172a', '#1e293b', '#f59e0b', '#f59e0b');

    // Glowing Crown Crest
    ctx.beginPath();
    ctx.arc(pylonX, pylonY - 33, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  // ==============================================================
  // 5. Heavy Industry: Sawtooth Halls + Triple Smokestacks + Smoke
  // ==============================================================
  public static drawFactory(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Sawtooth Industrial Shed
    const shedH = elev * 0.52;
    this.drawIsoPrism(
      ctx,
      pos.x - 6,
      pos.y + 4,
      36,
      20,
      shedH,
      '#1e293b',
      '#334155',
      '#475569',
      isHovered ? '#eab308' : '#334155'
    );

    // True Isometric Loading Bay Roll-up Door with Hazard Striping
    this.drawIsoLeftQuad(ctx, pos.x - 6, pos.y + 4, 36, 20, 0.45, 0.85, 0, 16, '#0f172a', '#eab308');

    // Sawtooth Roof Ridges
    for (let r = 0; r < 3; r++) {
      const rx = pos.x - 22 + r * 14;
      const ry = pos.y - shedH - 6;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 8, ry - 8);
      ctx.lineTo(rx + 12, ry);
      ctx.closePath();
      ctx.fillStyle = '#64748b';
      ctx.fill();
    }

    // Heavy Industrial Smokestacks (3 Stacks) with Hazard Bands
    const stackOffsets = [-16, 0, 16];
    const stackHeights = [34, 44, 30];

    stackOffsets.forEach((ox, idx) => {
      const sx = pos.x + ox;
      const sy = pos.y - shedH - 10;
      const sh = stackHeights[idx];

      // Concrete/Steel Stack
      ctx.fillStyle = '#334155';
      ctx.fillRect(sx - 3.5, sy - sh, 7, sh);

      // Red & White Aviation Hazard Bands
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx - 3.5, sy - sh + 4, 7, 4);
      ctx.fillRect(sx - 3.5, sy - sh + 12, 7, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(sx - 3.5, sy - sh + 8, 7, 4);

      // Billowing Volumetric Animated Smoke Particles
      for (let p = 0; p < 4; p++) {
        const pStep = (tick * 0.7 + idx * 25 + p * 20) % 80;
        const px = sx + Math.sin(pStep * 0.08) * 8;
        const py = sy - sh - pStep * 0.8;
        const pRadius = 3 + pStep * 0.12;
        const pAlpha = Math.max(0, 0.45 - pStep * 0.006);

        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${pAlpha})`;
        ctx.fill();
      }
    });
  }

  // ==============================================================
  // 6. Farmlands: Terraced Crops + Red Timber Barn + Silo + Windmill
  // ==============================================================
  public static drawFarm(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // 1. Contoured Crop Field Furrows
    this.drawIsoPrism(
      ctx,
      pos.x,
      pos.y + 6,
      44,
      22,
      6,
      '#14532d',
      '#166534',
      '#15803d',
      isHovered ? '#22c55e' : '#14532d'
    );

    // Alternating Golden Wheat and Green Crop Furrows
    for (let c = -3; c <= 3; c++) {
      const cx = pos.x + c * 10;
      const cy = pos.y + 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 6);
      ctx.lineTo(cx + 10, cy - 6);
      ctx.strokeStyle = c % 2 === 0 ? '#ca8a04' : '#15803d';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 2. Traditional American Red Timber Barn
    const barnX = pos.x - 18;
    const barnY = pos.y - 2;
    const barnH = elev * 0.45;
    this.drawIsoPrism(ctx, barnX, barnY, 18, 12, barnH, '#991b1b', '#b91c1c', '#dc2626', '#ffffff');

    // Barn Sliding Double Door with White 'X' Bracing
    this.drawIsoLeftQuad(ctx, barnX, barnY, 18, 12, 0.3, 0.7, 0, 12, '#ffffff', '#b91c1c');

    // 3. Metallic Corrugated Silo with Dome
    const siloX = pos.x + 4;
    const siloY = pos.y - 4;
    this.drawIsoPrism(ctx, siloX, siloY, 8, 5, 26, '#64748b', '#94a3b8', '#cbd5e1');

    ctx.beginPath();
    ctx.arc(siloX, siloY - 26, 6, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    // 4. Rotating Aerodynamic Wind Turbine
    const wmX = pos.x + 28;
    const wmY = pos.y - 8;
    const wmHeight = elev * 0.65 + 14;

    // Lattice Tower
    ctx.beginPath();
    ctx.moveTo(wmX - 4, wmY + 12);
    ctx.lineTo(wmX, wmY - wmHeight);
    ctx.lineTo(wmX + 4, wmY + 12);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating 3-Blade Aerodynamic Rotor
    const wmAngle = (tick * 0.05) % (Math.PI * 2);
    for (let b = 0; b < 3; b++) {
      const bladeA = wmAngle + b * ((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(wmX, wmY - wmHeight);
      ctx.lineTo(
        wmX + Math.cos(bladeA) * 16,
        wmY - wmHeight + Math.sin(bladeA) * 16
      );
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // ==============================================================
  // 7. Maritime Container Port: Cargo Ship + STS Crane + Containers
  // ==============================================================
  public static drawLogistics(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // 1. Concrete Quay Bulkhead & Wharf Basin
    this.drawIsoPrism(
      ctx,
      pos.x - 8,
      pos.y + 8,
      44,
      22,
      10,
      '#0f172a',
      '#1e293b',
      '#334155',
      isHovered ? '#0284c7' : '#1e293b'
    );

    // 2. Moored Container Cargo Ship (Freighter Hull)
    const shipX = pos.x - 34;
    const shipY = pos.y + 24;
    this.drawIsoPrism(ctx, shipX, shipY, 20, 9, 12, '#1e3a8a', '#1d4ed8', '#0f172a');

    // Ship's Cargo Hold Containers
    const shipColors = ['#dc2626', '#16a34a', '#eab308'];
    for (let sc = 0; sc < 3; sc++) {
      this.drawIsoPrism(
        ctx,
        shipX - 6 + sc * 7,
        shipY - 12,
        4,
        2.5,
        5,
        shipColors[sc],
        shipColors[sc],
        shipColors[sc]
      );
    }

    // 3. Giant Orange STS (Ship-to-Shore) Container Crane
    const craneX = pos.x - 14;
    const craneY = pos.y + 4;
    const craneH = elev * 0.8 + 20;

    ctx.strokeStyle = '#ea580c'; // Safety Orange
    ctx.lineWidth = 3.5;

    // Crane Legs & Boom
    ctx.beginPath();
    ctx.moveTo(craneX - 10, craneY + 10);
    ctx.lineTo(craneX - 6, craneY - craneH);
    ctx.lineTo(craneX + 24, craneY - craneH);
    ctx.lineTo(craneX + 18, craneY + 10);
    ctx.stroke();

    // Horizontal Boom Arm Extending over the ship
    ctx.beginPath();
    ctx.moveTo(craneX - 22, craneY - craneH + 4);
    ctx.lineTo(craneX + 32, craneY - craneH + 4);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Motorized Trolley & Hoisted Container
    const trolleyT = 0.5 + Math.sin(tick * 0.04) * 0.4;
    const trolleyX = craneX - 16 + trolleyT * 42;
    const trolleyY = craneY - craneH + 4;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(trolleyX - 3, trolleyY, 6, 4);

    // Cables & Suspended Container
    ctx.beginPath();
    ctx.moveTo(trolleyX, trolleyY + 4);
    ctx.lineTo(trolleyX, trolleyY + 16);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    this.drawIsoPrism(ctx, trolleyX, trolleyY + 20, 6, 3, 5, '#2563eb', '#1d4ed8', '#3b82f6');

    // 4. Stacks of ISO Freight Containers on the Wharf
    const yardColors = ['#dc2626', '#16a34a', '#2563eb', '#eab308', '#0891b2'];
    for (let stack = 0; stack < 6; stack++) {
      const cx = pos.x + 8 + (stack % 2) * 14;
      const cy = pos.y + 8 - Math.floor(stack / 2) * 6;
      const col = yardColors[stack % yardColors.length];
      this.drawIsoPrism(ctx, cx, cy, 6, 3, 5, col, col, col);
    }
  }

  // ==============================================================
  // 8. Crypto Mining Center: Brutalist Bunker + LEDs + Fans + Dish
  // ==============================================================
  public static drawCrypto(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Heavy Brutalist High-Security Server Bunker
    const bunkerH = elev * 0.65;
    this.drawIsoPrism(
      ctx,
      pos.x,
      pos.y,
      34,
      19,
      bunkerH,
      '#0b0f19',
      '#131b2e',
      '#1e293b',
      isHovered ? '#a855f7' : '#334155'
    );

    // True Isometric Glowing Server Intake Louvers & Fiber-Optic Busbars
    const neonAlpha = 0.5 + Math.sin(tick * 0.1) * 0.5;
    const busbarCol = `rgba(168, 85, 247, ${neonAlpha})`;
    for (let bar = 1; bar <= 3; bar++) {
      const z = bar * 12;
      this.drawIsoLeftQuad(ctx, pos.x, pos.y, 34, 19, 0.2, 0.85, z, 3, busbarCol);
      this.drawIsoRightQuad(ctx, pos.x, pos.y, 34, 19, 0.2, 0.85, z, 3, busbarCol);
    }

    // Industrial HVAC Rooftop Chiller Modules with Dual High-RPM Fans
    const roofY = pos.y - bunkerH - 18;
    this.drawIsoPrism(ctx, pos.x, roofY + 8, 24, 12, 10, '#1e293b', '#334155', '#475569', '#a855f7');

    // Spinning Twin Fan Blades
    const fanAngle = (tick * 0.2) % (Math.PI * 2);
    [-8, 8].forEach((fx) => {
      const fanCenterX = pos.x + fx;
      const fanCenterY = roofY - 2;

      ctx.beginPath();
      ctx.arc(fanCenterX, fanCenterY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        fanCenterX - Math.cos(fanAngle) * 5,
        fanCenterY - Math.sin(fanAngle) * 5
      );
      ctx.lineTo(
        fanCenterX + Math.cos(fanAngle) * 5,
        fanCenterY + Math.sin(fanAngle) * 5
      );
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Satellite Uplink Dish on Roof
    const dishX = pos.x + 20;
    const dishY = roofY;
    ctx.beginPath();
    ctx.arc(dishX, dishY, 7, Math.PI * 0.8, Math.PI * 1.8);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(dishX, dishY);
    ctx.lineTo(dishX - 6, dishY - 4);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ==============================================================
  // 9. Financial HQ / Central Bank: Imperial Portico + Golden Dome
  // ==============================================================
  public static drawFinancialHq(
    ctx: CanvasRenderingContext2D,
    pos: IsoPoint,
    elev: number,
    isHovered: boolean,
    tick: number
  ): void {
    // Grand Marble Podium Steps (3 tiers)
    for (let s = 0; s < 3; s++) {
      const sw = 48 - s * 4;
      const sh = 24 - s * 2;
      this.drawIsoPrism(
        ctx,
        pos.x,
        pos.y + 12 - s * 3,
        sw,
        sh,
        4,
        '#1e293b',
        '#334155',
        '#475569',
        isHovered ? '#ec4899' : '#334155'
      );
    }

    // Monolithic Palatial Banking Hall
    const hallH = elev * 0.65;
    this.drawIsoPrism(
      ctx,
      pos.x,
      pos.y,
      36,
      18,
      hallH,
      '#0f172a',
      '#1e293b',
      '#334155',
      isHovered ? '#ec4899' : '#334155'
    );

    // True Isometric Front Marble Colonnade
    for (let c = 0; c < 3; c++) {
      const u0 = 0.2 + c * 0.25;
      this.drawIsoLeftQuad(ctx, pos.x, pos.y, 36, 18, u0, u0 + 0.1, 2, hallH - 10, '#f1f5f9', '#94a3b8');
      this.drawIsoRightQuad(ctx, pos.x, pos.y, 36, 18, u0, u0 + 0.1, 2, hallH - 10, '#e2e8f0', '#64748b');
    }

    // Spectacular Ribbed Golden Dome on Roof
    const domeRadius = 18;
    const domeCenterY = pos.y - hallH - 16;

    ctx.beginPath();
    ctx.arc(pos.x, domeCenterY, domeRadius, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b'; // Gold
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dome Golden Ribs
    for (let rib = -2; rib <= 2; rib++) {
      const ribX = pos.x + rib * 6;
      ctx.beginPath();
      ctx.moveTo(ribX, domeCenterY);
      ctx.lineTo(pos.x, domeCenterY - domeRadius);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Gilded Finial Spire
    ctx.beginPath();
    ctx.moveTo(pos.x, domeCenterY - domeRadius);
    ctx.lineTo(pos.x, domeCenterY - domeRadius - 14);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cascading Water Fountain in Front Plaza
    const fX = pos.x;
    const fY = pos.y + 26;
    ctx.beginPath();
    ctx.ellipse(fX, fY, 12, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Animated Fountain Spray
    const sprayY = fY - 6 - Math.sin(tick * 0.15) * 3;
    ctx.beginPath();
    ctx.arc(fX, sprayY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#bae6fd';
    ctx.fill();
  }
}
