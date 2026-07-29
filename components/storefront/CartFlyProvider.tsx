'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Image from 'next/image';

interface FlyItem {
  id: number;
  startX: number;
  startY: number;
  image: string;
}

interface CartFlyContextValue {
  flyToCart: (e: React.MouseEvent, image: string) => void;
}

const CartFlyContext = createContext<CartFlyContextValue>({
  flyToCart: () => {},
});

export function useCartFly() {
  return useContext(CartFlyContext);
}

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FlyItem[]>([]);
  const idRef = useRef(0);
  const cartRef = useRef<HTMLDivElement>(null);

  const flyToCart = useCallback((e: React.MouseEvent, image: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const id = ++idRef.current;

    setItems(prev => [...prev, { id, startX, startY, image }]);

    setTimeout(() => {
      setItems(prev => prev.filter(f => f.id !== id));
    }, 1100);
  }, []);

  return (
    <CartFlyContext.Provider value={{ flyToCart }}>
      {children}
      <div ref={cartRef} />
      {items.map(item => {
        const endX = typeof window !== 'undefined' ? window.innerWidth - 24 : 0;
        const endY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

        return (
          <div
            key={item.id}
            className="pointer-events-none fixed z-[100]"
            style={{
              left: item.startX,
              top: item.startY,
              transform: 'translate(-50%, -50%)',
              animation: `cartFly 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              ['--fly-x' as string]: `${endX - item.startX}px`,
              ['--fly-y' as string]: `${endY - item.startY}px`,
            }}
          >
            <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-brand-500 bg-white shadow-2xl">
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                  <span className="text-lg font-bold text-gray-300">{item.name[0]}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes cartFly {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          40% {
            opacity: 1;
            transform: translate(
              calc(-50% + var(--fly-x) * 0.4),
              calc(-50% + var(--fly-y) * 0.4 - 60px)
            ) scale(0.9);
          }
          100% {
            opacity: 0.3;
            transform: translate(
              calc(-50% + var(--fly-x)),
              calc(-50% + var(--fly-y))
            ) scale(0.4);
          }
        }
      `}</style>
    </CartFlyContext.Provider>
  );
}
