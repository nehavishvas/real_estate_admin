/**
 * Utility to parse and format Terms and Conditions content.
 * Handles both rich HTML (from CKEditor) and legacy Markdown smoothly.
 */

export function parseInlineMd(str) {
  if (!str) return '';
  return str
    // Fix broken asterisks like *** Title: ** Text
    .replace(/^\*{2,3}\s*([^*:]+)(:?)\s*\*{2,3}\s*/g, '<strong>$1$2</strong> ')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

export function formatContentToHtml(raw) {
  if (!raw || !raw.trim()) return '';

  // If content already contains rich HTML block elements, return as is
  if (/<(p|h[1-6]|ul|ol|li|div|blockquote)[^>]*>/i.test(raw)) {
    return raw;
  }

  const lines = raw.split(/\r?\n/);
  const htmlParts = [];
  let inUl = false;
  let inOl = false;
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        htmlParts.push(`<p>${parseInlineMd(text)}</p>`);
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (inUl) {
      htmlParts.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlParts.push('</ol>');
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Horizontal rule
    if (line === '---' || line === '***') {
      flushParagraph();
      flushList();
      htmlParts.push('<hr />');
      continue;
    }

    // Markdown Headings: #, ##, ###
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(3, hMatch[1].length + 1);
      htmlParts.push(`<h${level}>${parseInlineMd(hMatch[2])}</h${level}>`);
      continue;
    }

    // Section Heading with number: e.g.
    // **1. Purpose of Validation (Professional KYC)**
    // or **1. Purpose of Validation (Professional KYC)** Followed by body text
    const boldHeadSplitMatch = line.match(/^\*\*(\d+[\.\)]\s+[^*]+?)\*\*\s*(.*)$/);
    if (boldHeadSplitMatch) {
      flushParagraph();
      flushList();
      htmlParts.push(`<h3>${parseInlineMd(boldHeadSplitMatch[1])}</h3>`);
      if (boldHeadSplitMatch[2] && boldHeadSplitMatch[2].trim()) {
        currentParagraph.push(boldHeadSplitMatch[2].trim());
      }
      continue;
    }

    // Numbered heading standalone line: e.g. "1. What is Terms & Conditions?" or "2. Accuracy and License of Use"
    const plainHeadMatch = line.match(/^(\d+[\.\)]\s+[A-Za-z][^.!?\n]{2,90})$/);
    if (plainHeadMatch) {
      flushParagraph();
      flushList();
      htmlParts.push(`<h3>${plainHeadMatch[1]}</h3>`);
      continue;
    }

    // Bullet list items: *** text or * text or - text or • text
    const bulletMatch = line.match(/^(\*{1,3}|-|\u2022)\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul>');
        inUl = true;
      }
      htmlParts.push(`<li>${parseInlineMd(bulletMatch[2])}</li>`);
      continue;
    }

    // Numbered list items inside text: 1) or 1.
    const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numMatch && line.length > 5) {
      if (inUl) {
        htmlParts.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push('<ol>');
        inOl = true;
      }
      htmlParts.push(`<li>${parseInlineMd(numMatch[2])}</li>`);
      continue;
    }

    // Normal text line -> join with current paragraph to prevent artificial newline gaps
    if (inUl || inOl) {
      // If the line looks like continuation of previous list item, append to previous <li>
      if (htmlParts.length > 0 && htmlParts[htmlParts.length - 1].endsWith('</li>')) {
        const lastIdx = htmlParts.length - 1;
        htmlParts[lastIdx] = htmlParts[lastIdx].replace(/<\/li>$/, ` ${parseInlineMd(line)}</li>`);
        continue;
      }
      flushList();
    }
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return htmlParts.join('\n');
}
