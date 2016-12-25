'use strict';

document.addEventListener('DOMContentLoaded', function() {
	const game = new LifeGame();
	
	const templateHTML = document.getElementById('history-item').innerHTML;
	const historyTmpl = _.template(templateHTML);
	const score = new Logger($('.score__result_type_step'), $('.score__result_type_population'), $('.history'), historyTmpl);

	game.init('canvas');

	// @todo add mediator
	$('.controls__play').click(function() {
		$('.controls__pause').removeClass('controls__in-progress_yes');
		$(this).addClass('controls__in-progress_yes');
		game.toggle(false);
		game.start(200, (data) => {
			score.log(data);
		});
	});
	$('.controls__pause').click(function() {
		$('.controls__play').removeClass('controls__in-progress_yes');
		$(this).addClass('controls__in-progress_yes');
		game.toggle(true);
	});
});

const Logger = function(stepElem, populationElem, historyElem, historyTmpl) {
	this._stepElem = stepElem;
	this._populationElem = populationElem;
	this._historyElem = historyElem;
	this._historyTmpl = historyTmpl;
};

Logger.prototype = {
	log(data) {
		this._updateScoreBoard(data);
		this._saveHistory(data);
	},

	_updateScoreBoard(data) {
		this._stepElem.text(data.step);
		this._populationElem.text(data.population);
	},

	_saveHistory(data) {
		const historyItem = this._historyTmpl(data);
		
		this._historyElem.prepend(historyItem);
	}
};

const LifeGame = function (pointSize = 10, fieldX = 450, fieldY = 350) {
	this.size = {
		point: pointSize,
		field: {
			dom: {
				x: fieldX,
				y: fieldY
			},
			virtual: {
				x: fieldX / pointSize,
				y: fieldY / pointSize
			}
		}
	};

	this._initVirtualField();
};

LifeGame.prototype = {
	step: 0,

	population: 0,

	_affectedPoints: {},

	pause: false,

	init(appendTo) {
		const dimensions = {
			width: this.size.field.dom.x,
			height: this.size.field.dom.y
		};

		this._initDOMField(appendTo, dimensions);
	},

	start(timeout = 1000, callback) {
		let generator = this._step();
		let next = generator.next();

		if (!next.done && !this._pause) {
			setTimeout(() => {
				this.start(timeout, callback);
			}, timeout);
			callback(next.value);
		}
	},

	toggle(condition) {
		this._pause = condition;
	},

	_step: function* () {
		this._reCalcVirtualField();
		this._render();
		this.step++;

		let result = {
			step: this.step,
			population: this.population
		};

		yield result; 
	},

	_reCalcVirtualField() {
		const sizeX = this.size.field.virtual.x;
		const sizeY = this.size.field.virtual.y;
		const virtualField = this._virtualField;

		for (let i = 0; i < sizeX; i++) {
			for (let j = 0; j < sizeY; j++) {
				const neighbors = this._getNeighborsCount(i, j);

				if (this.checkPoint(i, j)) {
					if (neighbors < 2 || neighbors > 3) {
						this.delPoint(i, j);
					}
				} else {
					if (neighbors === 3) {
						this.addPoint(i, j);
					}
				}
			}
		}
	},

	_getNeighborsCount(x, y) {
		let xMin = x - 1;
		let xMax = x + 1;
		let yMin = y - 1;
		let yMax = y + 1;
		let neighborsCount = 0;

		for (let i = xMin; i <= xMax; i++) {
			for (let j = yMin; j <= yMax; j++) {
				if (!(i === x && j === y) && this._pointOnField(i, j)) {
					this.checkPoint(i, j) && neighborsCount++;
				}
			}
		}

		return neighborsCount;
	},

	_initVirtualField() {
		const sizeX = this.size.field.virtual.x;
		const sizeY = this.size.field.virtual.y;
		const virtualField = [];

		for (let i = 0; i < sizeX; i++) {
			virtualField[i] = [];
			
			for (let j = 0; j < sizeY; j++) {
				virtualField[i][j] = false;
			}
		}

		this._virtualField = virtualField;
	},

	_initDOMField(appendTo, dimensions) {
		this._domField = new Canvas(appendTo, this.size.point, dimensions);
		this._domField.initField();

		this._domField._canvas.addEventListener('life__mouse_click', (event) => {
			let {x, y} = this._normalizeCoords(event.detail);
			
			this.togglePoint(x, y);
			this._render();
		});
	},

	_normalizeCoords(coords) {
		let {x, y} = coords;
		let point = this.size.point;

		let cx = Math.floor(x / point);
		let cy = Math.floor(y / point);
		return {x: cx, y: cy};		
	},

	togglePoint(x, y) {
		if (!this.checkPoint(x, y)) {
			return this.addPoint(x, y);
		}

		return this.delPoint(x, y);
		
	},

	addPoint(x, y) {
		this._addAffected(x, y, true);
	},

	delPoint(x, y) {
		this._addAffected(x, y, false);
	},

	checkPoint(x, y) {
		if (!this._virtualField[x][y]) {
			return false;
		}

		return true;
	},

	_pointOnField(x, y) {
		const sizeX = this.size.field.virtual.x;
		const sizeY = this.size.field.virtual.y;
		const isInX = x >= 0 && x < sizeX;
		const isInY = y >= 0 && y < sizeY;

		return isInX && isInY;
	},

	_addAffected(x, y, isNew) {
		const uniqueKey = x + '' + y;
		const data = {x, y, isNew};

		return this._affectedPoints[uniqueKey] = data;
	},

	_render() {
		const affectedPoints = this._affectedPoints;

		for (let uniqueKey of Object.keys(affectedPoints)) {
			const point = affectedPoints[uniqueKey];
			const x = point.x;
			const y = point.y;
			const domX = point.x * this.size.point;
			const domY = point.y * this.size.point;
			const isNew = point.isNew;

			if (isNew) {
				this._virtualField[x][y] = true;
				this._domField.drawBlock(domX, domY);
				this.population++;
			} else {
				this._virtualField[x][y] = false;
				this._domField.delBlock(domX, domY);
				this.population--;
			}
		}
		this._affectedPoints = {};
	}
};


