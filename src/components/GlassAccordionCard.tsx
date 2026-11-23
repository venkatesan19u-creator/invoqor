import React from 'react';
import { ChevronDown } from 'lucide-react';

interface GlassAccordionCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const GlassAccordionCard: React.FC<GlassAccordionCardProps> = ({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <section className="glass-card rounded-2xl overflow-hidden transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full min-h-[60px] px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.04] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="ui-subpanel ui-text-secondary w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold ui-text-primary tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs ui-text-muted truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 ui-text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 ui-text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t ui-divider">
          {children}
        </div>
      )}
    </section>
  );
};
