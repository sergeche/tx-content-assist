/**
 * A content assist processor proposes completions and computes context
 * information for a particular character offset. This interface is similar to
 * Eclipse's IContentAssistProcessor
 */
import CompletionProposal from './CompletionProposal.js';

/**
 * @typedef {import('./TextViewer').default} TextViewer
 */

export default class ContentAssistProcessor {
    /**
     * @param {string[]} [words]
     */
    constructor(words) {
        /** @type {Record<string, string[]>} */
        this.words = {};

        if (words) {
            this.setWords(words);
        }
    }

    /**
     * Returns a list of completion proposals based on the specified location
     * within the document that corresponds to the current cursor position
     * within the text viewer.
     *
     * @param {TextViewer} viewer The viewer whose document is used to compute
     * the proposals
     *
     * @param {number} offset An offset within the document for which
     * completions should be computed
     *
     * @return {CompletionProposal[]}
     */
    computeCompletionProposals(viewer, offset) {
        let curOffset = offset - 1;
        let curWord = '';
        let curChar = '';

        // search for word prefix
        while (curOffset >= 0 && this.isAllowedChar(curChar = viewer.getChar(curOffset))) {
            curWord = curChar + curWord;
            curOffset--;
        }

        // search for right word's bound
        let rightBound = offset;
        while (rightBound < 1000 && this.isAllowedChar(viewer.getChar(rightBound))) {
            rightBound++;
        }

        /** @type {CompletionProposal[]} */
        const proposals = [];

        for (const s of this.suggestWords(curWord)) {
            const proposal = this.completionProposalFactory(s, offset - curWord.length, rightBound - curOffset - 1, offset - curWord.length + s.length);
            if (proposal) {
                proposals.push(proposal);
            }
        }

        return proposals;
    }

    /**
     * @param {String} str The actual string to be inserted into the document
     * @param {Number} offset The offset of the text to be replaced
     * @param {Number} length The length of the text to be replaced
     * @param {Number} cursor The position of the cursor following the insert
     * @return {CompletionProposal | void}
     */
    completionProposalFactory(str, offset, length, cursor) {
        return new CompletionProposal(str, offset, length, cursor);
    }

    /**
     * Check if passed character is allowed for word bounds
     * @param {string} ch
     * @return {boolean}
     */
    isAllowedChar(ch) {
        if (!ch) {
            return false;
        }

        return !/[\s\.,\!\?\#%\^\$\(\)\{\}<>'"«»]/.test(ch);
    }

    /**
     * @param {string[]} words
     */
    setWords(words) {
        /** @type {Record<string, string[]>} */
        const lookup = {};

        for (const word of words) {
            // index words by first letter for faster search
            const ch = word[0];
            if (ch in lookup) {
                lookup[ch].push(word);
            } else {
                lookup[ch] = [word];
            }
        }

        this.words = lookup;
    }

    /**
     * Returns suggested code assist proposals for prefix
     * @param {string} prefix Word prefix
     * @return {string[]}
     */
    suggestWords(prefix) {
        /** @type {string[]} */
        const result = [];

        if (prefix) {
            const firstCh = prefix[0];
            const prefixLen = prefix.length;

            if (firstCh in this.words) {
                for (const word of this.words[firstCh]) {
                    if (word.length > prefixLen && word.startsWith(prefix)) {
                        result.push(word);
                    }
                }
            }
        }

        return result;
    }
}
