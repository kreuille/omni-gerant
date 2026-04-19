'use client';

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

// BUSINESS RULE [CDC-2.1]: Capture de signature manuscrite (doigt ou souris)
// Retourne une image base64 PNG du trait.

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string | null;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  onChange?: (hasSignature: boolean) => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ width = 560, height = 180, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onChange?.(false);
      },
      isEmpty: () => isEmpty,
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return null;
        return canvas.toDataURL('image/png');
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // High-DPI support so the stroke is crisp on retina / mobile
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a202c';

      function getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
          const t = e.touches[0] ?? e.changedTouches[0];
          if (!t) return { x: 0, y: 0 };
          return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }

      function start(e: MouseEvent | TouchEvent) {
        e.preventDefault();
        drawing.current = true;
        lastPoint.current = getPoint(e);
        if (isEmpty) {
          setIsEmpty(false);
          onChange?.(true);
        }
      }

      function move(e: MouseEvent | TouchEvent) {
        if (!drawing.current || !ctx || !lastPoint.current) return;
        e.preventDefault();
        const p = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastPoint.current = p;
      }

      function end() {
        drawing.current = false;
        lastPoint.current = null;
      }

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', end);
      canvas.addEventListener('mouseleave', end);
      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', end);

      return () => {
        canvas.removeEventListener('mousedown', start);
        canvas.removeEventListener('mousemove', move);
        canvas.removeEventListener('mouseup', end);
        canvas.removeEventListener('mouseleave', end);
        canvas.removeEventListener('touchstart', start);
        canvas.removeEventListener('touchmove', move);
        canvas.removeEventListener('touchend', end);
      };
    }, [width, height, isEmpty, onChange]);

    return (
      <canvas
        ref={canvasRef}
        className="border-2 border-dashed border-gray-300 rounded-md bg-white touch-none cursor-crosshair"
        style={{ width, height, maxWidth: '100%' }}
      />
    );
  },
);
