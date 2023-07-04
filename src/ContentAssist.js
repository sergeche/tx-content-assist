/**
 * @typedef {import('./TextViewer.js').default} TextViewer
 * @typedef {import('./ContentAssistProcessor.js').default} ContentAssistProcessor
 * @typedef {import('./CompletionProposal.js').default} CompletionProposal
 * @typedef {{ visibleItems: number }} ContentAssistOptions
 */

import { createElement, emptyElement } from './utils.js';

/**
 * Content assist provider for TextViewer
 */
export default class ContentAssist {
    /**
     * @param {TextViewer} viewer
     * @param {ContentAssistProcessor} processor
     * @param {Partial<ContentAssistOptions>} [options]
     */
    constructor(viewer, processor, options) {
        this.viewer = viewer;
        this.processor = processor;
        /** @type {ContentAssistOptions} */
        this.options = {
            visibleItems: 10,
            ...options
        };

        this.isVisible = false;
        /** @type {CompletionProposal[]} */
        this.lastProposals = [];
        this.isHoverLocked = false;
        this.hoverLockTimeout = 0;
        this.hideTimeout = 0;
        this.selectedClass = 'tx-proposal-selected';

        /** Currently selected proposal's index */
        this.selectedProposal = 0;

        // create content assist popup
        this.popup = createElement('div', 'tx-ca-popup');
        this.popupContent = createElement('div', 'tx-ca-popup-content');
        this.additionalInfo = createElement('div', 'tx-ca-additional-info');

        this.popup.append(this.popupContent);
        this.popup.append(this.additionalInfo);

        viewer.getElement().after(this.popup);

        const { popupContent, additionalInfo } = this;
        let dontHide = false;

        const viewerElem = viewer.getElement();

        viewerElem.addEventListener('tx-modify', () => this.showContentAssist());

        viewerElem.addEventListener('keydown', evt => {
            if (!this.isVisible) {
                if (evt.key == 'Space' && (evt.ctrlKey || evt.metaKey)) { // ctrl+space or cmd+space
                    // explicitly show content assist
                    this.showContentAssist();
                    evt.preventDefault();
                }
                return;
            }

            switch (evt.key) {
                case 'ArrowUp':
                    this.selectProposal(Math.max(this.selectedProposal - 1, 0));
                    this.lockHover();
                    evt.preventDefault();
                    break;
                case 'ArrowDown': //down
                    this.selectProposal(Math.min(this.selectedProposal + 1, popupContent.childNodes.length - 1));
                    this.lockHover();
                    evt.preventDefault();
                    break;
                case 'Enter': //enter
                    this.applyProposal(this.selectedProposal);
                    this.hidePopup();
                    evt.preventDefault();
                    break;
                case 'Escape':
                    this.hidePopup();
                    evt.preventDefault();
                    break;
            }
        });

        viewerElem.addEventListener('blur', () => {
            // use delayed execution in to handle popup click event correctly
            this.hideTimeout = setTimeout(() => {
                if (!dontHide) {
                    this.hidePopup();
                    dontHide = false;
                }
            }, 200);
        });

        // delegate hover event: highlight proposal
        popupContent.addEventListener('mouseover', evt => {
            if (this.isHoverLocked) {
                return;
            }

            const target = this.searchProposal(/** @type {Element} */(evt.target));

            if (target) {
                const ix = this.findProposalIx(target);
                if (ix !== -1) {
                    this.selectProposal(ix, true);
                }
            }
        });

        // delegate click event: apply proposal
        popupContent.addEventListener('click', evt => {
            const target = this.searchProposal(/** @type {Element} */(evt.target));
            if (target) {
                const ix = this.findProposalIx(target);
                if (ix != -1) {
                    this.applyProposal(ix);
                    this.hidePopup();
                }
            }
        });

        popupContent.addEventListener('mousedown', evt => {
            evt.preventDefault();
            evt.stopPropagation();
            dontHide = true;
            return false;
        });

        document.addEventListener('mousedown', () => this.hidePopup());
        additionalInfo.addEventListener('scroll', () => this.hideAdditionalInfo());

        this.hidePopup();
    }

    /**
     * Search for proposal element traversing up to the tree
     * @param {Element} elem
     * @return {Element | null}
     */
    searchProposal(elem) {
        return elem.closest('.tx-proposal');
    }

    /**
     * Search for proposal's element index in parent
     * @param {Element} proposal
     * @return {number}
     */
    findProposalIx(proposal) {
        const props = proposal.parentNode?.childNodes;
        if (props) {
            for (let i = 0; i < props.length; i++) {
                if (props[i] === proposal) {
                    return i;
                }
            }
        }

        return -1;
    }

