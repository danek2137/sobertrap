import { useRef, useEffect } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  fallSpeed: number;
  drift: number;
  driftSpeed: number;
  opacity: number;
  color: string;
}

export default function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let petals: Petal[] = [];

    const colors = [
      'rgba(236, 72, 153, OPACITY)',
      'rgba(244, 114, 182, OPACITY)',
      'rgba(249, 168, 212, OPACITY)',
      'rgba(251, 207, 232, OPACITY)',
      'rgba(219, 39, 119, OPACITY)',
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 60);
      while (petals.length < count) {
        petals.push(createPetal(true));
      }
      if (petals.length > count) petals.length = count;
    };

    const createPetal = (randomY: boolean): Petal => ({
      x: Math.random() * (canvas?.width || 1200),
      y: randomY ? Math.random() * (canvas?.height || 800) : -20 - Math.random() * 100,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      fallSpeed: Math.random() * 0.4 + 0.15,
      drift: Math.random() * 2 - 1,
      driftSpeed: (Math.random() - 0.5) * 0.008,
      opacity: Math.random() * 0.4 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    const drawPetal = (p: Petal) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      const color = p.color.replace('OPACITY', String(p.opacity));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of petals) {
        p.y += p.fallSpeed;
        p.x += p.drift + Math.sin(p.y * 0.02) * 0.3;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height + 20) {
          Object.assign(p, createPetal(false));
          p.y = -20 - Math.random() * 50;
        }
        if (p.x < -30) p.x = canvas.width + 20;
        if (p.x > canvas.width + 30) p.x = -20;

        drawPetal(p);
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
