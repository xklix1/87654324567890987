import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameAudio } from '../utils/audio';

export interface FloatingTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  isPositive: boolean;
}

interface FloatingVfxContextType {
  spawnMoneyFloat: (amount: number, x?: number, y?: number) => void;
  spawnTextFloat: (text: string, isPositive?: boolean, x?: number, y?: number) => void;
}

const FloatingVfxContext = createContext<FloatingVfxContextType | undefined>(undefined);

export const FloatingVfxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<FloatingTextItem[]>([]);

  const spawnTextFloat = useCallback(
    (text: string, isPositive: boolean = true, x?: number, y?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      // Default to center if coordinates not provided
      const posX = x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);
      const posY = y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 200);

      const newItem: FloatingTextItem = { id, text, x: posX, y: posY, isPositive };
      setItems((prev) => [...prev.slice(-10), newItem]);

      if (isPositive) {
        GameAudio.playCoinSound();
      } else {
        GameAudio.playSpendSound();
      }

      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 1500);
    },
    []
  );

  const spawnMoneyFloat = useCallback(
    (amount: number, x?: number, y?: number) => {
      const isPositive = amount >= 0;
      const formatted = `${isPositive ? '+' : '-'}$${Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      spawnTextFloat(formatted, isPositive, x, y);
    },
    [spawnTextFloat]
  );

  return (
    <FloatingVfxContext.Provider value={{ spawnMoneyFloat, spawnTextFloat }}>
      {children}
      {/* Floating Animated Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
            }}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 font-black font-mono text-base md:text-xl drop-shadow-lg animate-float-fade ${
              item.isPositive ? 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.8)]' : 'text-red-400 drop-shadow-[0_2px_10px_rgba(239,68,68,0.8)]'
            }`}
          >
            {item.text}
          </div>
        ))}
      </div>
    </FloatingVfxContext.Provider>
  );
};

export const useFloatingVfx = (): FloatingVfxContextType => {
  const context = useContext(FloatingVfxContext);
  if (!context) {
    throw new Error('useFloatingVfx must be used within FloatingVfxProvider');
  }
  return context;
};
