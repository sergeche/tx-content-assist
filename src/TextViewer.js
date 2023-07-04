/**
 * Wrapper for textarea (or any other) element for convenient text manipulation
 */

import { createElement, emptyElement } from './utils.js';

/**
 * @typedef {{ start: number, end: number }} Bounds
 * @typedef {{ text: string, height: number }} Line
 * @typedef {{ x: number,  y: number }} Pos
 */

const copyProps = [
    'fontFamily', 'fontSize', 'lineHeight', 'textIndent',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderLeftWidth', 'borderRightWidth', 'borderLeftStyle', 'borderRightStyle'
];

/** @type {Record<string, string>} */
const xmlChars = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;'
};

const LF = 10; // \n
const CR = 13; // \r

/**
 * Find start and end index of text line for `from` index
 * @param {string} text
 * @param {number} from
 * @returns {Bounds}
 */
function findNewlineBounds(text, from) {
    const len = text.length;
    let start = from;
    let end = from;

    // search left
    while (start > 0 && !isNewline(text.charCodeAt(start - 1))) {
        start--;
    }

    // search right
    while (end < len && !isNewline(text.charCodeAt(end))) {
        end++;
    }

    return { start, end };
}

/**
 * Check if given character code is a newline
 * @param {number} code
 * @returns {boolean}
 */
function isNewline(code) {
    return code === LF || code === CR;
}

/**
 * Sanitazes string for size measurement
 * @param {string} str
 * @return {string}
 */
function sanitizeString(str) {
    return str.replace(/[<>&]/g, s => xmlChars[s]);
}

/**
 * Split text into lines. Set `remove_empty` to true to filter
 * empty lines
 * @param {string} text
 * @param {boolean} [removeEmpty]
 * @return {string[]}
 */
function splitByLines(text, removeEmpty) {
    const lines = text.replace(/\n?\r/g, '\n').split('\n');
    return removeEmpty
        ? lines.filter(line => line.trim())
        : lines;
}

/**
 * Creates text measurer for textarea
 * @param {HTMLTextAreaElement} textarea
 * @return {HTMLElement}
 */
function createMeasurer(textarea) {
    const measurer = createElement('div', 'tx-ca-measurer');
    const style = getComputedStyle(textarea);

    // copy properties
    for (const prop of copyProps) {
        // @ts-ignore
        measurer.style[prop] = style[prop];
    }

    textarea.before(measurer);
    return measurer;
}

/**
 * Stores and revalidetes text line heights. The problem of getting line
 * height is that a single line could be spanned across multiple lines.
 * It this case we can't use <code>line-height</code> CSS property, we
 * need to calculate real line height
 * @class
 *
 * @param {Element} measurer
 */
class LineCacher {
    /**
     * @param {HTMLElement} measurer
     */
    constructor(measurer) {
        this.measurer = measurer;
        this.width = measurer.clientWidth;
        /** @type {Line[]} */
        this.lines = [];
    }

    /**
     * Returns line position in pixels in passed text
     * @param {number} lineNum Line index (starting from 0) to get offset
     * @param {string} text
     * @return {number} Offset in pixels
     */
    getLineOffset(lineNum, text) {
        if (!lineNum) {
            return 0;
        }

        const m = this.measurer;
        const width = m.clientWidth;
        const forceRecalc = width !== this.width;
        const lines = splitByLines(text);
        const style = getComputedStyle(m);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        let totalHeight = 0;

        for (let i = 0, il = Math.min(lines.length, lineNum); i < il; i++) {
            const line = lines[i];
            if (forceRecalc || !this.lines[i] || this.lines[i].text !== line) {
                m.innerHTML = sanitizeString(line || '&nbsp;');
                this.lines[i] = {
                    text: line,
                    height: m.offsetHeight - padding
                };
            }

            totalHeight += this.lines[i].height;
        }

        this.width = width;
        return totalHeight;
    }

    /**
     * Reset lines cache
     */
    reset() {
        this.lines.length = 0;
    }
}

