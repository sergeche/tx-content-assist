import { createElement } from './utils.js';

/**
 * Completion proposal
 */
export default class CompletionProposal {
    /**
     * @param {string} str The actual string to be inserted into the document
     * @param {number} offset The offset of the text to be replaced
     * @param {number} length The length of the text to be replaced
     * @param {number} cursor The position of the cursor following the insert
     * relative to `offset`
     * @param {string} [additionalInfo]
     */
    constructor(str, offset, length, cursor, additionalInfo = '') {
        this.str = str;
        this.offset = offset;
        this.len = length;
        this.cursor = cursor;
        this.additional_info = additionalInfo;
    }

    /**
	 * Returns the string to be displayed in the list of completion proposals.
	 * @return {string}
	 */
	getDisplayString() {
		return this.str.toString();
	}

	/**
	 * Returns proposal's additional info which will be shown when proposal
	 * is selected
	 * @return {string}
	 */
	getAdditionalInfo() {
		return this.additional_info;
	}

	/**
	 * Inserts the proposed completion into the given document
	 * @param {import('./TextViewer').default} viewer
	 */
	apply(viewer) {
		viewer.replaceText(this.str.toString(), this.offset, this.offset + this.len);
		viewer.setCaretPos(this.cursor);
	}

	toString() {
		return this.str.toString();
	}

	/**
	 * Create DOM node for proposal
	 * @return {HTMLElement}
	 */
	toHtml() {
        const elem = createElement('div', 'tx-proposal');
        elem.innerText = this.getDisplayString();
		return elem;
	}
}
