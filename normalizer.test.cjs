const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.marked = require('./vendor/marked.js');
const { normalizeText } = require('./normalizer.js');

test('normalizes explicit whitespace artifacts without decoding unrelated entities', () => {
  assert.equal(normalizeText('Hi\u00a0\t there &nbsp;friend$tab; &amp; &#160; &#xA0;').text,
    'Hi there friend &amp;');
});

test('preserves breaks by default and standardizes line endings', () => {
  assert.equal(normalizeText('One\r\nTwo\r\n\r\nThree\u2028Four').text, 'One\nTwo\n\nThree\nFour');
});

test('optional joining preserves paragraphs, lists, headings, and fenced code', () => {
  const input = 'One\nTwo\n\n- First\n- Second\n\n# Heading\nBody\nwrap\n\n```\ncode\nmore\n```';
  assert.equal(normalizeText(input, { joinLines: true }).text,
    'One Two\n\n- First\n- Second\n\n# Heading\nBody wrap\n\n```\ncode\nmore\n```');
});

test('preserves punctuation, URLs, multilingual text, and emoji joiners', () => {
  const input = '\u201cHello\u201d \u2014 https://example.com/a?b=1&c=2 \u4f60\u597d \u0645\u0631\u062d\u0628\u0627 \ud83d\udc69\u200d\ud83d\udcbb';
  assert.equal(normalizeText(input).text, input);
});

test('removes targeted invisibles and reports counts', () => {
  const result = normalizeText('a\u200bb\u00adc\ufeff');
  assert.equal(result.text, 'abc');
  assert.equal(result.counts.invisible, 3);
});

test('normalization is idempotent in both line modes', () => {
  for (const joinLines of [false, true]) {
    for (const input of ['', ' a\t b \r\nc\n\nd ', 'a&nbsp;\u200b b', 'a&nb\u200bsp;b', '- a\n- b']) {
      const once = normalizeText(input, { joinLines }).text;
      assert.equal(normalizeText(once, { joinLines }).text, once);
    }
  }
});

test('optional Markdown cleanup retains links and lists', () => {
  const input = '# News\n\n**Hello**, *team*. [Read more](https://example.com).\n\n- First\n- Second';
  const result = normalizeText(input, { stripMarkdown: true }).text;
  assert.equal(result, 'News\n\nHello, team. Read more (https://example.com).\n\n- First\n- Second');
  assert.equal(normalizeText(result, { stripMarkdown: true }).text, result);
  assert.equal(normalizeText(input).text, input);
});

test('Markdown cleanup handles tables, quotes, code, tasks, and images', () => {
  const input = '> **Quoted**\n\n```js\nconst value = 1;\n```\n\n- [x] Done\n\n![Photo](https://example.com/photo.jpg)\n\n| Name | Value |\n| --- | --- |\n| A | **B** |';
  const output = normalizeText(input, { stripMarkdown: true }).text;
  for (const expected of ['Quoted', 'const value = 1;', '- [x] Done', 'Photo (https://example.com/photo.jpg)', 'Name | Value\nA | B']) {
    assert.ok(output.includes(expected), expected);
  }
});

test('Markdown cleanup preserves plain punctuation instead of emitting HTML escapes', () => {
  const punctuation = `It's "normal" < text > & more`;
  assert.equal(normalizeText(punctuation, { stripMarkdown: true }).text, punctuation);
  assert.equal(normalizeText(`**It's** "normal" & <fine>`, { stripMarkdown: true }).text,
    `It's "normal" & <fine>`);
  assert.equal(normalizeText('`\' " & < > &amp; &#39;`', { stripMarkdown: true }).text,
    '\' " & < > &amp; &#39;');
  assert.equal(normalizeText('\\& \\< \\> \\" \\\'', { stripMarkdown: true }).text, '& < > " \'');
  assert.equal(normalizeText('Literal &amp; &#39; &copy;', { stripMarkdown: true }).text,
    'Literal &amp; &#39; &copy;');
  for (const prefix of ['', '!']) {
    assert.equal(normalizeText(`${prefix}[It's "great" & <nice> &amp; &#39;](https://example.com)`,
      { stripMarkdown: true }).text, `It's "great" & <nice> &amp; &#39; (https://example.com)`);
  }
  assert.equal(normalizeText('![nested [label] and \\[escaped\\]](https://example.com)',
    { stripMarkdown: true }).text, 'nested [label] and [escaped] (https://example.com)');
  assert.equal(normalizeText('![It\'s good][photo]\n\n[photo]: https://example.com',
    { stripMarkdown: true }).text, 'It\'s good (https://example.com)');
});

function highlighted(input, options) {
  return normalizeText(input, options).highlights.map(({ start, end }) => input.slice(start, end));
}

test('highlights the actual source artifacts, spaces, invisibles, and line endings', () => {
  const input = 'a&nbsp;b\tc\u200bd\r\ne';
  assert.deepEqual(highlighted(input), ['&nbsp;', '\t', '\u200b', '\r']);
  assert.deepEqual(highlighted(' a  b '), [' ', ' ', ' ']);
  assert.deepEqual(highlighted('normal punctuation: \' " & < > \ud83d\udc69\u200d\ud83d\udcbb'), []);
});

test('highlights Markdown syntax and joinable breaks only when enabled', () => {
  const input = '# Heading\n\n**Hello**, *team*.\nNext line\n\n- First\n- Second';
  assert.deepEqual(highlighted(input), []);
  assert.deepEqual(highlighted(input, { joinLines: true }), ['\n']);
  assert.deepEqual(highlighted(input, { stripMarkdown: true }), ['# ', '**', '**', '*', '*']);
  assert.deepEqual(highlighted(input, { stripMarkdown: true, joinLines: true }),
    ['# ', '**', '**', '*', '*', '\n']);
  assert.deepEqual(highlighted('```\ncode\nmore\n```', { joinLines: true }), []);
});

test('highlight ranges stay in source coordinates after multiple cleanup passes', () => {
  for (const artifact of ['&nbsp;\u200b', '&nb\u200bsp;', '&#x0\ufeffa0;']) {
    const input = `## Title\n\nA${artifact}**bold**\nwrap`;
    const result = normalizeText(input, { stripMarkdown: true, joinLines: true });
    assert.equal(result.text, 'Title\n\nA bold wrap');
    assert.deepEqual(result.highlights.map(({ start, end }) => input.slice(start, end)),
      ['## ', artifact + '**', '**\n']);
    for (const { start, end } of result.highlights) {
      assert.ok(start >= 0 && end > start && end <= input.length);
    }
  }
});

test('highlighting handles empty, completely changed, repeated, and long inputs', () => {
  assert.deepEqual(highlighted(''), []);
  assert.deepEqual(highlighted('\u200b\t '), ['\u200b\t ']);
  for (const options of [{}, { joinLines: true }, { stripMarkdown: true, joinLines: true }]) {
    const input = 'one\u200b **two**\nthree\n\n'.repeat(1000);
    const result = normalizeText(input, options);
    let previousEnd = 0;
    for (const { start, end } of result.highlights) {
      assert.ok(start >= previousEnd && end > start && end <= input.length);
      previousEnd = end;
    }
    assert.ok(result.highlights.length >= 1000);
    assert.deepEqual(normalizeText(result.text, options).highlights, []);
  }
});