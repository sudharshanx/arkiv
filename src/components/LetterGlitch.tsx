import { useEffect, useRef } from "react";

type LetterGlitchProps = {
  glitchColors?: string[];
  className?: string;
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type LetterCell = {
  char: string;
  color: Rgb;
  startColor: Rgb;
  targetColor: Rgb;
  colorProgress: number;
};

const DEFAULT_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789";
const DEFAULT_COLORS = ["#2b4539", "#61dca3", "#61b3dc"];

function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_match, r, g, b) => {
    return `${r}${r}${g}${g}${b}${b}`;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToCss(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function interpolateColor(start: Rgb, end: Rgb, factor: number): Rgb {
  return {
    r: Math.round(start.r + (end.r - start.r) * factor),
    g: Math.round(start.g + (end.g - start.g) * factor),
    b: Math.round(start.b + (end.b - start.b) * factor),
  };
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function LetterGlitch({
  glitchColors = DEFAULT_COLORS,
  className = "",
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = DEFAULT_CHARACTERS,
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !parent || !context) return undefined;

    const palette = glitchColors.map(hexToRgb).filter((color): color is Rgb => Boolean(color));
    const colors = palette.length > 0 ? palette : DEFAULT_COLORS.map(hexToRgb).filter((color): color is Rgb => Boolean(color));
    const lettersAndSymbols = Array.from(characters || DEFAULT_CHARACTERS);
    const fontSize = 16;
    const charWidth = 10;
    const charHeight = 20;
    const grid = { columns: 0, rows: 0 };
    let letters: LetterCell[] = [];
    let animationFrame = 0;
    let resizeTimeout: number | undefined;
    let lastGlitchTime = Date.now();
    let isReducedMotion = false;

    if (typeof window.matchMedia === "function") {
      isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    const getRandomChar = () => pickRandom(lettersAndSymbols);
    const getRandomColor = () => ({ ...pickRandom(colors) });

    const initializeLetters = (columns: number, rows: number) => {
      grid.columns = columns;
      grid.rows = rows;
      letters = Array.from({ length: columns * rows }, () => {
        const color = getRandomColor();
        return {
          char: getRandomChar(),
          color,
          startColor: color,
          targetColor: getRandomColor(),
          colorProgress: 1,
        };
      });
    };

    const drawLetters = () => {
      if (letters.length === 0) return;
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      context.textBaseline = "top";

      letters.forEach((letter, index) => {
        const x = (index % grid.columns) * charWidth;
        const y = Math.floor(index / grid.columns) * charHeight;
        context.fillStyle = rgbToCss(letter.color);
        context.fillText(letter.char, x, y);
      });
    };

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      initializeLetters(Math.ceil(rect.width / charWidth), Math.ceil(rect.height / charHeight));
      drawLetters();
    };

    const updateLetters = () => {
      if (letters.length === 0) return;
      const updateCount = Math.max(1, Math.floor(letters.length * 0.045));

      for (let i = 0; i < updateCount; i += 1) {
        const index = Math.floor(Math.random() * letters.length);
        const letter = letters[index];
        if (!letter) continue;

        letter.char = getRandomChar();
        letter.startColor = letter.color;
        letter.targetColor = getRandomColor();

        if (smooth) {
          letter.colorProgress = 0;
        } else {
          letter.color = letter.targetColor;
          letter.colorProgress = 1;
        }
      }
    };

    const handleSmoothTransitions = () => {
      let needsRedraw = false;
      letters.forEach((letter) => {
        if (letter.colorProgress >= 1) return;

        letter.colorProgress = Math.min(1, letter.colorProgress + 0.055);
        letter.color = interpolateColor(letter.startColor, letter.targetColor, letter.colorProgress);
        needsRedraw = true;
      });

      return needsRedraw;
    };

    const animate = () => {
      const now = Date.now();
      let needsRedraw = false;

      if (now - lastGlitchTime >= glitchSpeed) {
        updateLetters();
        lastGlitchTime = now;
        needsRedraw = true;
      }

      if (smooth && handleSmoothTransitions()) {
        needsRedraw = true;
      }

      if (needsRedraw) {
        drawLetters();
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        window.cancelAnimationFrame(animationFrame);
        resizeCanvas();
        if (!isReducedMotion) {
          animate();
        }
      }, 100);
    };

    resizeCanvas();
    if (!isReducedMotion) {
      animate();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, [characters, glitchColors, glitchSpeed, smooth]);

  return (
    <div className={`letter-glitch ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="letter-glitch__canvas" />
      {outerVignette && <div className="letter-glitch__vignette letter-glitch__vignette--outer" />}
      {centerVignette && <div className="letter-glitch__vignette letter-glitch__vignette--center" />}
    </div>
  );
}