function Canvas(appendTo, pointSize, dimensions) {
	this._pointSize = pointSize;

	this._canvas = document.createElement('canvas');
	this._canvas.setAttribute('width', dimensions.width);
	this._canvas.setAttribute('height', dimensions.height);

	this._context = this._canvas.getContext('2d');

	const clickFn = this._mouseClick.bind(this);
	this._canvas.addEventListener('mousedown', clickFn);
	this._appendTo(appendTo);
};

Canvas.prototype = {
	initField(lineSize = 0.5, lineColor = '#e1edf9') {
		const size = {
			x: this._canvas.width / this._pointSize,
			y: this._canvas.height / this._pointSize
		};

		for (let type of 'xy') {
			for (let i = 0; i <= size[type]; i++) {
				let x1;
				let x2;
				let y1;
				let y2;
				
				if (type === 'x') {
					x1 = x2 = i * this._pointSize;
					y1 = 0;
					y2 = this._canvas.height;
				} else {
					x1 = 0;
					x2 = this._canvas.width;
					y1 = y2 = i * this._pointSize;
				}

				this._drawLine(x1, y1, x2, y2, lineSize, lineColor);
			}
		}

		this._pointSize -= lineSize * 2;
	},

	_appendTo(elem) {
		const container = document.getElementsByClassName(elem);
		
		container[0].appendChild(this._canvas);
	},

	_mouseClick(event) {
		let [x, y] = this._getClickCoordsFromEvent(event);

		this._trigger('_canvas', 'life__mouse_click', {x, y});
	},

	_trigger(ctx, eventName, data) {
		const event = new CustomEvent(eventName, {
			detail: data
		});
		this[ctx].dispatchEvent(event);
	},

	_getClickCoordsFromEvent(event) {
		let x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		let y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;

		x -= this._canvas.offsetLeft;
		y -= this._canvas.offsetTop;
		
		return [x, y];
	},

	drawBlock(x, y) {
		this._context.fillStyle = '#a9cff5';
		this._context.fillRect(x, y, this._pointSize, this._pointSize);
	},

	delBlock(x, y) {
		this._context.clearRect(x, y, this._pointSize, this._pointSize);
	},

	_drawLine(x1, y1, x2, y2, linewidth, strokestyle) {
		this._context.beginPath();
        this._context.lineWidth = linewidth;
        this._context.strokeStyle = strokestyle;
        this._context.moveTo(x1, y1);
        this._context.lineTo(x2, y2);
        this._context.stroke();
	}
};