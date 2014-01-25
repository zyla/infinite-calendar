(function() {
	/**
	 * Return a new Date object, which is original 'date' plus 'days' days.
	 */
	function addDays(date, days) {
		if(days == 0) return date;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
	};

	var MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
	var MILLISECONDS_PER_WEEK = MILLISECONDS_PER_DAY * 7;

	function Calendar(element, options) {
		this.element = $(element);

		options = options || {};

		this.weekStart = ('weekStart' in options)? options.weekStart: 1;

		this.startDate = this.findWeekStart(options.startDate || new Date(1971, 1, 1));
		this.endDate = this.findWeekStart(options.endDate || addDays(this.startDate, 365));

		this.weekdayNames = options.weekdayNames || 'Sun Mon Tue Wed Thu Fri Sat'.split(/ /);
		this.monthNames = options.monthNames ||
			'January February March April May June July August September October November December'.split(/ /);

		this.extraRows = 'extraRows' in options? options.extraRows: 3;

		this.selectable = 'selectable' in options? options.selectable: true;

		if(this.selectable) {
			this._initSel();
		}

		this.init();
	}

	Calendar.prototype._initSel = function() {
		// in the following functions, 'this' will be .cal-d element.
		// grab Calendar object in closure
		var calendar = this;
		calendar.selection = {};
		this.onDayMousedown = function() {
			calendar.selection.anchor = $(this).data('index');
			calendar.selection.mousedown = true;

			calendar._setSel(calendar.selection.anchor);
		};
		$(window).mouseup(function() {
			calendar.selection.mousedown = false;
		});
		this.onDayMousemove = function() {
			if(calendar.selection.mousedown) {
				calendar._setSel(calendar.selection.anchor, $(this).data('index'));
			}
		};
	};

	Calendar.prototype._setSel = function(start, end) {
		if(end === undefined)
			end = start;

		if(start > end) {
			var tmp = start; start = end; end = tmp;
		}

		if(this.selection.start == start && this.selection.end == end)
			return;

		if(start === undefined) {
			this._clearSel();
		} else if(this.selection.start === undefined
				|| this.selection.end < start || this.selection.start > end) {
			this._clearSel();
			this._markSel(start, end, true);
		} else {
			this._markSel(this.selection.start, start - 1, false);
			this._markSel(end + 1, this.selection.end, false);

			this._markSel(start, this.selection.start, true);
			this._markSel(this.selection.end, end, true);
		}
		this.selection.start = start;
		this.selection.end = end;
	};

	Calendar.prototype._clearSel = function() {
		this.container.find('.selected').removeClass('selected');
	};
	
	Calendar.prototype._visibleDayForIndex = function(index) {
		var row = Math.floor(index / 7) - this.firstRow;
		var dayOffset = index % 7;

		if(row < 0) {
			// we are behind visible range
			row = dayOffset = 0;
		}
		var day = this.container.children().eq(row).children().eq(dayOffset);

		return day;
	}

	Calendar.prototype._markSel = function(start, end, selected) {
		if(end < start)
			return;
		var day = this._visibleDayForIndex(start);
		while(day.data('index') <= end) {
			day.toggleClass('selected', selected);

			var next = day.next();
			if(!next.length) {
				next = day.parent().next().children().first();
				if(!next.length)
					break;
			}
			day = next;
		}
	};

	Calendar.prototype.init = function init() {
		this.header = $('<div class="cal-header"></div>');

		for(var i = 0; i < 7; i++)
			$('<div>').text(this.weekdayNames[(i + this.weekStart) % 7]).appendTo(this.header);

		this.scroll = $('<div class="cal-scroll">');
		this.scroll.css({
			'overflow-x': 'hidden',
			'overflow-y': 'scroll'
		});

		this.container = $('<div class="cal-container">');
		this.container.css({
			'position': 'relative',
			'overflow': 'hidden'
		});

		//this.table = $('<div class="cal-table">');

		this.element.append(this.header);
		this.element.append(this.scroll);

		this.months = $('<div class="cal-months">');

		this.months.css({
			'float': 'left',
			'overflow': 'hidden',
			'position': 'relative'
		});

		this.scroll.append(this.months);
		this.scroll.append(this.container);

		this.header.css('margin-left', this.months.width() + 'px');
		this.container.css('margin-left', this.months.width() + 'px');

		this.scroll.scroll($.proxy(this.onScroll, this));

		/** First visible row index */
		this.firstRow = undefined;
		/** Last visible row index */
		this.lastRow = undefined;

		var tmpRow = this.createRow(0).appendTo(this.container);
		this.rowHeight = tmpRow.outerHeight();
		this.removeRow(tmpRow);

		var numRows = this.rowForDate(this.endDate) + 1;
		this.container.height(numRows * this.rowHeight);
		this.months.height(this.container.height());

		if(this.selectable)
			this.element.css('user-select', 'none');

		// TODO smarter resizes?
		$(window).on('resize', $.proxy(this.onResize, this));
		this.onResize();
	};

	Calendar.prototype.computeRows = function computeRows() {
		var top = this.scroll.scrollTop();
		var first = Math.max(0, Math.floor(top / this.rowHeight) - this.extraRows);
		var height = this.element.innerHeight();
		var last = Math.floor((top + height - this.rowHeight) / this.rowHeight) + this.extraRows;

		//console.log('visible rows: ' + first + '-' + last);

		// first call, or non-intersecting ranges
		if(this.firstRow === undefined || this.lastRow < first || this.firstRow > last) {
			// recreate rows from scratch
			this.container.empty();
			for(var i = first; i <= last; i++) {
				this.container.append(this.createRow(i));
			}
			this.firstRow = first;
			this.lastRow = last;
		} else {
			while(this.lastRow < last) {
				var index = this.lastRow + 1;
				this.container.append(this.createRow(index));
				this.lastRow = index;
			}
			while(this.firstRow > first) {
				var index = this.firstRow - 1;
				this.container.prepend(this.createRow(index));
				this.firstRow = index;
			}

			while(this.firstRow < first) {
				this.removeRow(this.container.children().first());
				this.firstRow++;
			}
			while(this.lastRow > last) {
				this.removeRow(this.container.children().last());
				this.lastRow--;
			}
		}
	};

	Calendar.prototype.findWeekStart = function findWeekStart(date) {
		var day = date.getDay();
		if(day == 0 && this.weekStart > 0)
			day = 7;
		return addDays(date, -day + this.weekStart);
	}

	Calendar.prototype.createRow = function createRow(rowIndex) {
		var row = $('<div class="cal-w">');
		row.css({
			'position': 'absolute',
			'top': (rowIndex * this.rowHeight) + 'px',
		});

		var index = rowIndex * 7;
		var date = this._dateForIndex(index);
		if(date.getDate() <= 7) {
			var month = $('<div class="cal-m">')
				.html(this.monthNames[date.getMonth()] + '<br>' + date.getFullYear())
				.css({
					'position': 'absolute',
					'top': (rowIndex * this.rowHeight) + 'px'
				});
			month.appendTo(this.months);

			row.data('monthLabel', month);
		}
		for(var i = 0; i < 7; i++) {
			var day = $('<div class="cal-d">').text(date.getDate()).appendTo(row);

			if(date.getDate() <= 7) {
				// The day above us belongs to another month
				day.addClass('cal-d-firstweek');
			}

			if(i != 0 && date.getDate() == 1) {
				// this row crosses months, and this is the border day
				day.addClass('cal-d-first');
			}

			if((date.getMonth() % 2) != 0) {
				day.addClass('cal-d-odd-month');
			}

			day.data('date', date);
			day.data('index', index);

			if(this.selectable) {
				day.mousedown(this.onDayMousedown);
				day.mousemove(this.onDayMousemove);
				day.mouseup(this.onDayMouseup);

				if(index >= this.selection.start && index <= this.selection.end) {
					day.addClass('selected');
				}
			}

			date = addDays(date, 1);
			index++;
		}
		return row;
	};

	Calendar.prototype.removeRow = function removeRow(row) {
		if(row.data('monthLabel'))
			row.data('monthLabel').remove();
		row.remove();
	};

	Calendar.prototype.onResize = function onResize() {
		var scrollHeight = this.element.height() - this.header.outerHeight();
		this.scroll.outerHeight(scrollHeight);
		this.header.outerWidth(this.container.outerWidth());
		this.computeRows();
	};

	Calendar.prototype.onScroll = function onScroll() {
		this.computeRows();
	};

	Calendar.prototype.rowForDate = function rowForDate(date) {
		date = this.findWeekStart(date);
		return (date.getTime() - this.startDate.getTime()) / MILLISECONDS_PER_WEEK;
	};

	Calendar.prototype._indexForDate = function _indexForDate(date) {
		return Math.floor((date.getTime() - this.startDate.getTime()) / MILLISECONDS_PER_DAY);
	};
	
	Calendar.prototype._dateForIndex = function _dateForIndex(index) {
		return addDays(this.startDate, index);
	};

	Calendar.prototype.scrollToRow = function scrollToRow(row) {
		var y = row * this.rowHeight;
		if(this.scroll.scrollTop() > y + this.rowHeight)
			this.scroll.scrollTop(y);
		if(this.scroll.scrollTop() + this.scroll.height() < y + this.rowHeight)
			this.scroll.scrollTop(y - this.scroll.height() + this.rowHeight);
	};

	Calendar.prototype.scrollToDate = function scrollToDate(date) {
		return this.scrollToRow(this.rowForDate(date));
	};

	$.fn.infiniteCalendar = function infiniteCalendar(options) {
		var cal = $(this).data('infiniteCalendar');
		if (!cal) {
			cal = new Calendar(this, options);
			$(this).data('infiniteCalendar', cal);
		}
		return cal;
	};
})();
