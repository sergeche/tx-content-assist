/**
 * A content assist processor proposes completions and computes context 
 * information for a particular character offset. This interface is similar to
 * Eclipse's IContentAssistProcessor
 * @class
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "TextViewer.js"
 * @include "CompletitionProposal.js"
 */function ContentAssistProcessor(words) {
	if (words)
		this.setWords(words);
}

ContentAssistProcessor.prototype = {
	/**
	 * Returns a list of completion proposals based on the specified location 
	 * within the document that corresponds to the current cursor position 
	 * within the text viewer.
	 * 
	 * @param {TextViewer} viewer The viewer whose document is used to compute 
	 * the proposals
	 * 
	 * @param {Number} offset An offset within the document for which 
	 * completions should be computed
	 * 
	 * @return {CompletitionProposal[]}
	 */
	computeCompletionProposals: function(viewer, offset) {
		var cur_offset = offset - 1,
			cur_word = '',
			cur_char = '';
			
		// search for word prefix
		while (cur_offset >= 0 && this.isAllowedChar(cur_char = viewer.getChar(cur_offset))) {
			cur_word = cur_char + cur_word;
			cur_offset--;
		}
		
		// search for right word's bound
		var right_bound = offset;
		while (right_bound < 1000 && this.isAllowedChar(viewer.getChar(right_bound))) {
			right_bound++;
		}
		
		var proposals = null,
			suggestions = this.suggestWords(cur_word);
			
		if (suggestions.length) {
			proposals = [];
			
			for (var i = 0, il = suggestions.length; i < il; i++) {
				var s = suggestions[i];
				var proposal = this.completitionProposalFactory(s, offset - cur_word.length, right_bound - cur_offset - 1, offset - cur_word.length + s.length);
				proposals.push(proposal);
			}
		}
		
		return proposals;
	},
	
	/**
	 * @param {String} str The actual string to be inserted into the document
	 * @param {Number} offset The offset of the text to be replaced
	 * @param {Number} length The length of the text to be replaced
	 * @param {Number} cursor The position of the cursor following the insert
	 * @return {CompletionProposal}
	 */
	completitionProposalFactory: function(str, offset, length, cursor) {
		return new CompletionProposal(str, offset, length, cursor);
	},
	
	/**
	 * Returns the characters which when entered by the user should 
	 * automatically trigger the presentation of possible completions.
	 * @return {String}
	 */
	getActivationChars: function() {
		return 'abcdefghijklmnopqrstuvwxyz!@$';
	},
	
	isAllowedChar: function(ch) {
		ch = String(ch);
		if (!ch) return false;
		
		var char_code = ch.charCodeAt(0),
			special_chars = ':@!.#-_';
		
		return (char_code > 64 && char_code < 91)       // uppercase letter
				|| (char_code > 96 && char_code < 123)  // lowercase letter
				|| (char_code > 47 && char_code < 58)   // number
				|| special_chars.indexOf(ch) != -1;     // special character
	
	},
	
	setWords: function(words) {
		this.words = words;
	},
	
	/**
	 * Returs suggested code assist proposals for prefix
	 * @param {String} prefix Word prefix
	 * @return {Array}
	 */
	suggestWords: function(prefix) {
		prefix = String(prefix);
		var result = [];
			
		if (prefix && this.words) {
			for (var i = 0, il = this.words.length; i < il; i++) {
				var word = this.words[i];
				if (word.indexOf(prefix) === 0 && word.length > prefix.length)
					result.push(word);
			}
		}
		
		return result;
	}
}