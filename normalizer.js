(function (root) {
  const invisibles = /[\u00ad\u200b\u2060\ufeff]/g;
  const artifacts = /(?:&nbsp;|&#0*160;|&#x0*a0;|&tab;|\$nbsp;|\$tab;)/gi;
  const artifactUnit = new RegExp(`^(?:${artifacts.source})$`, 'i');

  function tokenText(token) {
    if (token.type === 'text') return token.raw;
    if (token.type === 'escape') return token.raw.slice(1);
    if (token.type === 'image') {
      // Image labels have no child tokens; read the source to preserve literal entities.
      let depth = 1;
      let end = 2;
      for (; depth && end < token.raw.length; end += 1) {
        if (token.raw[end] === '\\') end += 1;
        else if (token.raw[end] === '[') depth += 1;
        else if (token.raw[end] === ']') depth -= 1;
      }
      return token.raw.slice(2, end - 1).replace(/\\([\[\]])/g, '$1');
    }
    // Code spans are escaped with encode=true by Marked; undo that one pass only.
    if (token.type === 'codespan') {
      const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
      return token.text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => entities[entity]);
    }
    return token.text ?? token.raw ?? '';
  }

  function stripMarkdown(input) {
    function inline(tokens = []) {
      return tokens.map(token => {
        if (token.type === 'link' || token.type === 'image') {
          const label = token.tokens ? inline(token.tokens) : tokenText(token);
          return label === token.href ? label : `${label} (${token.href})`;
        }
        if (token.type === 'br') return '\n';
        if (token.tokens) return inline(token.tokens);
        return tokenText(token);
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

  // Linear-space Myers diff: source offsets stay accurate through every cleanup pass.
  function changedRanges(input, output) {
    if (input === output) return [];
    // Treat entities as units so their letters cannot be matched to nearby prose.
    function units(text) {
      const result = [];
      for (const match of text.matchAll(/[&$](?:[^\s&$;]|[\u00ad\u200b\u2060\ufeff])*;|[\s\S]/gu)) {
        if (artifactUnit.test(match[0].replace(invisibles, ''))) {
          result.push({ text: match[0], start: match.index, end: match.index + match[0].length });
        } else {
          let start = match.index;
          for (const character of match[0]) {
            result.push({ text: character, start, end: start + character.length });
            start += character.length;
          }
        }
      }
      return result;
    }
    const source = units(input);
    const target = units(output);
    const ranges = [];
    function add(start, end) {
      start = source[start].start;
      end = source[end - 1].end;
      const previous = ranges[ranges.length - 1];
      if (previous && previous.end === start) previous.end = end;
      else ranges.push({ start, end });
    }
    function compare(start, end, targetStart, targetEnd) {
      while (start < end && targetStart < targetEnd && source[start].text === target[targetStart].text) {
        start += 1;
        targetStart += 1;
      }
      while (start < end && targetStart < targetEnd && source[end - 1].text === target[targetEnd - 1].text) {
        end -= 1;
        targetEnd -= 1;
      }
      if (start === end) return;
      if (targetStart === targetEnd) {
        add(start, end);
        return;
      }
      const length = end - start;
      const targetLength = targetEnd - targetStart;
      const limit = Math.ceil((length + targetLength) / 2);
      const offset = limit + 1;
      const forward = new Int32Array(2 * limit + 3).fill(-1);
      const backward = new Int32Array(2 * limit + 3).fill(-1);
      forward[offset + 1] = backward[offset + 1] = 0;
      const delta = length - targetLength;
      const odd = delta % 2 !== 0;
      let split;
      for (let distance = 0; distance <= limit && !split; distance += 1) {
        for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
          const index = offset + diagonal;
          let x = diagonal === -distance || (diagonal !== distance && forward[index - 1] < forward[index + 1])
            ? forward[index + 1] : forward[index - 1] + 1;
          let y = x - diagonal;
          while (x < length && y < targetLength && source[start + x].text === target[targetStart + y].text) {
            x += 1;
            y += 1;
          }
          forward[index] = x;
          const opposite = offset + delta - diagonal;
          if (odd && opposite >= 0 && opposite < backward.length && backward[opposite] !== -1 &&
              x >= length - backward[opposite]) {
            split = [x, y];
            break;
          }
        }
        if (split) break;
        for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
          const index = offset + diagonal;
          let x = diagonal === -distance || (diagonal !== distance && backward[index - 1] < backward[index + 1])
            ? backward[index + 1] : backward[index - 1] + 1;
          let y = x - diagonal;
          while (x < length && y < targetLength && source[end - x - 1].text === target[targetEnd - y - 1].text) {
            x += 1;
            y += 1;
          }
          backward[index] = x;
          const opposite = offset + delta - diagonal;
          if (!odd && opposite >= 0 && opposite < forward.length && forward[opposite] !== -1 &&
              forward[opposite] >= length - x) {
            const splitX = forward[opposite];
            split = [splitX, splitX - (delta - diagonal)];
            break;
          }
        }
      }
      if (!split || (split[0] === 0 && split[1] === 0) ||
          (split[0] === length && split[1] === targetLength)) {
        add(start, end);
        return;
      }
      compare(start, start + split[0], targetStart, targetStart + split[1]);
      compare(start + split[0], end, targetStart + split[1], targetEnd);
    }
    compare(0, source.length, 0, target.length);
    return ranges;
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
    replaceCount(invisibles, '', 'invisible');
    replaceCount(artifacts, ' ', 'artifacts');
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
    return { text, counts, highlights: changedRanges(input, text) };
  }
  root.normalizeText = normalizeText;
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeText };
})(typeof globalThis !== 'undefined' ? globalThis : this);