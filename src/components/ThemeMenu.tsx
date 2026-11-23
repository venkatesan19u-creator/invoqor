import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { isColorLight, normalizeHex, UI_BACKGROUND_PRESETS } from '../utils/colorTheme';

interface ThemeMenuProps {
  currentHex: string;
  onChange: (hex: string) => void;
  isLightTheme: boolean;
}

export const ThemeMenu: React.FC<ThemeMenuProps> = ({
  currentHex,
  onChange,
  isLightTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(currentHex);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexDraft(currentHex);
  }, [currentHex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleHexInputChange = (val: string) => {
    setHexDraft(val);
    const valid = normalizeHex(val);
    if (valid) {
      onChange(valid);
    }
  };

  const handleHexInputBlur = () => {
    const valid = normalizeHex(hexDraft);
    if (valid) {
      setHexDraft(valid);
      onChange(valid);
    } else {
      setHexDraft(currentHex);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="App Background Theme"
        className="ui-btn-soft min-h-[38px] md:min-h-[40px] px-2.5 md:px-3 py-1.5 rounded-xl text-xs md:text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <span
          className={`w-3.5 h-3.5 rounded-full shrink-0 ring-1 ${
            isLightTheme ? 'ring-slate-900/25' : 'ring-white/35'
          }`}
          style={{ backgroundColor: currentHex }}
        />
        <Palette className="w-3.5 h-3.5 ui-text-secondary hidden sm:block" />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Customize app background theme"
          className="ui-modal-surface absolute right-0 mt-2.5 w-[276px] sm:w-[296px] rounded-2xl shadow-2xl p-4 z-50 space-y-3.5"
        >
          <div>
            <div className="text-xs font-semibold ui-text-primary">App Background Theme</div>
            <div className="text-[11px] ui-text-muted mt-0.5">
              A4 paper stays crisp white in all themes
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            {UI_BACKGROUND_PRESETS.map((preset) => {
              const active = currentHex.toUpperCase() === preset.hex.toUpperCase();
              const lightPreset = isColorLight(preset.hex);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(preset.hex)}
                  className={`w-full min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
                    active
                      ? isLightTheme
                        ? 'bg-indigo-500/12 border-indigo-500/50'
                        : 'bg-indigo-500/20 border-indigo-400/55'
                      : 'ui-subpanel hover:opacity-95'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full shrink-0 ring-1 ${
                        lightPreset ? 'ring-slate-900/20' : 'ring-white/25'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="text-xs font-medium ui-text-primary truncate">
                      {preset.name}
                    </span>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 ui-accent-text shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Unlimited Custom Color Wheel & Hex Input */}
          <div className="pt-3 border-t ui-divider space-y-2">
            <label
              htmlFor="custom-ui-bg-hex"
              className="block text-[11px] font-semibold uppercase tracking-wider ui-text-muted"
            >
              Custom Background Color
            </label>

            <div className="flex items-center gap-2">
              <label
                className={`relative w-10 h-10 rounded-xl shrink-0 cursor-pointer overflow-hidden ring-1 ${
                  isLightTheme ? 'ring-slate-900/20' : 'ring-white/25'
                }`}
                style={{ backgroundColor: currentHex }}
                title="Open color wheel"
                aria-label="Pick custom background color"
              >
                <input
                  type="color"
                  value={currentHex}
                  onChange={(e) => onChange(e.target.value.toUpperCase())}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>

              <input
                id="custom-ui-bg-hex"
                type="text"
                value={hexDraft}
                onChange={(e) => handleHexInputChange(e.target.value)}
                onBlur={handleHexInputBlur}
                placeholder="#0B0F19"
                maxLength={7}
                spellCheck={false}
                className="glass-input font-mono-nums flex-1 h-10 px-3 rounded-xl text-xs uppercase"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
