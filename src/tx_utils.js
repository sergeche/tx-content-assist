/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */var tx_utils = {
	
	/**
	 * Вспомогательная функция, которая пробегается по всем элементам массива
	 * <code>ar</code> и выполняет на каждом элементе его элементе функцию
	 * <code>fn</code>. <code>this</code> внутри этой функции указывает на
	 * элемент массива
	 *
	 * @param {Array}
	 *            ar Массив, по которому нужно пробежаться
	 * @param {Function}
	 *            fn Функция, которую нужно выполнить на каждом элементе массива
	 * @param {Boolean}
	 *            forward Перебирать значения от начала массива (п умолчанию: с
	 *            конца)
	 */
	walkArray: function(ar, fn, forward) {
		if (forward) {
			for (var i = 0, len = ar.length; i < len; i++)
				if (fn.call(ar[i], i, ar[i]) === false)
					break;
		} else {
			for (var i = ar.length - 1; i >= 0; i--)
				if (fn.call(ar[i], i, ar[i]) === false)
					break;
		}
	},
	
	trim: function(text) {
		return (text || '').replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, '');
	},
	
	/**
	 * Проверяет, есть ли класс у элемента
	 *
	 * @param {Element} elem
	 * @param {String} class_name
	 * @return {Boolean}
	 */
	hasClass: function(elem, class_name) {
		class_name = ' ' + class_name + ' ';
		var _cl = elem.className;
		return _cl && (' ' + _cl + ' ').indexOf(class_name) >= 0;
	},
	
	toggleClass: function(elem, class_name) {
		if (this.hasClass(elem, class_name))
			this.removeClass(elem, class_name);
		else
			this.addClass(elem, class_name);
	},
	
	/**
	 * Добавляет класс элементу
	 *
	 * @param {Element} elem
	 * @param {String} class_name
	 */
	addClass: function(elem, class_name) {
		var classes = [],
			that = this;
		
		this.walkArray(class_name.split(/\s+/g), function(i, n) {
			if (n && !that.hasClass(elem, n))
				classes.push(n);
		});
	
		if (classes.length)
			elem.className += (elem.className ? ' ' : '') + classes.join(' ');
	},
	
	/**
	 * Удаляет класс у элемента
	 *
	 * @param {Element} elem
	 * @param {String} class_name
	 */
	removeClass: function(elem, class_name) {
		var elem_class = elem.className || '';
		this.walkArray(class_name.split(/\s+/g), function(i, n) {
			elem_class = elem_class.replace(new RegExp('\\b' + n + '\\b'), '');
		});
	
		elem.className = this.trim(elem_class);
	},
	
	/**
	 * Removes element's content
	 * @param {Element} elem
	 */
	emptyElement: function(elem) {
		while (elem.firstChild)
			elem.removeChild(elem.firstChild);
	},
	
	/**
	 * Add event listener to element
	 * @param {Element} elem
	 * @param {String} type
	 * @param {Function} fn
	 */
	addEvent: function(elem, type, fn) {
		var items = type.split(/\s+/);
		for (var i = 0; i < items.length; i++) {
			if (elem.addEventListener)
				elem.addEventListener(items[i], fn, false);
			else if (elem.attachEvent)
				elem.attachEvent('on' + items[i], fn);
		}
	},
	
	/**
	 * Removes event listener from element
	 * @param {Element} elem
	 * @param {String} type
	 * @param {Function} fn
	 */
	removeEvent: function(elem, type, fn) {
		var items = type.split(/\s+/);
		for (var i = 0; i < items.length; i++) {
			if (elem.removeEventListener)
				elem.removeEventListener(items[i], fn, false);
			else if (elem.detachEvent)
				elem.detachEvent('on' + items[i], fn);
		}
	},
	
	/**
	 * Normalizes event for IE, making it look like a W3C event
	 */
	normalizeEvent: function(evt) {
		if (!evt || !evt.target) {
			evt = window.event;
			evt.target = evt.srcElement;
			evt.stopPropagation = function(){
				this.cancelBubble = true;
			};
			
			evt.preventDefault = function(){
				this.returnValue = false;
			};
		}
		
		return evt;
	},
	
	/**
	 * Creates new element with given class name
	 * @param {String} name Element's name
	 * @param {String} class_name Element's class name
	 * @return {Element}
	 */
	createElement: function(name, class_name) {
		var elem = document.createElement(name);
		if (class_name)
			elem.className = class_name;
			
		return elem;
	},
	
	/**
	 * Set CSS propesties for element
	 * @param {Element} elem
	 * @param {Object} params
	 */
	setCSS: function(elem, params) {
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
};