export default class TextViewer {
    /**
     * @param {HTMLTextAreaElement} textarea
     */
    constructor(textarea) {
        this.textarea = textarea;
        this._measurer = createMeasurer(textarea);
        this.updateMeasurerSize();
        this.line_cacher = new LineCacher(this._measurer);

        let lastLength = -1;
        /** @type {string | null} */
        let lastValue = null;

        const handleChange = () => {
            const val = textarea.value;
            if (val.length !== lastLength || val !== lastValue) {
                lastLength = val.length;
                lastValue = val;
                textarea.dispatchEvent(new CustomEvent('tx-modify'));
            }
        };

        textarea.addEventListener('change', handleChange);
        textarea.addEventListener('keyup', handleChange);

        const observer = new ResizeObserver(() => this.updateMeasurerSize());
        observer.observe(textarea);

        this.dispose = () => {
            textarea.removeEventListener('change', handleChange);
            textarea.removeEventListener('keyup', handleChange);
            observer.disconnect();
        };
    }

    /**
     * Returns current selection range of textarea
     * @returns {Bounds}
     */
    getSelectionRange() {
        return {
            start: this.textarea.selectionStart,
            end: this.textarea.selectionEnd
        };
    }

    /**
     * Set selection range for textarea
     * @param {number} start
     * @param {number} [end]
     */
    setSelectionRange(start, end = start) {
        this.textarea.setSelectionRange(start, end);
    }

    /**
     * Returns current caret position
     * @return {number}
     */
    getCaretPos() {
        const selection = this.getSelectionRange();
        return selection ? selection.start : -1;
    }

    /**
     * Set current caret position
     * @param {number} pos
     */
    setCaretPos(pos) {
        this.setSelectionRange(pos);
    }

    /**
     * Get textare content
     * @return {string}
     */
    getContent() {
        return this.textarea.value;
    }

    /**
     * Update measurer size
     */
    updateMeasurerSize() {
        /** @type {(keyof CSSStyleDeclaration)[]} */
        const props = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];
        const style = getComputedStyle(this.textarea);
        let offset = 0;

        for (const prop of props) {
            offset += parseFloat(/** @type {string} */(style[prop]));
        }

        this._measurer.style.width = `${this.textarea.clientWidth - offset}px`;
    }

    /**
     * Returns character pixel position relative to textarea element
     * @param {number} offset Character index
     * @returns {{x: number, y: number}}
     */
    getCharacterCoords(offset) {
        const content = this.getContent();
        const lineBounds = findNewlineBounds(content, offset);

        this._measurer.innerHTML = sanitizeString(content.substring(lineBounds.start, offset)) + '<i>' + (this.getChar(offset) || '.') + '</i>';
        /** @type {HTMLElement} */
        var beacon = this._measurer.getElementsByTagName('i')[0];

        /** @type {Pos} */
        const beaconPos = {
            x: beacon.offsetLeft,
            y: beacon.offsetTop
        };

        // find out current line index
        let curLine = splitByLines(content.substring(0, lineBounds.start)).length;
        curLine = Math.max(0, curLine - 1);
        let lineOffset = this.line_cacher.getLineOffset(curLine, content);

        emptyElement(this._measurer);

        return {
            x: beaconPos.x,
            y: beaconPos.y + lineOffset
        };
    }

    /**
     * Returns absolute (relative to first offsetParent of textarea) character
     * coordinates. You can use it to position popup element
     * @param {number} offset Character index
     * @returns {Pos}
     */
    getAbsoluteCharacterCoords(offset) {
        let pos = this.getCharacterCoords(offset);
        return {
            x: this.textarea.offsetLeft + pos.x - this.textarea.scrollLeft,
            y: this.textarea.offsetTop + pos.y - this.textarea.scrollTop
        };
    }

    /**
     * Returns character at offset
     * @param {number} offset
     * @return {string}
     */
    getChar(offset) {
        return this.getContent().charAt(offset);
    }

    /**
     * @return {HTMLTextAreaElement}
     */
    getElement() {
        return this.textarea;
    }

    /**
     * Replaces text substring with new value
     * @param {string} text
     * @param {number} [start]
     * @param {number} [end]
     */
    replaceText(text, start, end) {
        const hasStart = typeof start !== 'undefined';
        const hasEnd = typeof end !== 'undefined';
        const content = this.getContent();

        if (!hasStart && !hasEnd) {
            start = 0;
            end = content.length;
        } else if (!hasEnd) {
            end = start;
        }

        this.textarea.value = content.substring(0, start) + text + content.substring( /** @type {number} */(end));
    }
}
