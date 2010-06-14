/**
 * Basic content assist provides words proposal based on dictionary
 * @class
 * @param {Element} textarea Textarea element where you need to show content assist
 * @param {Array} words Proposals (strings)
 * @param {Object} [options] Options for <code>ContentAssist</code> object
 * 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */function BasicContentAssist(textarea, words, options) {
	this.viewer = new TextViewer(textarea);
	this.processor = new ContentAssistProcessor(words);
	this.content_assist = new ContentAssist(this.viewer, this.processor, options);
}