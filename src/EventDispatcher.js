/**
 * @author 		Matthew Foster
 * @date		June 6th 2007
 * @purpose		To have a base class to extend subclasses from to inherit event dispatching functionality.
 * @procedure	Use a hash of event "types" that will contain an array of functions to execute.  The logic is if any function explicitally returns false the chain will halt execution.
 */

var EventDispatcher = function(){};

EventDispatcher.prototype = {
	buildListenerChain : function(){
		if(!this.listenerChain)
			this.listenerChain = {};
		if(!this.onlyOnceChain)
			this.onlyOnceChain = {};
	},

	/**
	 * Добавляет слушатель события
	 * @param {String} type Название события
	 * @param {Function} listener Слушатель
	 * @param {Boolean} only_once Подписаться на событие только один раз
	 */
	addEventListener : function(type, listener, only_once){
		if(!listener instanceof Function)
			throw new Error("Listener isn't a function" );

		this.buildListenerChain();
		
		var chain = only_once ? this.onlyOnceChain : this.listenerChain;
		type = typeof(type) == 'string' ? type.split(' ') : type;
		for (var i = 0; i < type.length; i++) {
			if(!chain[type[i]])
				chain[type[i]] = [listener];
			else
				chain[type[i]].push(listener);
		}

	},

	/**
	 * Проверяет, есть ли у такого события слушатели
	 * @param {String} type Название события
	 * @return {Boolean}
	 */
	hasEventListener : function(type){
		return (typeof this.listenerChain[type] != "undefined" || typeof this.onlyOnceChain[type] != "undefined");
	},

	/**
	 * Удаляет слушатель события
	 * @param {String} type Название события
	 * @param {Function} listener Слушатель, который нужно удалить
	 */
	removeEventListener : function(type, listener){
		if(!this.hasEventListener(type))
			return false;
		
		var chains = [this.listenerChain, this.onlyOnceChain];
		for (var i = 0; i < chains.length; i++) {
			/** @type Array */
			var lst = chains[i][type];
			
			for(var j = 0; j < lst.length; j++)
				if(lst[j] == listener)
					lst.splice(j, 1);
		}
			
		return true;
	},
	
	/**
	 * Инициирует событие
	 * @param {String} type Название события
	 * @param {Object} [args] Дополнительные данные, которые нужно передать слушателю
	 * @return {Boolean}
	 */
	dispatchEvent : function(type, args){
		this.buildListenerChain();

		if(!this.hasEventListener(type))
			return false;
			
		var chains = [this.listenerChain, this.onlyOnceChain],
			evt = new CustomEvent(type, this, args);
		for (var j = 0; j < chains.length; j++) {
			/** @type Array */
			var lst = chains[j][type];
			if (lst)
				for(var i = 0, il = lst.length; i < il; i++)
					lst[i](evt);
		}
		
		if (this.onlyOnceChain[type])
			delete this.onlyOnceChain[type];
			
		return true;
	}
};

/**
 * Произвольное событие. Создается в EventDispatcher и отправляется всем слушателям
 * @constructor
 * @param {String} type Тип события
 * @param {Object} target Объект, который инициировал событие
 * @param {Object} [data] Дополнительные данные
 */
function CustomEvent(type, target, data){
	this.type = type;
	this.target = target;
	if (typeof(data) != 'undefined') {
		this.data = data;
	}
}