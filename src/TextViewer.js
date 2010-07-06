/**
 * Wrapper for textarea (or any other) element for convenient text manipulation
 * @class
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "EventDispatcher.js"
 */
(function(){
	// different browser use different newlines, so we have to figure out
	// native browser newline and sanitize incoming text with it
	var tx = document.createElement('textarea');
	tx.value = '\n';
	var newline_char = tx.value;
	var has_pre_wrap = !tx.currentStyle; // pre-wrap in IE is not the same as in other browsers
	tx = null;
	
	var use_w3c = document.defaultView && document.defaultView.getComputedStyle,
		/**
		 * textarea element properties that should be copied to measurer
		 * on order to correctly calculate popup position
		 */
		copy_props = ('font-family,font-size,line-height,text-indent,' +
						'padding-top,padding-right,padding-bottom,padding-left,' +
						'border-left-width,border-right-width,border-left-style,border-right-style').split(','),
		xml_chars = {
			'<' : '&lt;',
			'>' : '&gt;',
			'&' : '&amp;'
		},
		ua = navigator.userAgent.toLowerCase(),
		line_breaker = ua.indexOf('msie 6') === -1 ? String.fromCharCode(8203) : '&shy;';
	
	/**
	 * Find start and end index of text line for <code>from</code> index
	 * @param {String} text 
	 * @param {Number} from 
	 */
	function findNewlineBounds(text, from) {
		var len = text.length,
			start = 0,
			end = len - 1;
		
		// search left
		for (var i = from - 1; i > 0; i--) {
			var ch = text.charAt(i);
			if (ch == '\n' || ch == '\r') {
				start = i + 1;
				break;
			}
		}
		// search right
		for (var j = from; j < len; j++) {
			var ch = text.charAt(j);
			if (ch == '\n' || ch == '\r') {
				end = j;
				break;
			}
		}
		
		return {start: start, end: end};
	}
	
	/**
	 * Sanitazes string for size measurement
	 * @param {String} str
	 * @return {String}
	 */
	function sanitizeString(str) {
		str = str.replace(/[<>&]/g, function(str) {
			return xml_chars[str];
		});
		return has_pre_wrap ? str : str.replace(/\s/g, '&nbsp;' + line_breaker);
	}
	
	/**
	 * Split text into lines. Set <code>remove_empty</code> to true to filter
	 * empty lines
	 * @param {String} text
	 * @param {Boolean} [remove_empty]
	 * @return {Array}
	 */
	function splitByLines(text, remove_empty) {
		// IE fails to split string by regexp, 
		// need to normalize newlines first
		// Also, Mozilla's Rhiho JS engine has a wierd newline bug
		var lines = (text || '')
			.replace(/\r\n/g, '\n')
			.replace(/\n\r/g, '\n')
			.split('\n');
		
		if (remove_empty) {
			for (var i = lines.length; i >= 0; i--) {
				if (!trim(lines[i]))
					lines.splice(i, 1);
			}
		}
		
		return lines;
	}
	
	/**
	 * Returns line number (0-based) for character position in text
	 * @param {String} text 
	 * @param {Number} pos
	 */
	function getLineNumber(text, pos) {
		var lines = text.split(newline_char),
			total_len = 0,
			nl_len = newline_char.length;
			
		for (var i = 0, il = lines.length; i < il; i++) {
			total_len += lines[i].length;
			if (i < il - 1)
				total_len += nl_len;
				
			if (pos < total_len)
				return i;
		}
		
		return -1;
	}
	
	/**
	 * Creates new element with class
	 * @param {String} name Element's name
	 * @param {String} class_name Element's class
	 * @return {Element}
	 */
	function createElement(name, class_name) {
		var elem = document.createElement(name);
		if (class_name)
			elem.className = class_name;
			
		return elem;
	}
	
	function toCamelCase(str) {
		return str.replace(/\-(\w)/g, function(str, p1) {
			return p1.toUpperCase();
		});
	}
	
	/**
	 * Returns value of CSS property <b>name</b> of element <b>elem</b>
	 * @author John Resig (http://ejohn.org)
	 * @param {Element} elem
	 * @param {String|Array} name
	 * @return {String|Object}
	 */
	function getCSS(elem, name, force_computed) {
		var cs, result = {}, n, name_camel, is_array = name instanceof Array;
	
		var rnumpx = /^-?\d+(?:px)?$/i,
			rnum = /^-?\d(?:\.\d+)?/,
			rsuf = /\d$/,
			ret,
			suffix;
	
		var _name = is_array ? name : [name];
		for (var i = 0, il = _name.length; i < il; i++) {
			n = _name[i];
			name_camel = toCamelCase(n);
	
			// If the property exists in style[], then it's been set
			// recently (and is current)
			if (!force_computed && elem.style[name_camel]) {
				result[n] = result[name_camel] = elem.style[name_camel];
			}
			// Or the W3C's method, if it exists
			else if (use_w3c) {
				if (!cs)
					cs = window.getComputedStyle(elem, "");
				result[n] = result[name_camel] = cs && cs.getPropertyValue(n);
			} else if ( elem.currentStyle ) {
				ret = elem.currentStyle[n] || elem.currentStyle[name_camel];
				var style = elem.style || elem;
				
				// From the awesome hack by Dean Edwards
				// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291
	
				// If we're not dealing with a regular pixel number
				// but a number that has a weird ending, we need to convert it to pixels
				if ( !rnumpx.test( ret ) && rnum.test( ret ) ) {
					// Remember the original values
					var left = style.left, rsLeft = elem.runtimeStyle.left;
	
					// Put in the new values to get a computed value out
					elem.runtimeStyle.left = elem.currentStyle.left;
					suffix = rsuf.test(ret) ? 'em' : '';
					style.left = name_camel === "fontSize" ? "1em" : (ret + suffix || 0);
					ret = style.pixelLeft + "px";
	
					// Revert the changed values
					style.left = left;
					elem.runtimeStyle.left = rsLeft;
				}
	
				result[n] = result[name_camel] = ret;
			}
		}
	
		return is_array ? result : result[toCamelCase(name)];
	}
	
	/**
	 * Sets new CSS propery values for element
	 * @param {Element} elem
	 * @param {Object} params
	 */
	function setCSS(elem, params) {
		if (!elem)
			return;
		
		var props = [],
			num_props = {'line-height': 1, 'z-index': 1, opacity: 1};
	
		for (var p in params) if (params.hasOwnProperty(p)) {
			var name = p.replace(/([A-Z])/g, '-$1').toLowerCase(),
				value = params[p];
			props.push(name + ':' + ((typeof(value) == 'number' && !(name in num_props)) ? value + 'px' : value));
		}
	
		elem.style.cssText += ';' + props.join(';');
	}
	
	/**
	 * Creates text measurer for textarea
	 * @param {Element} textarea
	 * @return Element
	 */
	function createMeasurer(textarea) {
		var measurer = createElement('div', 'tx-ca-measurer'),
			css_props = getCSS(textarea, copy_props);
			
		// copy properties
		for (var i = 0; i < copy_props.length; i++) {
			var prop = copy_props[i];
			measurer.style[toCamelCase(prop)] = css_props[prop];
		}
		
		textarea.parentNode.appendChild(measurer);
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
	function LineCacher(measurer) {
		this.measurer = measurer;
		this.width = measurer.clientWidth;
		this.lines = [];
	}
	
	LineCacher.prototype = {
		/**
		 * Returns line position in pixels in passed text
		 * @param {Number} line_num Line index (starting from 0) to get offset
		 * @param {String} text
		 * 
		 * @return {Number} Offset in pixels
		 */
		getLineOffset: function(line_num, text) {
			if (!line_num)
				return 0;
				
			var m = this.measurer,
				force_recalc = m.clientWidth != this.width,
				lines = splitByLines(text),
				affected_params = getCSS(m, ['padding-top', 'padding-bottom']),
				affected_size = parseFloat(affected_params['padding-top']) + parseFloat(affected_params['padding-bottom']), 
				line,
				total_height = 0;
				
			for (var i = 0, il = Math.min(lines.length, line_num); i < il; i++) {
				line = lines[i];
				if (force_recalc || !this.lines[i] || this.lines[i].text !== line) {
					m.innerHTML = sanitizeString(line || '&nbsp;');
					this.lines[i] = {
						text: line,
						height: m.offsetHeight - affected_size
					};
				}
				
				total_height += this.lines[i].height;
			}
			
			this.width = m.clientWidth;
			return total_height;
		},
		
		/**
		 * Reset lines cache
		 */
		reset: function() {
			this.lines = [];
		}
	};
	
	
	/**
	 * Object constructor
	 * @class
	 * @param {Element} textarea
	 */
	TextViewer = function(textarea) {
		this.textarea = textarea;
		this._measurer = createMeasurer(textarea);
		this.updateMeasurerSize();
		this.dispatcher = new EventDispatcher();
		this.line_cacher = new LineCacher(this._measurer);
		
		var last_length = -1, 
			last_value = null;
			
		var that = this;
		// watch for content modification
		// if we think it was modified, we'll send special "modify" event
		tx_utils.addEvent(textarea, 'change keyup', function(/* Event */ evt) {
			var val = textarea.value;
			if (val.length != last_length || val !== last_value) {
				that.dispatcher.dispatchEvent('modify');
				last_length = val.length;
				last_value = val;
			}
		});
		
		tx_utils.addEvent(window, 'focus resize', function(/* Event */ evt) {
			that.updateMeasurerSize();
		});
	};
	
	TextViewer.prototype = {
		/**
		 * Returns current selection range of textarea
		 */
		getSelectionRange: function() {
			if ('selectionStart' in this.textarea) { // W3C's DOM
				return {
					start: this.textarea.selectionStart, 
					end: this.textarea.selectionEnd 
				};
			} else if (document.selection) { // IE
				this.textarea.focus();
		 
				var range = document.selection.createRange();
				
				if (range === null) {
					return {
						start: 0, 
						end: this.getContent().length
					};
				}
		 
				var re = this.textarea.createTextRange();
				var rc = re.duplicate();
				re.moveToBookmark(range.getBookmark());
				rc.setEndPoint('EndToStart', re);
		 
				return {
					start: rc.text.length, 
					end: rc.text.length + range.text.length
				};
			} else {
				return null;
			}
		},
		
		/**
		 * Set selection range for textarea
		 * @param {Number} start
		 * @param {Number} [end]
		 */
		setSelectionRange: function(start, end) {
			if (typeof(end) == 'undefined')
				end = start;
				
			var target = this.textarea;
				
			// W3C's DOM
			if ('setSelectionRange' in target) {
				target.setSelectionRange(start, end);
			} else if ('createTextRange' in target) {
				var t = target.createTextRange();
				
				t.collapse(true);
				
				// IE has an issue with handling newlines while creating selection,
				// so we need to adjust start and end indexes
//				var delta = zen_coding.splitByLines(getContent().substring(0, start)).length - 1;
//				end -= delta + zen_coding.splitByLines(getContent().substring(start, end)).length - 1;
//				start -= delta;
				
				t.moveStart('character', start);
				t.moveEnd('character', end - start);
				t.select();
			}
		},
		
		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function() {
			var selection = this.getSelectionRange();
			return selection ? selection.start : null;
		},
		
		/**
		 * Set current caret position
		 * @param {Number} pos
		 */
		setCaretPos: function(pos) {
			this.setSelectionRange(pos);
		},
		
		/**
		 * Get textare content
		 * @return {String}
		 */
		getContent: function() {
			return this.textarea.value;
		},
		
		/**
		 * Update measurer size
		 */
		updateMeasurerSize: function() {
			var af_props = getCSS(this.getElement(), ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']),
				offset = parseInt(af_props['padding-left']) 
					+ parseInt(af_props['padding-right'])
					+ parseInt(af_props['border-left-width'])
					+ parseInt(af_props['border-right-width']);
			
			this._measurer.style.width = (this.textarea.clientWidth - offset) + 'px';
		},
		
		/**
		 * Returns character pixel position relative to textarea element
		 * @param {Number} offset Character index
		 * @returns object with <code>x</code> and <code>y</code> properties
		 */
		getCharacterCoords: function(offset) {
			var content = this.getContent(),
				line_bounds = findNewlineBounds(content, offset);
				
			this._measurer.innerHTML = sanitizeString(content.substring(line_bounds.start, offset)) + '<i>' + (this.getChar(offset) || '.') + '</i>';
			/** @type {Element} */
			var beacon = this._measurer.getElementsByTagName('i')[0],
				beacon_pos = {x: beacon.offsetLeft, y: beacon.offsetTop};
			
			// find out current line index
			var cur_line = splitByLines(content.substring(0, line_bounds.start)).length;
			cur_line = Math.max(0, cur_line - 1);
			var line_offset = this.line_cacher.getLineOffset(cur_line, content);
			
			tx_utils.emptyElement(this._measurer);
			
			return {
				x: beacon_pos.x,
				y: beacon_pos.y + line_offset
			};
		},
		
		/**
		 * Returns absolute (relative to first offsetParent of textarea) character
		 * coordinates. You can use it to position popup element
		 * @param {Number} offset Character index
		 * @returns object with <code>x</code> and <code>y</code> properties
		 */
		getAbsoluteCharacterCoords: function(offset) {
			var pos = this.getCharacterCoords(offset);
			return {
				x: this.textarea.offsetLeft + pos.x - this.textarea.scrollLeft,
				y: this.textarea.offsetTop + pos.y - this.textarea.scrollTop
			};
		},
		
		/**
		 * Returns character at offset
		 * @param {Number} offset
		 * @return {String}
		 */
		getChar: function(offset) {
			return this.getContent().charAt(offset);
		},
		
		/**
		 * @return {Element}
		 */
		getElement: function() {
			return this.textarea;
		},
		
		/**
		 * Replaces text substring with new value
		 * @param {String} text
		 * @param {Number} start  
		 * @param {Number} end  
		 */
		replaceText: function(text, start, end) {
			var has_start = (typeof start != 'undefined'),
				has_end = (typeof end != 'undefined'),
				content = this.getContent();
			
			if (!has_start && !has_end) {
				start = 0;
				end = content.length;
			} else if (!has_end) {
				end = start;
			}
			
			
			this.textarea.value = content.substring(0, start) + text + content.substring(end);
		},
		
		addEvent: function(type, fn){
			var items = type.split(/\s+/),
				elem = this.getElement();
				
			for (var i = 0, il = items.length; i < il; i++) {
				if (items[i].toLowerCase() == 'modify') {
					this.dispatcher.addEventListener('modify', fn);
				} else {
					tx_utils.addEvent(elem, type, fn);
				}
			}
		},
		
		removeEvent: function(type, fn) {
			var items = type.split(/\s+/),
				elem = this.getElement();
				
			for (var i = 0, il = items.length; i < il; i++) {
				if (items[i].toLowerCase() == 'modify') {
					this.dispatcher.removeEventListener('modify', fn);
				} else {
					tx_utils.removeEvent(elem, type, fn);
				}
			}
		}
	};
	
//	window.TextViewer;
})();