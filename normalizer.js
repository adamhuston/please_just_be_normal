(function (root) {
  function stripMarkdown(input) {
    function inline(tokens = []) {
      return tokens.map(token => {
        if (token.type === 'link' || token.type === 'image') {
          const label = token.tokens ? inline(token.tokens) : token.text;
          return label === token.href ? label : `${label} (${token.href})`;
        }
        if (token.type === 'br') return '\n';
        if (token.tokens) return inline(token.tokens);
        return token.text ?? token.raw ?? '';
      }).join('');
    }
    function blocks(tokens) {
      return tokens.map(token => {
        if (token.type === 'space') return '\n';
        if (token.type === 'list') {
          return token.items.map((item, index) => {
            const marker = token.ordered ? `${Number(token.start) + index}. ` : '- ';
            const task = item.task ? (item.checked ? '[x] ' : '[ ] ') : '';
            return marker + task + blocks(item.tokens).trim();
          }).join('\n') + '\n\n';
        }
        if (token.type === 'blockquote') return blocks(token.tokens) + '\n';
        if (token.type === 'table') {
          return [token.header, ...token.rows].map(row => row.map(cell => inline(cell.tokens)).join(' | ')).join('\n') + '\n\n';
        }
        if (token.type === 'hr') return '\n';
        if (token.type === 'code') return token.text + '\n\n';
        return (token.tokens ? inline(token.tokens) : token.text ?? token.raw ?? '') + '\n\n';
      }).join('');
    }
    return blocks(root.marked.lexer(input)).replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalizeText(input, options = {}) {
    const counts = { artifacts: 0, spaces: 0, invisible: 0, lineEndings: 0, joined: 0 };
    function replaceCount(pattern, replacement, category) {
      text = text.replace(pattern, match => {
        counts[category] += 1;
        return typeof replacement === 'function' ? replacement(match) : replacement;
      });
    }
    let text = options.stripMarkdown ? stripMarkdown(input) : input;
    replaceCount(/[\u00ad\u200b\u2060\ufeff]/g, '', 'invisible');
    replaceCount(/(?:&nbsp;|&#0*160;|&#x0*a0;|&tab;|\$nbsp;|\$tab;)/gi, ' ', 'artifacts');
    replaceCount(/\r\n|\r|\u0085|\u2028/g, '\n', 'lineEndings');
    replaceCount(/\u2029/g, '\n\n', 'lineEndings');
    replaceCount(/[\t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ', 'spaces');
    replaceCount(/ {2,}/g, ' ', 'spaces');
    replaceCount(/^ +| +$/gm, '', 'spaces');
    if (options.joinLines) {
      const lines = text.split('\n');
      const isStructured = line => /^(?:[-*+\u2022] |\d+[.)] |#{1,6} |> |```|~~~|\|)/.test(line);
      let insideFence = false;
      text = lines.reduce((output, line, index) => {
        const previous = lines[index - 1];
        const fence = /^(?:```|~~~)/.test(line);
        const join = index > 0 && line && previous && !insideFence && !fence &&
          !isStructured(line) && !isStructured(previous);
        if (join) counts.joined += 1;
        const result = output + (index ? (join ? ' ' : '\n') : '') + line;
        if (fence) insideFence = !insideFence;
        return result;
      }, '');
    }
    return { text, counts };
  }
  root.normalizeText = normalizeText;
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeText };
})(typeof globalThis !== 'undefined' ? globalThis : this);