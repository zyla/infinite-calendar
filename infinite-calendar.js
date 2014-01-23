(function() {
	/**
	 * Return a new Date object, which is original 'date' plus 'days' days.
	 */
	function addDays(date, days) {
		if(days == 0) return date;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
	};

	function findMonday(date) {
		var day = date.getDay();
		if(day == 0)
			day = 7;
		return addDays(date, -day + 1);
	}

	var MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

	function Calendar(element, options) {
		this.element = $(element);

		options = options || {};

		this.startDate = findMonday(options.startDate || new Date(1971, 1, 1));
		this.endDate = findMonday(options.endDate || addDays(this.startDate, 365));

		this.weekdayNames = options.weekdayNames || 'Mon Tue Wed Thu Fri Sat Sun'.split(/ /);
		this.monthNames = options.monthNames ||
			'January February March April May June July August September October November December'.split(/ /);

		this.extraRows = 'extraRows' in options? options.extraRows: 3;

		this.init();
	}

	Calendar.prototype.init = function init() {
		this.header = $('<div class="cal-header"></div>');

		for(var i = 0; i < 7; i++)
			$('<div>').text(this.weekdayNames[i]).appendTo(this.header);

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

	Calendar.prototype.createRow = function createRow(index) {
		var row = $('<div class="cal-w">');
		row.css({
			'position': 'absolute',
			'top': (index * this.rowHeight) + 'px',
		});

		var date = addDays(this.startDate, index * 7);
		if(date.getDate() <= 7) {
			var month = $('<div class="cal-m">')
				.html(this.monthNames[date.getMonth()] + '<br>' + date.getFullYear())
				.css({
					'position': 'absolute',
					'top': (index * this.rowHeight) + 'px'
				});
			month.appendTo(this.months);

			row.data('monthLabel', month);
		}
		for(var i = 0; i < 7; i++) {
			var day = $('<div class="cal-d">').text(date.getDate()).appendTo(row);
			date = addDays(date, 1);
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
		date = findMonday(date);
		return (date.getTime() - this.startDate.getTime()) / MILLISECONDS_PER_WEEK;
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
