import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import MathMarkdownRenderer from './MathMarkdownRenderer';

function render(source: string) {
  return renderToStaticMarkup(createElement(MathMarkdownRenderer, { source }));
}

describe('MathMarkdownRenderer', () => {
  it('renders inline LaTeX expressions', () => {
    const html = render('Euler formula: $e^{i\\pi} + 1 = 0$');

    expect(html).toContain('katex');
  });

  it('renders block LaTeX expressions', () => {
    const html = render('$$\\frac{1}{2} + \\frac{1}{2} = 1$$');

    expect(html).toContain('katex');
  });

  it('renders markdown headers', () => {
    const html = render('## Theory');

    expect(html).toContain('<h2>');
    expect(html).toContain('Theory');
  });

  it('falls back to plain text when LaTeX parsing fails', () => {
    const source = 'Broken formula: $\\\\frac{1}{2$';
    const html = render(source);

    expect(html).toContain('Broken formula:');
    expect(html).toContain('katex-error');
  });
});
