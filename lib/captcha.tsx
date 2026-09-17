'use client';

import { useEffect, useRef, useState } from 'react';

type CharMap = '' | 'upper' | 'lower' | 'numbers' | 'special_char';

const CHAR_SETS: Record<Exclude<CharMap, ''>, string> = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special_char: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
};
const DEFAULT_ALPHANUMERIC =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface CaptchaState {
  code: string;
  length: number;
  backgroundColor: string;
  fontColor: string;
  charMap: CharMap;
  version: number;
}

let captchaState: CaptchaState = {
  code: '',
  length: 6,
  backgroundColor: '#ffffff',
  fontColor: '#4a5568',
  charMap: '',
  version: 0,
};

const listeners = new Set<() => void>();

function emit() {
  captchaState.version += 1;
  listeners.forEach(listener => listener());
}

function randomChar(alphabet: string): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

export function loadCaptchaEnginge(
  numberOfCharacters: number,
  backgroundColor = '#ffffff',
  fontColor = '#4a5568',
  charMap: CharMap = '',
) {
  const alphabet = charMap === '' ? DEFAULT_ALPHANUMERIC : CHAR_SETS[charMap];
  let code = '';
  const count = Math.max(1, Math.floor(numberOfCharacters));
  for (let i = 0; i < count; i++) {
    code += randomChar(alphabet);
  }
  captchaState = {
    ...captchaState,
    code,
    length: count,
    backgroundColor,
    fontColor,
    charMap,
  };
  emit();
}

export function validateCaptcha(userValue: string, reload = true): boolean {
  if (captchaState.code && captchaState.code === userValue) {
    if (reload) {
      loadCaptchaEnginge(
        captchaState.length,
        captchaState.backgroundColor,
        captchaState.fontColor,
        captchaState.charMap,
      );
    }
    return true;
  }
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function drawCaptcha(canvas: HTMLCanvasElement, state: CaptchaState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = state.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  const chars = state.code.split('');
  const step = width / (chars.length + 1);
  chars.forEach((char, i) => {
    ctx.save();
    ctx.translate(step * (i + 1), height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.7);
    const fontSize = 24 + Math.random() * 14;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = state.fontColor;
    ctx.fillText(char, -fontSize / 2, fontSize * 0.35);
    ctx.restore();
  });
}

interface LoadCanvasTemplateProps {
  reloadText?: string;
  reloadColor?: string;
}

export function LoadCanvasTemplate({
  reloadText = 'reload',
  reloadColor = '#4a5568',
}: LoadCanvasTemplateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [version, setVersion] = useState(captchaState.version);

  useEffect(() => subscribe(() => setVersion(captchaState.version)), []);

  useEffect(() => {
    if (canvasRef.current) drawCaptcha(canvasRef.current, captchaState);
  }, [version]);

  return (
    <div className="flex items-center gap-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="rounded-sm border border-gray-300 dark:border-gray-700"
      />
      <button
        type="button"
        onClick={() =>
          loadCaptchaEnginge(
            captchaState.length,
            captchaState.backgroundColor,
            captchaState.fontColor,
            captchaState.charMap,
          )
        }
        className="cursor-pointer text-xs underline"
        style={{ color: reloadColor }}
      >
        {reloadText}
      </button>
    </div>
  );
}