    /**
     * @param {number} ix
     */
    applyProposal(ix) {
        if (this.popupContent.childNodes[ix]) {
            this.lastProposals[ix]?.apply(this.viewer);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    showPopup(x, y) {
        // make some adjustments so popup won't appear outside the TextViewer box
        const elem = this.viewer.getElement();
        const popupContentWidth = this.popupContent.offsetWidth;
        x = Math.min(elem.offsetLeft + elem.offsetWidth - this.popup.offsetWidth, x);

        this.popup.style.display = 'block';
        this.popup.style.left = `${x}px`;
        this.popup.style.top = `${y}px`;
        this.popup.style.width = `${popupContentWidth}px`;

        this.isVisible = true;
        this.lockHover();
    }

    hidePopup() {
        this.popup.style.display = 'none';
        this.hideAdditionalInfo();
        this.isVisible = false;
    }

    /**
     * Temporary lock popup hover events.
     * Hover lock is used to prevent accident mouseover event callback when
     * mouse cursor is over popup window and user traverses between proposals
     * with arrow keys
     */
    lockHover() {
        if (this.hoverLockTimeout) {
            clearTimeout(this.hoverLockTimeout);
            this.hoverLockTimeout = 0;
        }

        this.isHoverLocked = true;
        setTimeout(() => this.isHoverLocked = false, 100);
    }

    /**
     * Calculate content assist proposals and show popup
     */
    showContentAssist() {
        if (this.processor) {
            const proposals = this.processor.computeCompletionProposals(this.viewer, this.viewer.getCaretPos());
            if (proposals.length) {
                let lastOffset = 0;
                let popupHeight = 0;
                let totalHeight = 0;

                // temporary show popup element for height calculations
                this.popup.style.display = 'block';
                emptyElement(this.popupContent);

                for (let i = 0; i < proposals.length; i++) {
                    const proposal = proposals[i];
                    const proposalElem = proposal.toHtml();
                    this.popupContent.appendChild(proposalElem);
                    lastOffset = proposal.offset;

                    if (this.options.visibleItems > 0 && i < this.options.visibleItems) {
                        popupHeight += proposalElem.offsetHeight;
                    }

                    totalHeight += proposalElem.offsetHeight;
                }

                this.popup.classList.toggle('tx-ca-popup-overflow', totalHeight > popupHeight);

                const { x, y } = this.viewer.getAbsoluteCharacterCoords(lastOffset);
                this.showPopup(x, y);
                this.popupContent.style.height = popupHeight ? `${popupHeight}px` : 'auto';
                this.lastProposals = proposals;

                this.selectedProposal = 0;
                this.selectProposal(this.selectedProposal);
            } else {
                this.hidePopup();
            }
        }
    }

    /**
     * Shows additional info for given proposal
     * @private
     * @param {Number} ix
     */
    showAdditionalInfo(ix) {
        /** @type {CompletionProposal} */
        const proposal = this.lastProposals[ix];
        if (proposal?.getAdditionalInfo()) {
            const proposalElem = /** @type {HTMLElement} */ (this.popupContent.children[ix]);
            const elem = this.additionalInfo;

            elem.innerHTML = proposal.getAdditionalInfo();
            elem.classList.remove('tx-ca-additional-info-left');
            elem.style.display = 'block';
            elem.style.top = `${proposalElem.offsetTop - this.popupContent.scrollTop}px`;

            // make sure that additional info window is not outside TextViewer's bounds
            const viewer = this.viewer.getElement();
            if (elem.offsetLeft + elem.offsetWidth + this.popup.offsetLeft > viewer.offsetLeft + viewer.offsetWidth) {
                elem.classList.add('tx-ca-additional-info-left');
            }
        }
    }

    /**
     * Hide additional info window
     */
    hideAdditionalInfo() {
        this.additionalInfo.style.display = 'none';
    }

    /**
     * Select proposal in popup window
     * @param {number} ix Proposal index (0-based)
     * @param {boolean} [noScroll] Don't scroll proposal into view
     */
    selectProposal(ix, noScroll) {
        const { popupContent } = this;
        const prevSelected = /** @type {HTMLElement} */ (popupContent.children[this.selectedProposal]);
        const nextSelected = /** @type {HTMLElement} */ (popupContent.children[ix]);

        prevSelected?.classList.remove(this.selectedClass);

        if (nextSelected) {
            nextSelected.classList.add(this.selectedClass);

            if (!noScroll) {
                // make sure that selected proposal is visible
                let proposalTop = nextSelected.offsetTop;
                let proposalHeight = nextSelected.offsetHeight;
                let popupScroll = popupContent.scrollTop;
                let popupHeight = popupContent.offsetHeight;

                if (proposalTop < popupScroll) {
                    popupContent.scrollTop = proposalTop;
                } else if (proposalTop + proposalHeight > popupScroll + popupHeight) {
                    popupContent.scrollTop = proposalTop + proposalHeight - popupHeight;
                }
            }

            this.showAdditionalInfo(ix);
        }

        this.selectedProposal = ix;
    }
}
