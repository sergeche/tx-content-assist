import ContentAssist from './ContentAssist.js';
import ContentAssistProcessor from './ContentAssistProcessor.js';
import TextViewer from './TextViewer.js';

/**
 * Basic content assist provides words proposal based on dictionary
 */
export default class BasicContentAssist {
    /**
     * @param {HTMLTextAreaElement} textarea Textarea element where you need to show content assist
     * @param {string[]} words Proposals (strings)
     * @param {Partial<import('./ContentAssist').ContentAssistOptions>} [options] Options for `ContentAssist` object
     */
    constructor(textarea, words, options) {
        this.viewer = new TextViewer(textarea);
        this.processor = new ContentAssistProcessor(words);
        this.contentAssist = new ContentAssist(this.viewer, this.processor, options);
    }
}
