import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PrivacyLockScreenProps {
  expectedPin: string;
  onUnlock: () => void;
  isLightTheme: boolean;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'] as const;

export const PrivacyLockScreen: React.FC<PrivacyLockScreenProps> = ({
  expectedPin,
  onUnlock,
  isLightTheme,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      setError(false);
      setEntered((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          if (next === expectedPin) {
            window.setTimeout(() => {
              onUnlock();
            }, 90);
          } else {
            window.setTimeout(() => {
              setError(true);
              setEntered('');
            }, 140);
          }
        }
        return next;
      });
    },
    [expectedPin, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    setError(false);
    setEntered((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setError(false);
    setEntered('');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDigit, handleBackspace, handleClear]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-2xl"
      style={{
        backgroundColor: isLightTheme ? 'rgba(238, 242, 249, 0.78)' : 'rgba(8, 12, 24, 0.82)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Invoqor Privacy PIN Lock"
    >
      <div className="glass-card w-full max-w-xs rounded-3xl p-6 flex flex-col items-center gap-5 shadow-2xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="ui-subpanel w-12 h-12 rounded-2xl flex items-center justify-center">
            <Lock className="w-5 h-5 ui-accent-text" />
          </div>
          <h1 className="font-display text-lg font-bold ui-text-primary">
            Invoqor Locked
          </h1>
          <p className="text-xs ui-text-muted">
            {error ? 'Incorrect PIN. Please try again.' : 'Enter your 4-digit PIN to unlock'}
          </p>
        </div>

        {/* 4 PIN Dot Indicators */}
        <div
          className={`flex items-center gap-3.5 py-1 ${error ? 'animate-klyra-shake' : ''}`}
          aria-live="polite"
        >
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < entered.length;
            return (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                  error
                    ? 'border-rose-500 bg-rose-500/30'
                    : filled
                      ? 'bg-indigo-500 border-indigo-400 scale-110'
                      : isLightTheme
                        ? 'border-slate-900/25 bg-transparent'
                        : 'border-white/30 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Touch-Friendly Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {KEYPAD_KEYS.map((key) => {
            if (key === 'Clear') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleClear}
                  className="ui-btn-soft min-h-[52px] rounded-2xl text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              );
            }
            if (key === 'Back') {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="ui-btn-soft min-h-[52px] rounded-2xl flex items-center justify-center cursor-pointer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                className="ui-btn-soft min-h-[52px] rounded-2xl font-mono-nums text-lg font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
