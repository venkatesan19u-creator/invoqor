import html2pdf from 'html2pdf.js';
import { DocumentMode, PAPER_DIMENSIONS, PaperSize } from '../types/billing';

/**
 * Exports an isolated A4 or US Letter white DOM element to a crisp single-page PDF.
 * Strips Tailwind v4 oklch()/oklab() CSS rules inside the cloned document so
 * html2canvas renders cleanly without unsupported color-function errors.
 */
export async function exportDocumentToPdf(
  element: HTMLElement,
  mode: DocumentMode,
  paperSize: PaperSize = 'a4'
): Promise<void> {
  const filename = mode === 'invoice' ? 'Invoqor-Invoice.pdf' : 'Invoqor-Proposal.pdf';
  const { width, height } = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.a4;

  const opt = {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    enableLinks: false,
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone: (clonedDoc: Document) => {
        // Ensure cloned root has pure hex colors and zero oklch/oklab rules from Tailwind v4
        clonedDoc.documentElement.style.background = '#ffffff';
        clonedDoc.documentElement.style.color = '#0f172a';
        clonedDoc.body.style.background = '#ffffff';
        clonedDoc.body.style.color = '#0f172a';
        clonedDoc.body.style.margin = '0';
        clonedDoc.body.style.padding = '0';

        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((styleEl) => {
          const text = styleEl.textContent || '';
          if (text.includes('oklch') || text.includes('oklab') || text.includes('color-mix')) {
            // Remove Tailwind's oklch theme rules in the clone; the document sheet uses explicit hex inline styles
            styleEl.textContent = text
              .replace(/oklch\([^)]*\)/g, '#64748b')
              .replace(/oklab\([^)]*\)/g, '#64748b')
              .replace(/color-mix\([^;{}]*\)/g, '#64748b');
          }
        });
      },
    },
    jsPDF: {
      unit: 'px' as const,
      format: [width, height] as [number, number],
      orientation: 'portrait' as const,
      compress: true,
    },
  };

  await html2pdf().set(opt).from(element).save();
}
