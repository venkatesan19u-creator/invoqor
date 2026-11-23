import React, { useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  DocumentData,
  PAPER_DIMENSIONS,
} from '../types/billing';
import { A4Document } from './A4Document';

interface ScaledA4PreviewProps {
  doc: DocumentData;
  settings?: AppSettings;
  onQrClick?: () => void;
}

export const ScaledA4Preview: React.FC<ScaledA4PreviewProps> = ({
  doc,
  settings = DEFAULT_APP_SETTINGS,
  onQrClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);

  const paper = PAPER_DIMENSIONS[settings.paperSize] ?? PAPER_DIMENSIONS.a4;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const availableWidth = el.clientWidth;
      if (availableWidth > 0) {
        const nextScale = Math.min(1, availableWidth / paper.width);
        setScale(nextScale);
      }
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [paper.width]);

  const scaledHeight = Math.round(paper.height * scale);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div
        className="relative overflow-hidden rounded-lg shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)] ring-1 ring-white/15 bg-white"
        style={{
          width: `${Math.round(paper.width * scale)}px`,
          height: `${scaledHeight}px`,
        }}
      >
        <div
          style={{
            width: `${paper.width}px`,
            height: `${paper.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <A4Document doc={doc} settings={settings} onQrClick={onQrClick} />
        </div>
      </div>
    </div>
  );
};
