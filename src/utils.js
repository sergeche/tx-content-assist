/**
 * Creates new element with class
 * @param {string} name Element's name
 * @param {string} className Element's class
 * @return {HTMLElement}
 */
export function createElement(name, className) {
    const elem = document.createElement(name);
    if (className) {
        elem.className = className;
    }

    return elem;
}

/**
 * Removes element's content
 * @param {Element} elem
 */
export function emptyElement(elem) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
}
