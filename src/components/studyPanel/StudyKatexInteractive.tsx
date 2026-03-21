'use client';

export function extractLatexFromKatexRoot(el: HTMLElement): string | null {
  const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
  const raw = annotation?.textContent?.trim();
  return raw && raw.length > 0 ? raw : null;
}

interface StudyKatexInteractiveProps {
  children: React.ReactNode;
  className?: string;
  onFormulaPress: (latex: string, anchorElement: HTMLElement) => void;
}

export function StudyKatexInteractive({
  children,
  className,
  onFormulaPress,
}: StudyKatexInteractiveProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const katex = target.closest('.katex');
    if (!katex || !(katex instanceof HTMLElement)) return;
    if (!event.currentTarget.contains(katex)) return;

    const latex = extractLatexFromKatexRoot(katex);
    if (!latex) return;

    event.preventDefault();
    event.stopPropagation();
    onFormulaPress(latex, katex);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const katex = target.closest('.katex');
    if (!katex || !(katex instanceof HTMLElement)) return;
    if (!event.currentTarget.contains(katex)) return;

    const latex = extractLatexFromKatexRoot(katex);
    if (!latex) return;

    event.preventDefault();
    event.stopPropagation();
    onFormulaPress(latex, katex);
  };

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
