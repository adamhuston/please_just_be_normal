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