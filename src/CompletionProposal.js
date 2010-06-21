/**
 * Completition proposal
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @param {String} str The actual string to be inserted into the document
 * @param {Number} offset The offset of the text to be replaced
 * @param {Number} length The length of the text to be replaced
 * @param {Number} cursor The position of the cursor following the insert 
 * relative to <code>offset</code>
 * 
 * @include "TextViewer.js"
 */function CompletionProposal(str, offset, length, cursor, additional_info) {
	this.str = str;
	this.offset = offset;
	this.len = length;
	this.cursor = cursor;
	this.additional_info = additional_info || '';
}

CompletionProposal.prototype = {
	/**
	 * Returns the string to be displayed in the list of completion proposals.
	 * @return {String}
	 */
	getDisplayString: function() {
		return this.str.toString();
	},
	
	/**
	 * Returns proposal's additional info which will be shown when proposal
	 * is selected
	 * @return {String}
	 */
	getAdditionalInfo: function() {
		return this.additional_info;
	},
	
	/**
	 * Inserts the proposed completion into the given document
	 * @param {TextViewer} viewer
	 */
	apply: function(viewer) {
		viewer.replaceText(this.str.toString(), this.offset, this.offset + this.len);
		viewer.setCaretPos(this.cursor);
	},
	
	toString: function() {
		return this.str.toString();
	},
	
	/**
	 * Create DOM node for proposal
	 * @return {}
	 */
	toHtml: function() {
		var elem = document.createElement('div');
		elem.className = 'tx-proposal';
		
		elem.appendChild( document.createTextNode(this.getDisplayString()) );
		
		return elem;
	}
};