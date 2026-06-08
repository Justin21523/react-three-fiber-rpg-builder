import { useState, useEffect, useRef } from 'react';

// Kit — reveals `text` one character at a time at `speed` ms/char; `skip()` jumps to the end.
export function useTypewriter(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTextRef = useRef(text);

  useEffect(() => {
    activeTextRef.current = text;
    indexRef.current = 0;

    const typeNextChar = () => {
      if (activeTextRef.current !== text) return;
      if (indexRef.current < text.length) {
        const nextIndex = indexRef.current + 1;
        setDisplayedText(text.slice(0, nextIndex));
        indexRef.current += 1;
        timerRef.current = setTimeout(typeNextChar, speed);
      }
    };

    timerRef.current = setTimeout(() => {
      if (activeTextRef.current !== text) return;
      setDisplayedText('');
      typeNextChar();
    }, 0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed]);

  const skip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText(text);
  };

  const isComplete = displayedText.length >= text.length;
  return { displayedText, isComplete, skip };
}
