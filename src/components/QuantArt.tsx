import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  brightness: number;
  glyph: string;
};

type PointerPosition = {
  x: number | null;
  y: number | null;
};

const GLYPHS = ['·', '+', '/', '0', '1'];

export function QuantArt({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<PointerPosition>({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let particles: Particle[] = [];
    let frame: number | null = null;

    const draw = () => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = '#020704';
      context.fillRect(0, 0, width, height);
      context.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      particles.forEach((particle) => {
        const alpha = 0.3 + particle.brightness * 0.7;
        context.fillStyle = `rgba(51, 255, 102, ${alpha})`;
        context.fillText(particle.glyph, particle.x, particle.y);
      });
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      particles = Array.from({ length: Math.max(72, Math.floor((width * height) / 11000)) }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        velocityX: (Math.random() - 0.5) * 0.24,
        velocityY: (Math.random() - 0.5) * 0.24,
        brightness: 0.2 + Math.random() * 0.35,
        glyph: GLYPHS[index % GLYPHS.length]
      }));
      draw();
    };

    const animate = () => {
      const pointer = pointerRef.current;
      particles.forEach((particle) => {
        if (pointer.x !== null && pointer.y !== null) {
          const distanceX = pointer.x - particle.x;
          const distanceY = pointer.y - particle.y;
          const distance = Math.max(18, Math.hypot(distanceX, distanceY));
          const attraction = Math.min(0.065, 1.6 / distance);
          particle.velocityX += distanceX * attraction * 0.02;
          particle.velocityY += distanceY * attraction * 0.02;
          particle.brightness = Math.min(1, particle.brightness + 0.09);
        } else {
          particle.velocityX += (Math.random() - 0.5) * 0.012;
          particle.velocityY += (Math.random() - 0.5) * 0.012;
          particle.brightness = Math.max(0.18, particle.brightness * 0.985);
        }

        particle.velocityX *= 0.986;
        particle.velocityY *= 0.986;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;
        if (particle.y < -12) particle.y = height + 12;
        if (particle.y > height + 12) particle.y = -12;
      });

      draw();
      frame = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reducedMotion) frame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const trackPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  return (
    <div className="quant-art">
      <canvas
        ref={canvasRef}
        className="quant-art-canvas"
        aria-hidden="true"
        onPointerDown={trackPointer}
        onPointerMove={trackPointer}
        onPointerLeave={() => {
          pointerRef.current = { x: null, y: null };
        }}
      />
      <button type="button" className="quant-art-exit" onClick={onExit}>
        exit
      </button>
    </div>
  );
}
