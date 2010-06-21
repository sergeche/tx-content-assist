/**
 * Content assist provider for TextViewer
 * @class
 * @param {TextViewer} viewer
 * @param {ContentAssistProcessor} processor
 * @param {Object} [options]
 * 
 * @include "ContentAssistProcessor.js"
 * @include "CompletionProposal.js"
 * @include "TextViewer.js"
 * @include "tx_utils.js"
 */
function ContentAssist(viewer, processor, options) {
	this.viewer = viewer;
	this.options = {
		visible_items: 10
	};
	
	this.setProcessor(processor);
	this.setOptions(options);
	
	// create content assist popup
	this.popup = tx_utils.createElement('div', 'tx-ca-popup');
	this.popup_content = tx_utils.createElement('div', 'tx-ca-popup-content');
	this.additional_info = tx_utils.createElement('div', 'tx-ca-additional-info');
	
	this.popup.appendChild(this.popup_content);
	this.popup.appendChild(this.additional_info);
	
	viewer.getElement().parentNode.appendChild(this.popup);
	
	/** @type {ContentAssistProcessor} */
	this.processor = null;
	this.is_visible = false;
	this.last_proposals = [];
	this.is_hover_locked = false,
	this.hover_lock_timeout = null;
	this.selected_class = 'tx-proposal-selected';
	
	/** Currently selected proposal's index */
	this.selected_proposal = 0;
	
	if (processor)
		this.setProcessor(processor);
	
	var popup = this.popup,
		popup_content = this.popup_content,
		that = this;
		
	this.hidePopup();
	
	viewer.addEvent('modify', function(/* Event */ evt) {
		that.showContentAssist(evt);
	});
	
	var is_opera = !!window.opera,
		is_mac = /mac\s+os/i.test(navigator.userAgent),
		is_opera_mac = is_opera && is_mac;
		
	function stopEvent(evt) {
		if (evt.preventDefault)
			evt.preventDefault();
		else
			evt.returnValue = false;
	}
		
	viewer.addEvent(is_opera ? 'keypress' : 'keydown', function(/* Event */ evt) {
		evt = tx_utils.normalizeEvent(evt);
		if (that.is_visible) {
			switch (evt.keyCode) {
				case 38: //up
					that.selectProposal(Math.max(that.selected_proposal - 1, 0));
					that.lockHover();
					evt.preventDefault();
					break;
				case 40: //down
					that.selectProposal(Math.min(that.selected_proposal + 1, popup_content.childNodes.length - 1));
					that.lockHover();
					evt.preventDefault();
					break;
				case 13: //enter
					that.applyProposal(that.selected_proposal);
					that.hidePopup();
					evt.preventDefault();
					break;
				case 27: // escape
					that.hidePopup();
					evt.preventDefault();
					break;
			}
		} else if (evt.keyCode == 32 && (evt.ctrlKey && !is_opera_mac || evt.metaKey && is_opera_mac || evt.altKey)) { // ctrl+space or alt+space
			// explicitly show content assist
			that.showContentAssist();
			evt.preventDefault();
		}
	});
	
	var dont_hide = false;
	
	viewer.addEvent('blur', function() {
		// use delayed execution in to handle popup click event correctly
		that.hide_timeout = setTimeout(function() {
			if (!dont_hide) that.hidePopup();
			dont_hide = false;
		}, 200);
	});
	
	// delegate hover event: hilight proposal
	tx_utils.addEvent(popup_content, 'mouseover', function(/* Event */ evt) {
		if (that.is_hover_locked)
			return;
			
		evt = tx_utils.normalizeEvent(evt);
		var target = that.searchProposal(evt.target);
		
		if (target) {
			var ix = that.findProposalIx(target);
			if (ix != -1)
				that.selectProposal(ix, true);
		}
	});
	
	// delegate click event: apply proposal
	tx_utils.addEvent(popup_content, 'click', function(/* Event */ evt) {
		evt = tx_utils.normalizeEvent(evt);
		var target = that.searchProposal(evt.target);
		if (target) {
			var ix = that.findProposalIx(target);
			if (ix != -1) {
				that.applyProposal(ix);
				that.hidePopup();
			}
		}
	});
	
	tx_utils.addEvent(popup_content, 'mousedown', function(/* Event */ evt) {
		evt = tx_utils.normalizeEvent(evt);
		evt.preventDefault();
		evt.stopPropagation();
		dont_hide = true;
		return false;
	});
	
	tx_utils.addEvent(document, 'mousedown', function(/* Event */ evt) {
		that.hidePopup();
	});
	
	tx_utils.addEvent(this.additional_info, 'scroll', function(/* Event */ evt) {
		that.hideAdditionalInfo();
	});
}

