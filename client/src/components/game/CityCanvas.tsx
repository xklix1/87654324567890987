import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { GameAudio } from '../../utils/audio';
import { CityArchitecture } from './CityArchitecture';
import { ZoomIn, ZoomOut, Compass } from 'lucide-react';

export type SectorBuildingId =
  | 'stocks'
  | 'real_estate'
  | 'dealership'
  | 'airport'
  | 'factory'
  | 'farm'
  | 'logistics'
  | 'crypto'
  | 'jobs';

export interface BuildingData {
  id: SectorBuildingId;
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

interface CityCanvasProps {
  onSelectSector: (sectorId: SectorBuildingId) => void;
  hourlyYield?: number;
}

export const CityCanvas: React.FC<CityCanvasProps> = ({ onSelectSector }) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera Pan and Zoom State
  const [zoom, setZoom] = useState<number>(0.88);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragDist, setDragDist] = useState<number>(0);
  const [hoveredBuilding, setHoveredBuilding] = useState<SectorBuildingId | null>(null);

  // Isometric Config
  const tileW = 120;
  const tileH = 60;

  // 9 Well-Defined District Plots in a Harmonious 3x3 City Grid
  // Columns: gx = -2.2 (West), gx = 0 (Central), gx = 2.2 (East)
  // Rows:    gy = -2.2 (North), gy = 0 (Center),  gy = 2.2 (South)
  // Roads run strictly at gx = -3.3, -1.1, 1.1, 3.3 and gy = -3.3, -1.1, 1.1, 3.3
  const buildings: BuildingData[] = [
    {
      id: 'airport',
      nameAr: 'المطار الدولي والأسطول',
      nameEn: 'International Airport',
      gridX: -2.2,
      gridY: -2.2,
      width: 1.8,
      height: 1.8,
      elevation: 75,
      colorTheme: '#38bdf8',
      statusBadge: 'مدارج نشطة',
    },
    {
      id: 'stocks',
      nameAr: 'بورصة الأوراق المالية',
      nameEn: 'Stock Exchange Tower',
      gridX: 0,
      gridY: -2.2,
      width: 1.8,
      height: 1.8,
      elevation: 120,
      colorTheme: '#10b981',
      statusBadge: 'تداول فوري نشط',
    },
    {
      id: 'crypto',
      nameAr: 'مركز تعدين البلوكشين',
      nameEn: 'Crypto Mining Farm',
      gridX: 2.2,
      gridY: -2.2,
      width: 1.8,
      height: 1.8,
      elevation: 85,
      colorTheme: '#a855f7',
      statusBadge: 'تعدين رقمي مكثف',
    },
    {
      id: 'dealership',
      nameAr: 'معرض السيارات الفاخرة',
      nameEn: 'Supercar Dealership',
      gridX: -2.2,
      gridY: 0,
      width: 1.8,
      height: 1.8,
      elevation: 80,
      colorTheme: '#f59e0b',
      statusBadge: 'صالة عرض مفتوحة',
    },
    {
      id: 'jobs',
      nameAr: 'برج المقر المالي والوظائف',
      nameEn: 'Financial Headquarters',
      gridX: 0,
      gridY: 0,
      width: 1.8,
      height: 1.8,
      elevation: 105,
      colorTheme: '#ec4899',
      statusBadge: 'المقر المالي والمهن',
    },
    {
      id: 'real_estate',
      nameAr: 'أبراج الاستثمار العقاري',
      nameEn: 'Real Estate District',
      gridX: 2.2,
      gridY: 0,
      width: 1.8,
      height: 1.8,
      elevation: 135,
      colorTheme: '#06b6d4',
      statusBadge: 'إشغال وتأجير نشط',
    },
    {
      id: 'logistics',
      nameAr: 'ميناء الحاويات البحري',
      nameEn: 'Maritime Container Port',
      gridX: -2.2,
      gridY: 2.2,
      width: 1.8,
      height: 1.8,
      elevation: 75,
      colorTheme: '#0284c7',
      statusBadge: 'أرصفة شحن بحري',
    },
    {
      id: 'factory',
      nameAr: 'المجمع الصناعي والإنتاج',
      nameEn: 'Heavy Industrial Plant',
      gridX: 0,
      gridY: 2.2,
      width: 1.8,
      height: 1.8,
      elevation: 90,
      colorTheme: '#eab308',
      statusBadge: 'خطوط إنتاج نشطة',
    },
    {
      id: 'farm',
      nameAr: 'المزارع والمحاصيل النقدية',
      nameEn: 'Agricultural Farmlands',
      gridX: 2.2,
      gridY: 2.2,
      width: 1.8,
      height: 1.8,
      elevation: 60,
      colorTheme: '#22c55e',
      statusBadge: 'محاصيل جاهزة للحصاد',
    },
  ];

  const isoToScreen = useCallback(
    (gx: number, gy: number): { x: number; y: number } => {
      const x = (gx - gy) * (tileW / 2);
      const y = (gx + gy) * (tileH / 2);
      return { x, y };
    },
    [tileW, tileH]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Sleek Atmospheric Dark Backdrop
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        60,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#070b14');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Camera Offset and Zoom
      const centerX = width / 2 + offset.x;
      const centerY = height / 2 - 12 + offset.y;

      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);

      // 2. Metropolitan City Island Base Slab
      const islandRadius = 5.2;
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const gx = Math.cos(angle) * islandRadius;
        const gy = Math.sin(angle) * islandRadius;
        const p = isoToScreen(gx, gy);
        if (angle === 0) ctx.moveTo(p.x, p.y + 36);
        else ctx.lineTo(p.x, p.y + 36);
      }
      ctx.closePath();
      ctx.fillStyle = '#030712';
      ctx.fill();

      // Island Upper Plate
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const gx = Math.cos(angle) * islandRadius;
        const gy = Math.sin(angle) * islandRadius;
        const p = isoToScreen(gx, gy);
        if (angle === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = '#090e17';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Deep Water Harbor Bay near Maritime Port (South-West)
      const w1 = isoToScreen(-4.2, 1.0);
      const w2 = isoToScreen(-1.0, 4.2);
      const w3 = isoToScreen(-4.5, 4.5);
      ctx.beginPath();
      ctx.moveTo(w1.x, w1.y);
      ctx.lineTo(w2.x, w2.y);
      ctx.lineTo(w3.x, w3.y);
      ctx.closePath();
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      // Animated Water Wake & Ripples
      const waveOffset = Math.sin(tick * 0.04) * 3;
      ctx.beginPath();
      ctx.moveTo(w1.x + waveOffset, w1.y + 3);
      ctx.lineTo(w2.x + waveOffset, w2.y + 3);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Planned Urban Road Network (Framing the 3x3 District Plots)
      const roadCoords = [-3.3, -1.1, 1.1, 3.3];
      const roadHalfWidth = 14;

      const drawRoadSegment = (x1: number, y1: number, x2: number, y2: number) => {
        const p1 = isoToScreen(x1, y1);
        const p2 = isoToScreen(x2, y2);

        // Asphalt Base
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = roadHalfWidth * 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Concrete Curbs
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = roadHalfWidth * 2 + 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = roadHalfWidth * 2;
        ctx.stroke();

        // Dashed Lane Centerline
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Draw Avenues (along X)
      roadCoords.forEach((rx) => {
        drawRoadSegment(rx, -3.3, rx, 3.3);
      });

      // Draw Streets (along Y)
      roadCoords.forEach((ry) => {
        drawRoadSegment(-3.3, ry, 3.3, ry);
      });

      // Zebra Crosswalks at Key Intersections
      const intersections = [
        { x: -1.1, y: -1.1 },
        { x: 1.1, y: -1.1 },
        { x: -1.1, y: 1.1 },
        { x: 1.1, y: 1.1 },
      ];
      intersections.forEach((inter) => {
        const ip = isoToScreen(inter.x, inter.y);
        ctx.fillStyle = '#f8fafc';
        for (let s = -2; s <= 2; s++) {
          ctx.fillRect(ip.x + s * 4 - 1, ip.y - 6, 2, 12);
        }
      });

      // Moving Traffic on Boulevards
      const t1 = (tick % 360) / 360;
      const t2 = ((tick + 180) % 360) / 360;
      const t3 = ((tick + 90) % 360) / 360;
      const t4 = ((tick + 270) % 360) / 360;

      // Car 1 (Yellow Supercar on Avenue 1)
      const car1Pos = isoToScreen(-1.1, -3.3 + t1 * 6.6);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(car1Pos.x, car1Pos.y, 5, 2.5, 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Car 2 (Cyan Electric Cab on Avenue 2)
      const car2Pos = isoToScreen(1.1, 3.3 - t2 * 6.6);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(car2Pos.x, car2Pos.y, 5, 2.5, 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Car 3 (Emerald Sedan on Street 1)
      const car3Pos = isoToScreen(-3.3 + t3 * 6.6, -1.1);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(car3Pos.x, car3Pos.y, 5, 2.5, -0.45, 0, Math.PI * 2);
      ctx.fill();

      // Car 4 (Red Delivery Van on Street 2)
      const car4Pos = isoToScreen(3.3 - t4 * 6.6, 1.1);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(car4Pos.x, car4Pos.y, 6, 3, -0.45, 0, Math.PI * 2);
      ctx.fill();

      // 4. Draw Individual Zoned Land Plots for each of the 9 Districts
      buildings.forEach((b) => {
        const isHovered = hoveredBuilding === b.id;
        const pTL = isoToScreen(b.gridX - 0.85, b.gridY - 0.85);
        const pTR = isoToScreen(b.gridX + 0.85, b.gridY - 0.85);
        const pBR = isoToScreen(b.gridX + 0.85, b.gridY + 0.85);
        const pBL = isoToScreen(b.gridX - 0.85, b.gridY + 0.85);

        // Plot Base Bevel Edge
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBR.x, pBR.y + 4);
        ctx.lineTo(pBL.x, pBL.y + 4);
        ctx.closePath();
        ctx.fillStyle = '#0b0f19';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pBR.x, pBR.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pTR.x, pTR.y + 4);
        ctx.lineTo(pBR.x, pBR.y + 4);
        ctx.closePath();
        ctx.fillStyle = '#111827';
        ctx.fill();

        // Plot Surface Face
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();

        // Themed Plot Ground Textures
        if (b.id === 'farm') {
          ctx.fillStyle = '#14532d'; // Rich green pasture
        } else if (b.id === 'logistics') {
          ctx.fillStyle = '#1e293b'; // Maritime wharf concrete
        } else if (b.id === 'dealership') {
          ctx.fillStyle = '#0f172a'; // Showroom black asphalt lot
        } else if (b.id === 'airport') {
          ctx.fillStyle = '#131c2e'; // Airport apron tarmac
        } else if (b.id === 'factory') {
          ctx.fillStyle = '#181e2b'; // Industrial concrete slab
        } else if (b.id === 'crypto') {
          ctx.fillStyle = '#0b0f19'; // High-tech datacenter floor
        } else {
          ctx.fillStyle = '#172033'; // Polished downtown plaza
        }
        ctx.fill();

        // Plot Boundary Curb Highlight
        ctx.strokeStyle = isHovered ? b.colorTheme : '#2d3748';
        ctx.lineWidth = isHovered ? 2.5 : 1;
        ctx.stroke();

        // Plaza Pavement Grid Lines for Downtown Districts
        if (['stocks', 'jobs', 'real_estate'].includes(b.id)) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          for (let step = -0.5; step <= 0.5; step += 0.5) {
            const pA = isoToScreen(b.gridX + step, b.gridY - 0.85);
            const pB = isoToScreen(b.gridX + step, b.gridY + 0.85);
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
          }
        }
      });

      // 5. Sort and Render Detailed Architectural Landmark Models
      // Sorted back-to-front by isometric depth (gridX + gridY)
      const sorted = [...buildings].sort((a, b) => a.gridX + a.gridY - (b.gridX + b.gridY));

      sorted.forEach((b) => {
        const pos = isoToScreen(b.gridX, b.gridY);
        const isHovered = hoveredBuilding === b.id;
        const elev = isHovered ? b.elevation + 8 : b.elevation;

        // Ground Ambient Occlusion Shadow Under the Building
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 4, 34, 17, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        // Render Pure Architectural Artwork (NO generic monolithic box behind it!)
        switch (b.id) {
          case 'stocks':
            CityArchitecture.drawStockExchange(ctx, pos, elev, isHovered, tick);
            break;
          case 'airport':
            CityArchitecture.drawAirport(ctx, pos, elev, isHovered, tick);
            break;
          case 'real_estate':
            CityArchitecture.drawRealEstate(ctx, pos, elev, isHovered, tick);
            break;
          case 'dealership':
            CityArchitecture.drawDealership(ctx, pos, elev, isHovered, tick);
            break;
          case 'factory':
            CityArchitecture.drawFactory(ctx, pos, elev, isHovered, tick);
            break;
          case 'farm':
            CityArchitecture.drawFarm(ctx, pos, elev, isHovered, tick);
            break;
          case 'logistics':
            CityArchitecture.drawLogistics(ctx, pos, elev, isHovered, tick);
            break;
          case 'crypto':
            CityArchitecture.drawCrypto(ctx, pos, elev, isHovered, tick);
            break;
          case 'jobs':
            CityArchitecture.drawFinancialHq(ctx, pos, elev, isHovered, tick);
            break;
        }

        // ==========================================
        // FLOATING INTERACTIVE SECTOR BADGE PIN
        // ==========================================
        const badgeY = pos.y - elev - 18;
        const title = language === 'ar' ? b.nameAr : b.nameEn;

        ctx.font = 'bold 11px Cairo, sans-serif';
        const textWidth = ctx.measureText(title).width;
        const pillW = Math.max(textWidth + 28, 96);
        const pillH = 24;

        // Floating connector line from peak to badge
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - elev);
        ctx.lineTo(pos.x, badgeY + pillH / 2);
        ctx.strokeStyle = isHovered ? b.colorTheme : 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Glassmorphic Badge Pill
        ctx.fillStyle = isHovered ? 'rgba(15, 23, 42, 0.98)' : 'rgba(7, 11, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(pos.x - pillW / 2, badgeY - pillH / 2, pillW, pillH, 8);
        ctx.fill();
        ctx.strokeStyle = isHovered ? b.colorTheme : 'rgba(71, 85, 105, 0.6)';
        ctx.lineWidth = isHovered ? 2.5 : 1;
        ctx.stroke();

        // Pulsing Indicator Dot
        ctx.beginPath();
        ctx.arc(pos.x - pillW / 2 + 12, badgeY, 4, 0, Math.PI * 2);
        ctx.fillStyle = b.colorTheme;
        ctx.fill();

        ctx.fillStyle = isHovered ? '#ffffff' : '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, pos.x + 6, badgeY);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [offset, zoom, hoveredBuilding, language, isoToScreen]);

  const getBuildingAt = useCallback(
    (clientX: number, clientY: number): SectorBuildingId | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const centerX = width / 2 + offset.x;
      const centerY = height / 2 - 12 + offset.y;

      const localX = (mouseX - centerX) / zoom;
      const localY = (mouseY - centerY) / zoom;

      // Check buildings in reverse order (front-to-back in isometric space)
      for (let i = buildings.length - 1; i >= 0; i--) {
        const b = buildings[i];
        const p = isoToScreen(b.gridX, b.gridY);
        const elev = b.elevation;
        const hw = (b.width * tileW) / 2 + 24;
        const hh = (b.height * tileH) / 2 + 24;

        if (
          localX >= p.x - hw &&
          localX <= p.x + hw &&
          localY >= p.y - hh - elev - 35 &&
          localY <= p.y + hh + 15
        ) {
          return b.id;
        }
      }
      return null;
    },
    [offset, zoom, isoToScreen, tileW, tileH]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    setDragDist(0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setOffset({ x: newX, y: newY });
      setDragDist((prev) => prev + 1);
      return;
    }

    const found = getBuildingAt(e.clientX, e.clientY);
    setHoveredBuilding(found);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const focusAndSelectBuilding = useCallback(
    (targetId: SectorBuildingId) => {
      GameAudio.playTapSound();
      const b = buildings.find((item) => item.id === targetId);
      if (b) {
        const p = isoToScreen(b.gridX, b.gridY);
        setOffset({ x: -p.x * 0.45, y: -p.y * 0.45 + 30 });
        setZoom(1.2);
      }
      onSelectSector(targetId);
    },
    [buildings, isoToScreen, onSelectSector]
  );

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragDist > 10) return;
    const target = getBuildingAt(e.clientX, e.clientY) || hoveredBuilding;
    if (target) {
      focusAndSelectBuilding(target);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
      setDragDist(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches.length === 1) {
      const t = e.touches[0];
      setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
      setDragDist((prev) => prev + 1);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (dragDist <= 8 && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const target = getBuildingAt(touch.clientX, touch.clientY);
      if (target) {
        focusAndSelectBuilding(target);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(2.0, Math.max(0.65, prev + delta)));
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] min-h-[500px] overflow-hidden select-none bg-dark-950">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Canvas Camera Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            GameAudio.playTapSound();
            setZoom((z) => Math.min(2.0, z + 0.2));
          }}
          className="w-10 h-10 rounded-xl glass-panel bg-dark-900/90 text-slate-200 border border-dark-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            GameAudio.playTapSound();
            setZoom((z) => Math.max(0.65, z - 0.2));
          }}
          className="w-10 h-10 rounded-xl glass-panel bg-dark-900/90 text-slate-200 border border-dark-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            GameAudio.playTapSound();
            setOffset({ x: 0, y: 0 });
            setZoom(0.95);
          }}
          className="w-10 h-10 rounded-xl glass-panel bg-dark-900/90 text-slate-200 border border-dark-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Reset Camera"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Landmark Quick Strip (Direct tactile access to all 9 sectors on mobile/desktop) */}
      <div className="absolute bottom-20 left-0 right-0 z-20 px-2 pointer-events-auto flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5 px-3 bg-dark-950/90 backdrop-blur-md rounded-2xl border border-dark-800/90 shadow-2xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold shrink-0 hidden sm:inline-block">
            {language === 'ar' ? 'المعالم:' : 'LANDMARKS:'}
          </span>
          {buildings.map((b) => (
            <button
              key={b.id}
              onClick={() => focusAndSelectBuilding(b.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/90 hover:bg-dark-800 text-slate-200 border border-dark-700/80 hover:border-slate-500 whitespace-nowrap text-xs font-bold transition-all shrink-0 active:scale-95 shadow-md"
              style={{ borderLeftColor: b.colorTheme, borderLeftWidth: '3px' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.colorTheme }} />
              <span className="font-cairo">{language === 'ar' ? b.nameAr : b.nameEn}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
