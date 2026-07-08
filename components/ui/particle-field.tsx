"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * An interactive particle constellation rendered on a canvas.
 * Adapted from the "Aether Flow" hero background: particles drift, repel from
 * the pointer (mouse OR touch), and connect with fading lines. Rendered as a
 * fixed, full-viewport background so page content can scroll over it.
 *
 * Mobile considerations:
 *  - Touch drives the same repel interaction as the mouse.
 *  - Particles are NOT rebuilt on height-only resizes, so the field doesn't
 *    "reset" when the browser chrome (address bar) shows/hides during scroll.
 *  - The canvas is drawn at devicePixelRatio (capped) for crisp lines on
 *    retina screens, while particle density is based on CSS pixels so the
 *    count doesn't explode on high-DPR phones.
 *  - The interaction radius scales with viewport width so it feels right on a
 *    small screen instead of covering half of it.
 *  - Respects `prefers-reduced-motion`: renders a single static frame.
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // Logical (CSS-pixel) dimensions used for all particle math.
    let width = 0;
    let height = 0;
    let animationFrameId = 0;

    const mouse: { x: number | null; y: number | null; radius: number } = {
      x: null,
      y: null,
      radius: 200,
    };

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(
        x: number,
        y: number,
        directionX: number,
        directionY: number,
        size: number,
        color: string,
      ) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        if (this.x > width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size && distance > 0) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 5;
            this.y -= forceDirectionY * force * 5;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    let particles: Particle[] = [];

    const init = () => {
      particles = [];
      // Density from CSS pixels; capped so weaker mobile GPUs stay smooth
      // (connect() is O(n²)).
      const numberOfParticles = Math.min(
        Math.floor((width * height) / 9000),
        140,
      );
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (width - size * 4) + size * 2;
        const y = Math.random() * (height - size * 4) + size * 2;
        const directionX = Math.random() * 0.4 - 0.2;
        const directionY = Math.random() * 0.4 - 0.2;
        const color = "rgba(191, 128, 255, 0.8)";
        particles.push(
          new Particle(x, y, directionX, directionY, size, color),
        );
      }
    };

    const connect = () => {
      const connectDistSq = (width / 7) * (height / 7);
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const distSq =
            (particles[a].x - particles[b].x) *
              (particles[a].x - particles[b].x) +
            (particles[a].y - particles[b].y) *
              (particles[a].y - particles[b].y);

          if (distSq < connectDistSq) {
            // Fade relative to the actual threshold → always a valid 0..1.
            const opacityValue = Math.max(0, 1 - distSq / connectDistSq);

            let nearPointer = false;
            if (mouse.x !== null && mouse.y !== null) {
              const dxm = particles[a].x - mouse.x;
              const dym = particles[a].y - mouse.y;
              nearPointer = dxm * dxm + dym * dym < mouse.radius * mouse.radius;
            }

            ctx.strokeStyle = nearPointer
              ? `rgba(255, 255, 255, ${opacityValue})`
              : `rgba(200, 150, 255, ${opacityValue})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const clearFrame = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      clearFrame();
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    };

    const renderStatic = () => {
      clearFrame();
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
      }
      connect();
    };

    const resizeCanvas = () => {
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      // Only the width changing (orientation / real resize) warrants a rebuild.
      // Height-only changes are the mobile address bar — keep the field intact.
      const widthChanged = Math.abs(cssW - width) > 1;

      width = cssW;
      height = cssH;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Radius relative to the shorter screen edge so touch feels natural.
      mouse.radius = Math.max(90, Math.min(200, Math.min(width, height) * 0.35));

      if (widthChanged || particles.length === 0) init();
      if (reduceMotion) renderStatic();
    };

    const setPointer = (x: number, y: number) => {
      mouse.x = x;
      mouse.y = y;
    };
    const clearPointer = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleMouseMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY);
    const handleTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    };

    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();

    if (!reduceMotion) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseout", clearPointer);
      window.addEventListener("touchstart", handleTouch, { passive: true });
      window.addEventListener("touchmove", handleTouch, { passive: true });
      window.addEventListener("touchend", clearPointer);
      window.addEventListener("touchcancel", clearPointer);
      animate();
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", clearPointer);
      window.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", clearPointer);
      window.removeEventListener("touchcancel", clearPointer);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 h-full w-full bg-black",
        className,
      )}
    />
  );
}

export default ParticleField;