ContentAssist.prototype = {
	/**
	 * @param {ContentAssistProcessor} processor
	 */
	setProcessor: function(processor) {
		this.processor = processor;
	},
	
	/**
	 * Set new content assist popup options
	 * @param {Object} opt
	 */
	setOptions: function(opt) {
		if (opt) {
			for (var p in this.options) if (this.options.hasOwnProperty(p)) {
				if (p in opt) 
					this.options[p] = opt[p];
			}
		}
	},
	
	/**
	 * Search for proposal element traversing up to the tree
	 * @param {Element} elem
	 * @return {Element}
	 */
	searchProposal: function(elem) {
		do {
			if (tx_utils.hasClass(elem, 'tx-proposal'))
				break;
		} while (elem = elem.parentNode);
		
		return elem;
	},
	
	/**
	 * Search for proposal's element index in parent
	 * @param {Element} proposal
	 * @return {Number}
	 */
	findProposalIx: function(proposal) {
		var result = -1,
			props = proposal.parentNode.childNodes;
			
		for (var i = 0, il = props.length; i < il; i++) {
			if (props[i] == proposal) {
				result = i;
				break;
			}
		}
		
		return result;
	},
	
	applyProposal: function(ix) {
		if (this.popup_content.childNodes[ix]) {
			this.last_proposals[ix].apply(this.viewer);
		}
	},
	
	showPopup: function(x, y) {
		this.popup.style.display = 'block';
		this.popup.style.top = y + 'px';
		this.popup.style.width = '';
		
		// make some adjustments so popup won't appear outside the TextViewer box
		var elem = this.viewer.getElement();
		x = Math.min(elem.offsetLeft + elem.offsetWidth - this.popup.offsetWidth, x);
		this.popup.style.left = x + 'px';
		
		this.popup.style.width = this.popup_content.offsetWidth + 'px';
		
		this.is_visible = true;
		this.lockHover();
	},
	
	hidePopup: function() {
		this.popup.style.display = 'none';
		this.hideAdditionalInfo();
		this.is_visible = false;
	},
	
	/**
	 * Temporary lock popup hover events.
	 * Hover lock is used to prevent accident mouseover event callback when
	 * mouse cursor is over popup window and user traverses between proposals
	 * with arrow keys
	 */
	lockHover: function() {
		if (this.hover_lock_timeout)
			clearTimeout(this.hover_lock_timeout);
		
		this.is_hover_locked = true;
		var that = this;
		setTimeout(function() {
			that.is_hover_locked = false;
		}, 100);
	},
	
	/**
	 * Calculate content assist proposals and show popup
	 */
	showContentAssist: function() {
		if (this.processor) {
			var proposals = this.processor.computeCompletionProposals(this.viewer, this.viewer.getCaretPos());
			if (proposals) {
				var last_offset = 0,
					popup_height = 0,
					total_height = 0;
					
				// temporary show popup element for height calculations
				this.popup.style.display = 'block';
				tx_utils.emptyElement(this.popup_content);
				
				for (var i = 0, il = proposals.length; i < il; i++) {
					var proposal_elem = proposals[i].toHtml();
					this.popup_content.appendChild(proposal_elem);
					last_offset = proposals[i].offset;
					
					if (this.options.visible_items > 0 && i < this.options.visible_items) {
						popup_height += proposal_elem.offsetHeight;
					}
					
					total_height += proposal_elem.offsetHeight;
				}
				
				if (total_height > popup_height)
					tx_utils.addClass(this.popup, 'tx-ca-popup-overflow');
				else
					tx_utils.removeClass(this.popup, 'tx-ca-popup-overflow');
				
				var coords = this.viewer.getAbsoluteCharacterCoords(last_offset);
				this.showPopup(coords.x, coords.y);
				this.popup_content.style.height = popup_height ? popup_height + 'px' : 'auto';
				this.last_proposals = proposals;
				
				this.selected_proposal = 0;
				this.selectProposal(this.selected_proposal);
			} else {
				this.hidePopup();
			}
		}
	},
	
	/**
	 * Shows additional info for given proposal
	 * @private
	 * @param {Number} ix
	 */
	showAdditionalInfo: function(ix) {
		/** @type {CompletionProposal} */
		var proposal = this.last_proposals[ix];
		if (proposal && proposal.getAdditionalInfo()) {
			var proposal_elem = this.popup_content.childNodes[ix],
				elem = this.additional_info;
			
			elem.innerHTML = proposal.getAdditionalInfo();
			tx_utils.removeClass(elem, 'tx-ca-additional-info-left');
			tx_utils.setCSS(elem, {
				display: 'block',
				top: proposal_elem.offsetTop - this.popup_content.scrollTop
			});
			
			// make sure that additional info window is not outside TextViewer's bounds
			var viewer = this.viewer.getElement();
			if (elem.offsetLeft + elem.offsetWidth + this.popup.offsetLeft > viewer.offsetLeft + viewer.offsetWidth) {
				tx_utils.addClass(elem, 'tx-ca-additional-info-left');
			}
		}
	},
	
	/**
	 * Hide additional info window
	 */
	hideAdditionalInfo: function() {
		tx_utils.setCSS(this.additional_info, {display: 'none'});
	},
	
	/**
	 * Select proposal in popup window
	 * @param {Number} ix Proposal index (0-based)
	 * @param {boolean} [no_scroll] Don't scroll proposal into view 
	 */
	selectProposal: function(ix, no_scroll) {
		if (this.popup_content.childNodes[this.selected_proposal])
			tx_utils.removeClass(this.popup_content.childNodes[this.selected_proposal], this.selected_class);
			
		if (this.popup_content.childNodes[ix]) {
			var proposal = this.popup_content.childNodes[ix];
			tx_utils.addClass(proposal, this.selected_class);
			
			if (!no_scroll) {
				// make sure that selected proposal is visible
				var proposal_top = proposal.offsetTop,
					proposal_height = proposal.offsetHeight,
					popup_scroll = this.popup_content.scrollTop,
					popup_height = this.popup_content.offsetHeight;
					
				if (proposal_top < popup_scroll) {
					this.popup_content.scrollTop = proposal_top;
				} else if (proposal_top + proposal_height > popup_scroll + popup_height) {
					this.popup_content.scrollTop = proposal_top + proposal_height - popup_height;
				}
			}
			
			this.showAdditionalInfo(ix);
		}
			
		this.selected_proposal = ix;
	}
};