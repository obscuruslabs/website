'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';

export default function Hero() {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clientX =
      'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    if (clientX === undefined) return;
    const percent = ((clientX - left) / width) * 100;
    setPosition(Math.max(0, Math.min(100, percent)));
  };

  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center">
      {/* Background Slider Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 cursor-ew-resize select-none"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
      >
        {/* Underlay (Power Off) */}
        <div className="absolute inset-0">
          <Image
            src="/visor-off.jpg"
            alt="VISO .01 Ghost — powered off"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Overlay (Power On) */}
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{ width: `${position}%`, borderRight: '2px solid white' }}
        >
          <div className="relative w-screen h-full">
            <Image
              src="/visor-on.png"
              alt="VISO .01 Ghost — IR LEDs active, camera bloom"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-20 container mx-auto px-6 pointer-events-none">
        <div className="max-w-xl flex flex-col gap-6">
          <h1 className="text-6xl font-bold tracking-tighter leading-tight">
            take back<br />
            your face.
          </h1>
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-branding lowercase">
              viso <span className="text-neutral-500">.01 &apos;ghost&apos;</span>
            </h2>
            <p className="text-neutral-400 text-lg">
              Anti-surveillance eyewear. 8 hour runtime. <br />
              Invisible to eyes. Blinding to sensors.
            </p>
          </div>
          <div className="pointer-events-auto mt-4">
            <button className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-600 hover:text-white transition-all shadow-2xl cursor-pointer">
              [ Buy now &mdash; $24.99 ]
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
