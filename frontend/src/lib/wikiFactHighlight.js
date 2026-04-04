/** @typedef {{ node: Text, offset: number }} TextOffset */

const HIGHLIGHT_STYLE_ID = 'wikidaily-fact-highlight-style'
export const WIKI_FACT_HIGHLIGHT_CLASS = 'wikidaily-fact-highlight'

function ensureHighlightStyles(doc) {
  if (doc.getElementById(HIGHLIGHT_STYLE_ID)) return
  const st = doc.createElement('style')
  st.id = HIGHLIGHT_STYLE_ID
  st.textContent = `
    mark.${WIKI_FACT_HIGHLIGHT_CLASS} {
      background: #fde047;
      color: inherit;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
  `
  doc.head?.appendChild(st)
}

export function normalizeWikiFactMatchText(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove highlights this app added so we can re-run search/wrap safely.
 * @param {Document} doc
 */
export function stripWikiFactHighlights(doc) {
  doc.querySelectorAll(`mark.${WIKI_FACT_HIGHLIGHT_CLASS}`).forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
  })
  try {
    doc.body?.normalize()
  } catch {
    // ignore
  }
}

/**
 * @param {Document} doc
 * @param {HTMLElement} root
 * @param {string} factText
 * @returns {Range | null}
 */
export function findFactTextRange(doc, root, factText) {
  let needle = normalizeWikiFactMatchText(factText)
  if (needle.length < 3) return null

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement
      if (!el) return NodeFilter.FILTER_REJECT
      const t = el.tagName
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const normChars = []
  /** @type {TextOffset[]} */
  const charToSource = []
  let lastWasSpace = true

  let n
  while ((n = walker.nextNode())) {
    const text = n.nodeValue
    if (!text) continue
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      const isWs = /\s/.test(c)
      if (isWs) {
        if (!lastWasSpace) {
          normChars.push(' ')
          charToSource.push({ node: /** @type {Text} */ (n), offset: i })
          lastWasSpace = true
        }
      } else {
        normChars.push(c)
        charToSource.push({ node: /** @type {Text} */ (n), offset: i })
        lastWasSpace = false
      }
    }
  }

  while (normChars.length && normChars[normChars.length - 1] === ' ') {
    normChars.pop()
    charToSource.pop()
  }

  const haystack = normChars.join('')
  let startIdx = haystack.indexOf(needle)
  let matchLen = needle.length

  if (startIdx === -1 && needle.length > 80) {
    const shorter = needle.slice(0, 80).trim()
    if (shorter.length >= 20) {
      startIdx = haystack.indexOf(shorter)
      if (startIdx !== -1) matchLen = shorter.length
    }
  }

  if (startIdx === -1 || charToSource.length === 0) return null

  const lastIdx = startIdx + matchLen - 1
  if (lastIdx < 0 || lastIdx >= charToSource.length) return null

  const start = charToSource[startIdx]
  const end = charToSource[lastIdx]
  const range = doc.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset + 1)
  return range
}

/**
 * Find fact text in the reader iframe document, wrap it in {@link WIKI_FACT_HIGHLIGHT_CLASS}, scroll into view.
 * @param {Document} doc
 * @param {string} factText
 * @returns {boolean}
 */
export function highlightFactTextInWikiDocument(doc, factText) {
  const root =
    doc.querySelector('.mw-parser-output') ||
    doc.querySelector('article') ||
    doc.body
  if (!root) return false

  const range = findFactTextRange(doc, root, factText)
  if (!range || range.collapsed) return false

  ensureHighlightStyles(doc)
  const mark = doc.createElement('mark')
  mark.className = WIKI_FACT_HIGHLIGHT_CLASS

  try {
    range.surroundContents(mark)
  } catch {
    try {
      const contents = range.extractContents()
      mark.appendChild(contents)
      range.insertNode(mark)
    } catch {
      return false
    }
  }

  mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}
