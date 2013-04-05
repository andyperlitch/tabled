;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var Tabled = require('../../');

function inches2feet(inches, model){
    var feet = Math.floor(inches/12);
    var inches = inches % 12;
    return feet + "'" + inches + '"';
}

function feet_filter(term, value, formatted, model) {
    if (term == "tall") return value > 70;
    if (term == "short") return value < 69;
    return true;
}

var columns = [
    { id: "selector", key: "selected", label: "", select: true, width: 30, lock_width: true },
    { id: "first_name", key: "first_name", label: "First Name", sort: "string", filter: "like",  },
    { id: "last_name", key: "last_name", label: "Last Name", sort: "string", filter: "like",  },
    { id: "age", key: "age", label: "Age", sort: "number", filter: "number" },
    { id: "height", key: "height", label: "Height", format: inches2feet, filter: feet_filter, sort: "number" },
    { id: "weight", key: "weight", label: "Weight", filter: "number", sort: "number" }
];
var collection = new Backbone.Collection([]);
var tabled = new Tabled({
    collection: collection,
    columns: columns,
    table_width: 500,
    save_state: true
});
var $pg = $("#playground");
tabled.render().$el.appendTo($pg);

var fnames = [
    "joe",
    "fred",
    "frank",
    "jim",
    "mike",
    "gary",
    "aziz"
];

var lnames = [
    "sterling",
    "smith",
    "erickson",
    "burke"
];

function genRow(id){
    var seed = Math.random();
    var seed2 = Math.random();
    return {
        id: id,
        selected: false,
        first_name: fnames[ Math.round( seed * (fnames.length -1) ) ],
        last_name: lnames[ Math.round( seed * (lnames.length -1) ) ],
        age: Math.ceil(seed * 75) + 15,
        height: Math.round( seed2 * 36 ) + 48,
        weight: Math.round( seed2 * 130 ) + 90
    }
}

function genRows(num){
    var retVal = [];
    for (var i=0; i < num; i++) {
        retVal.push(genRow(i));
    };
    return retVal;
}

window.stop = false;
var intval = setInterval(function(){
    if (window.stop) {
        clearInterval(intval);
        return;
    }
    var newRows = genRows(300);
    collection.reset(newRows);
}, 3000);
},{"../../":2}],2:[function(require,module,exports){
var BaseView = require('./lib/BaseView');
var Column = require('./lib/Column').model;
var Columns = require('./lib/Column').collection;
var Thead = require('./lib/Thead');
var Tbody = require('./lib/Tbody');
var Tabled = BaseView.extend({
    
    initialize: function(options) {
        // Set options
        this.options = _.extend(
            {}, 
            {
                // Makes table width and column widths adjustable
                adjustable_width: true,
                // Save the state of the table widths
                save_state: false,
                // Default minimum column width, in pixels
                min_column_width: 30,
                // Default width for the table itself. Either pixels or 'auto'
                table_width: 'auto'
            }, 
            options
        );

        // Columns
        this.columns = new Columns(this.options.columns, this.options );
        
        // Subviews
        this.thead = new Thead({
            collection: this.columns
        });
        this.tbody = new Tbody({
            collection: this.collection,
            columns: this.columns
        });
        
        // State
        if (this.options.save_state) {
            this.restorePreviousState();
        }
        
        // Listeners
        this.listenTo(this.columns, "change:width", this.onWidthChange );
        this.listenTo(this.columns, "change:filter_value", this.renderBody);
        this.listenTo(this.columns, "change:comparator", this.updateComparator);
        this.listenTo(this.columns, "sort", this.onColumnSort);
    },
    
    template: [
        '<div class="tabled-ctnr"><div class="tabled-inner">',
        '<div class="tabled">',
        '<div class="thead"></div>',
        '<div class="tbody"></div>',
        '<div class="resize-table">',
        '<div class="resize-grip"></div><div class="resize-grip"></div><div class="resize-grip"></div>',
        '</div>',
        '</div>',
        '</div></div>'
    ].join(""),
    
    render: function() {
        // Set initial markup
        this.$el.html(this.template);
        // Set the widths of the columns
        this.setWidths();
        // (Re)render subviews
        this.assign({
            '.thead': this.thead,
            '.tbody': this.tbody
        })
        return this;
    },
    
    renderBody: function(){
        this.assign({
            '.tbody': this.tbody
        });
    },
    
    renderHead: function(){
        this.assign({
            '.thead': this.thead
        });
    },
    
    onWidthChange: function(){
        this.adjustInnerDiv();
        
        // Save the widths
        if (!this.options.save_state) return;
        var widths = this.columns.reduce(function(memo, column, key){
            memo[column.get('id')] = column.get('width');
            return memo;
        }, {}, this);
        this.state('column_widths', widths);
    },
    
    onColumnSort: function() {
        this.render();
        
        // Save sort
        if (!this.options.save_state) return;
        var sorts = this.columns.col_sorts;
        this.state('column_sorts', sorts);
    },
    
    setWidths: function() {
        
        // Table's width
        var totalWidth = this.options.table_width === 'auto' ? this.$el.width() : this.options.table_width;
        var makeDefault = [];
        var adjustedWidth = 0;
        this.columns.each(function(column, key){
            var col_width = column.get('width');
            var min_col_width = column.get('min_column_width')
            if ( col_width ) {
                totalWidth -= col_width;
                adjustedWidth += col_width;
            }
            else if (min_col_width) {
                totalWidth -= min_col_width;
                adjustedWidth += min_col_width;
                makeDefault.push(column);
            } 
            else {
                makeDefault.push(column);
            }
        });
        var avg_width = makeDefault.length ? totalWidth/makeDefault.length : 0 ;
        var defaultWidth = Math.max(Math.floor(avg_width), this.options.min_column_width) ;
        makeDefault.forEach(function(column, key){
            var width = Math.max(defaultWidth, column.get('min_column_width') || defaultWidth);
            column.set('width', width);
            adjustedWidth += width;
        });
        // this.$el.width(adjustedWidth);
    },
    
    adjustInnerDiv: function() {
        var width = this.columns.reduce(function(memo, column){
            var width = column.get('width') || column.get('min_column_width');
            return memo*1 + width*1;
        }, 0);
        this.$('.tabled-inner').width(width);
    },
    
    events: {
        'mousedown .resize-table': 'grabTableResizer'
    },
    
    grabTableResizer: function(evt){
        evt.preventDefault();
        evt.stopPropagation();
        var self = this;
        var mouseX = evt.clientX;
        var col_state = this.columns.reduce(function(memo, column, index){
            memo[column.get('id')] = column.get('width');
            return memo;
        },{},this);
        var table_resize = function(evt){
            var change = (evt.clientX - mouseX)/self.columns.length;
            self.columns.each(function(column){
                column.set({"width":col_state[column.get("id")]*1+change}, {validate:true});
            })
        } 
        var cleanup_resize = function(evt) {
            $(window).off("mousemove", table_resize);
        }
        
        $(window).on("mousemove", table_resize);
        $(window).one("mouseup", cleanup_resize);
    },
    
    updateComparator: function(fn) {
        this.collection.comparator = fn;
        if (typeof fn === "function") this.collection.sort();
    },
    
    restorePreviousState: function() {
        // Check widths
        var widths = this.state('column_widths');
        if (widths !== undefined) {
            _.each(widths, function(val, key){
                this.columns.get(key).set('width', val);
            }, this);
        }
        
        // Check for column sort order
        var colsorts = this.state('column_sorts');
        if (colsorts !== undefined) {
            this.columns.col_sorts = colsorts;
            this.columns.sort();
        }
    },
    
    state: function(key, value) {
        var storage_key = 'tabled.'+this.options.id;
        var store = this.store || localStorage.getItem(storage_key) || {};
        
        if (typeof store !== "object") {
            try {
                store = JSON.parse(store);
            } catch(e) {
                store = {};
            }
        }
        this.store = store;
        
        if (value !== undefined) {
            store[key] = value;
            localStorage.setItem(storage_key, JSON.stringify(store));
            return this;
        } else {
            return store[key];
        }
    }

});

exports = module.exports = Tabled
},{"./lib/BaseView":3,"./lib/Column":4,"./lib/Thead":5,"./lib/Tbody":6}],3:[function(require,module,exports){
var BaseView = Backbone.View.extend({
    
    // Assigns a subview to a jquery selector in this view's el
    assign : function (selector, view) {
        var selectors;
        if (_.isObject(selector)) {
            selectors = selector;
        }
        else {
            selectors = {};
            selectors[selector] = view;
        }
        if (!selectors) return;
        _.each(selectors, function (view, selector) {
            view.setElement(this.$(selector)).render();
        }, this);
    }
    
});

exports = module.exports = BaseView
},{}],5:[function(require,module,exports){
var BaseView = require('./BaseView');

var ThCell = BaseView.extend({
    
    className: 'th',
    
    template: _.template('<div class="cell-inner" title="<%= label %>"><span class="th-header"><%= label %></span></div><% if(lock_width !== true) {%><span class="resize"></span><%}%>'),
    
    initialize: function() {
        this.listenTo(this.model, "change:sort_value", this.render );
        this.listenTo(this.model, "change:width", function(model, width) {
            this.$el.width(width);
        });
    },
    
    render: function() {
        var json = this.model.serialize();
        var sort_class = json.sort_value ? (json.sort_value == "d" ? "desc" : "asc" ) : "" ;
        this.$el
            .removeClass('asc desc')
            .addClass('col-'+json.id+" "+sort_class)
            .width(json.width)
            .html(this.template(json));
        if (sort_class !== "") {
            this.$(".th-header").prepend('<i class="'+sort_class+'-icon"></i> ');
        }
        return this;
    },
    
    events: {
        "mousedown .resize": "grabResizer",
        "dblclick .resize": "fitToContent",
        "mouseup .th-header": "changeColumnSort",
        "mousedown": "grabColumn"
    },
    
    grabResizer: function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var self = this;
        var mouseX = evt.clientX;
        var columnWidth = this.model.get("width");
        // Handler for when mouse is moving
        var col_resize = function(evt) {
            var column = self.model;
            var change = evt.clientX - mouseX;
            var newWidth = columnWidth + change;
            if ( newWidth < (column.get("min_column_width") || self.options.min_column_width) ) return;
            column.set({"width": newWidth}, {validate: true});
        }
        var cleanup_resize = function(evt) {
            $(window).off("mousemove", col_resize);
        }
        
        $(window).on("mousemove", col_resize);
        $(window).one("mouseup", cleanup_resize);
    },
    
    fitToContent: function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var new_width = 0;
        var min_width = this.model.get('min_column_width');
        var id = this.model.get('id');
        var $ctx = this.$el.parents('.tabled').find('.tbody');
        $(".td.col-"+id+" .cell-inner", $ctx).each(function(i, el){
            new_width = Math.max(new_width,$(this).outerWidth(true), min_width);
        });
        this.model.set({'width':new_width},{validate: true});
    },
    
    changeColumnSort: function(evt) {
        
        var model = this.model;
        
        if (typeof model.get("sort") !== "function" || model.get("moving") === true) return;
        
        var cur_sort = model.get("sort_value");
        
        if (!evt.shiftKey) {
            // disable all sorts
            model.collection.each(function(col){
                if (col !== model) col.set({"sort_value": ""})
            });
        }
        
        switch(cur_sort) {
            case "":
                model.set("sort_value", "a");
                break;
            case "a":
                model.set("sort_value", "d");
                break;
            case "d":
                model.set("sort_value", "");
                break;
        }
    },
    
    grabColumn: function(evt) {
        evt.preventDefault();
        evt.originalEvent.preventDefault();
        console.log("grabbing column");
        
        var self = this;
        var mouseX = evt.clientX;
        var offsetX = evt.offsetX;
        var thresholds = [];
        var currentIdx = this.model.sortIndex();
        var $tr = this.$el.parent();
        $tr.find('.th').each(function(i,el){
            var $this = $(this);
            var offset = $this.offset().left;
            var half = $this.width() / 2;
            if (i != currentIdx) thresholds.push(offset+half);
        });
        var prevent_mouseup = false;
        
        var getNewIndex = function(pos) {
            var newIdx = 0;
            for (var i=0; i < thresholds.length; i++) {
                var val = thresholds[i];
                if (pos > val) newIdx++;
                else return newIdx;
            };
            return newIdx;
        }
        
        var drawHelper = function(newIdx) {
            $tr.find('.colsort-helper').remove();
            if (newIdx == currentIdx) return;
            var method = newIdx < currentIdx ? 'before' : 'after';
            $tr.find('.th:eq('+newIdx+')')[method]('<div class="colsort-helper"></div>');
        }
        
        var move_column = function(evt) {
            var curMouse = evt.clientX;
            var change = curMouse - mouseX;
            self.$el.css({'left':change, 'opacity':0.5, 'zIndex': 10});
            
            var newIdx = getNewIndex(curMouse, thresholds);
            drawHelper(newIdx);
            self.model.set('moving', true);
        }
        
        var cleanup_move = function(evt) {
            self.$el.css({'left': 0, 'opacity':1});
            $tr.find('.colsort-helper').remove();
            var curMouse = evt.clientX;
            var change = curMouse - mouseX;
            self.model.sortIndex(getNewIndex(curMouse, thresholds));
            $(window).off("mousemove", move_column);
            self.model.set('moving', false);
        }
        
        $(window).on("mousemove", move_column);
        $(window).one("mouseup", cleanup_move)
    }
});

var ThRow = BaseView.extend({
    
    render: function() {
        // clear it
        this.$el.empty();
        
        // render each th cell
        this.collection.each(function(column){
            var view = new ThCell({ model: column });
            this.$el.append( view.render().el )
        }, this);
        return this;
    }
    
});

var FilterCell = BaseView.extend({
    
    initialize: function() {
        this.listenTo(this.model, "change:width", function(column, width){
            this.$el.width(width);
        })
    },
    
    template: '<div class="cell-inner"><input class="filter" type="search" placeholder="filter" /></div>',
    
    render: function() {
        var fn = this.model.get('filter');
        var markup = typeof fn === "function" ? this.template : "" ;
        this.$el.addClass('td col-'+this.model.get('id')).width(this.model.get('width'));
        this.$el.html(markup);
        return this;
    },
    
    events: {
        "click .filter": "updateFilter",
        "keyup .filter": "updateFilterDelayed"
    },
    
    updateFilter: function(evt) {
        this.model.set('filter_value', $.trim(this.$('.filter').val()) );
    },
    
    updateFilterDelayed: function(evt) {
        if (this.updateFilterTimeout) clearTimeout(this.updateFilterTimeout)
        this.updateFilterTimeout = setTimeout(this.updateFilter.bind(this, evt), 200);
    }
    
});

var FilterRow = BaseView.extend({
    
    render: function() {
        // clear it
        this.$el.empty();
        
        // render each th cell
        this.collection.each(function(column){
            var view = new FilterCell({ model: column });
            this.$el.append( view.render().el )
        }, this);
        return this;
    }
    
});

var Thead = BaseView.extend({
    
    initialize: function(options) {
        this.th_row     = new ThRow({ collection: this.collection });
        if (this.needsFilterRow()) {
            this.filter_row = new FilterRow({ collection: this.collection });
        }
    },
    
    template: '<div class="tr th-row"></div><div class="tr filter-row"></div>',
    
    render: function() {
        this.$el.html(this.template);
        this.assign({ '.th-row' : this.th_row });
        if (this.filter_row) this.assign({ '.filter-row' : this.filter_row });
        else this.$('.filter-row').remove();
        return this;
    },
    
    needsFilterRow: function() {
        var needs_it = false;
        this.collection.each(function(column){
            if (typeof column.get('filter') !== 'undefined') needs_it = true;
        });
        return needs_it;
    }
    
});
exports = module.exports = Thead;
},{"./BaseView":3}],4:[function(require,module,exports){
var Filters = require("./Filters");
var Sorts = require("./Sorts");
var Formats = require("./Formats");
var Column = Backbone.Model.extend({
    
    defaults: {
        id: "",
        key: "",
        label: "",
        sort: undefined,
        filter: undefined,
        format: undefined,
        select: false,
        filter_value: "",
        sort_value: "",
        lock_width: false
    },
    
    initialize: function() {
        // Check for filter
        var filter = this.get("filter");
        if (typeof filter === "string" && Filters.hasOwnProperty(filter)) {
            this.set("filter", Filters[filter]);
        }
        
        // Check for sort
        var sort = this.get("sort");
        if (typeof sort === "string" && Sorts.hasOwnProperty(sort)) {
            this.set("sort", Sorts[sort](this.get("key")));
        }
        
        // Check for format
        var select = this.get('select');
        if (select) {
            this.set("format", Formats.select );
            this.set("select_key", this.get("key"));
        }
    },
    
    serialize: function() {
        return this.toJSON();
    },
    
    validate: function(attrs) {
        
        if (attrs.width < attrs.min_column_width) return "A column width cannot be => 0";
        
        if (attrs.lock_width === true && attrs.width > 0) return "This column has a locked width";
        
    },
    
    getKey: function(model) {
        return model.get(this.get('key'));
    },
    
    getFormatted: function(model) {
        var fn = this.get('format');
        return (typeof fn === "function")
            ? fn(this.getKey(model), model)
            : this.getKey(model);
    },
    
    sortIndex: function(newIndex) {
        var sorts = this.collection.col_sorts;
        if (typeof newIndex === "undefined") return sorts.indexOf(this.get("id"));
        
        var curIdx = this.sortIndex();
        var id = sorts.splice(curIdx, 1)[0];
        sorts.splice(newIndex, 0, id);
        this.collection.sort();
    }
    
});

var Columns = Backbone.Collection.extend({
    
    model: Column,
    
    initialize: function(models, options) {
        this.options = options;
        _.each(models, this.setMinWidth, this);
        this.row_sorts = this.getInitialRowSorts(models);
        this.col_sorts = this.getInitialColSorts(models);
        this.on("change:sort_value", this.onSortChange);
    },
    
    comparator: function(col1, col2) {
        var idx1 = this.col_sorts.indexOf(col1.get("id"));
        var idx2 = this.col_sorts.indexOf(col2.get("id"));
        return idx1 - idx2;
    },
    
    // resetComparator: function() {
    //     this.comparator = function(col1, col2) {
    //         console.log("this.col_sorts", this.col_sorts);
    //         var idx1 = this.col_sorts.indexOf(col1.get("id"));
    //         var idx2 = this.col_sorts.indexOf(col2.get("id"));
    //         return idx1 - idx2;
    //     }
    //     this.sort();
    // }
    
    setMinWidth: function(model) {
        if (model.hasOwnProperty('min_column_width')) return;
        
        model['min_column_width'] = this.options.min_column_width;
    },
    
    getInitialRowSorts: function(models) {
        var self = this;
        var defaultSorts = _.pluck(models, "id");
        var sorts;
        if (this.options.row_sorts) {
            sorts = this.options.row_sorts;
            if ( ! (_.every(sorts, function(sort) { return defaultSorts.indexOf(sort) > -1 })) ) {
                throw new Error("One or more values in the 'row_sorts' option does not match a column id");
            }
        } else {
            sorts = _.reduce(models,function(memo, column){ 
                if (column['sort_value']) 
                    memo.push(column["id"]); 
                
                return memo;
            },[]);
        }
        return sorts;
    },
    
    getInitialColSorts: function(models) {
        var self = this;
        var defaultSorts = _.pluck(models, "id");
        var sorts;
        if (this.options.col_sorts) {
            sorts = this.options.col_sorts;
            if ( ! (_.every(sorts, function(sort) { return defaultSorts.indexOf(sort) > -1 })) ) {
                throw new Error("One or more values in the 'col_sorts' option does not match a column id");
            }
        } else {
            sorts = defaultSorts;
        }
        return sorts;
    },
    
    onSortChange: function(model, value) {
        var id = model.get("id");
        var index = this.row_sorts.indexOf(id);
        if (index != -1) {
            if (value === "") {
                this.row_sorts.splice(index, 1);
            }
        } else {
            this.row_sorts.push(id);
        }
        this.updateComparator();
    },
    
    updateComparator: function() {
        var comparator = false;
        if (this.row_sorts.length !== 0){
            var self = this;
            var comparator = function(row1, row2) {
                for (var i=0; i < self.row_sorts.length; i++) {
                    var id = self.row_sorts[i];
                    var column = self.get(id);
                    var fn = column.get("sort");
                    var value = column.get("sort_value");
                    var sort_result = value == "a" ? fn(row1, row2) : fn(row2, row1) ;
                    if (sort_result != 0) return sort_result;
                };
                return 0;
            }
        }
        this.trigger("change:comparator", comparator);
    }
    
});

exports.model = Column;
exports.collection = Columns;
},{"./Sorts":7,"./Filters":8,"./Formats":9}],6:[function(require,module,exports){
var BaseView = require('./BaseView');

var Tdata = BaseView.extend({
    
    className: 'td',
    
    initialize: function(options){
        this.column = options.column;
        this.listenTo(this.column, "change:width", function(column, width){
            this.$el.width(width);
        });
        this.listenTo(this.model, "change:"+this.column.get("key"), this.render );
    },
    
    template: '<div class="cell-inner"></div>',
    
    render: function() {
        this.$el.addClass('col-'+this.column.id).width(this.column.get('width'));
        this.el.innerHTML = this.template;
        // this.$el.html(this.template);
        this.$(".cell-inner").append( this.column.getFormatted(this.model) );
        return this;
    }
    
});

var Trow = BaseView.extend({
    
    className: 'tr',
    
    render: function() {
        this.$el.empty();
        
        this.collection.each(function(column){
            var tdView = new Tdata({
                model: this.model,
                column: column
            });
            // this.$el.append( tdView.render().el );
            this.el.appendChild( tdView.render().el );
        }, this);
        
        return this;
    }
});

var Tbody = BaseView.extend({
    
    initialize: function(options) {
        this.columns = options.columns;
        this.listenTo(this.collection, "all", function(){
            console.log("arguments: ", arguments);
        });
        this.listenTo(this.collection, "sort", this.render);
    },
    
    render: function() {
        
        this.$el.empty();
        var startTime = +new Date();
        this.collection.each(function(row){
            var rowView = new Trow({
                model: row,
                collection: this.columns
            });
            if ( this.passesFilters(row) ) this.$el.append( rowView.render().el );
        }, this);
        var elapsedTime = +new Date() - startTime;
        console.log("elapsedTime",elapsedTime/1000);
        return this;
    },
    
    passesFilters: function(row){
        return this.columns.every(function(column){
            if (column.get('filter_value') == "" || typeof column.get('filter') !== "function") return true;
            return this.passesFilter(row, column);
        }, this);
    },
    
    passesFilter: function(row, column){
        return column.get('filter')( column.get('filter_value'), row.get(column.get('key')), column.getFormatted(row), row );
    }
    
});
exports = module.exports = Tbody;
},{"./BaseView":3}],7:[function(require,module,exports){
exports.number = function(field){
    return function(row1,row2) { 
        return row1.get(field)*1 - row2.get(field)*1;
    }
}
exports.string = function(field){
    return function(row1,row2) { 
        if ( row1.get(field).toString().toLowerCase() == row2.get(field).toString().toLowerCase() ) return 0;
        return row1.get(field).toString().toLowerCase() > row2.get(field).toString().toLowerCase() ? 1 : -1 ;
    }
}
},{}],8:[function(require,module,exports){
exports.like = function(term, value, computedValue, row) {
    term = term.toLowerCase();
    value = value.toLowerCase();
    return value.indexOf(term) > -1;
}
exports.is = function(term, value, computedValue, row) {
    term = term.toLowerCase();
    value = value.toLowerCase();
    return term == value;
}
exports.number = function(term, value) {
    value *= 1;
    var first_two = term.substr(0,2);
    var first_char = term[0];
    var against_1 = term.substr(1)*1;
    var against_2 = term.substr(2)*1;
    if ( first_two == "<=" ) return value <= against_2 ;
    if ( first_two == ">=" ) return value >= against_2 ;
    if ( first_char == "<" ) return value < against_1 ;
    if ( first_char == ">" ) return value > against_1 ;
    if ( first_char == "~" ) return Math.round(value) == against_1 ;
    if ( first_char == "=" ) return against_1 == value ;
    return value.toString().indexOf(term.toString()) > -1 ;
}
},{}],9:[function(require,module,exports){
exports.select = function(value, model) {
    var select_key = model.get('select_key') || 'selected';
    var checked = model.get(select_key) === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        if ($cb.is(":checked")) model.set(select_key, true);
        else model.set(select_key, false);
    })
    
    return $ret;
}
},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UaGVhZC5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvQ29sdW1uLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UYm9keS5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU29ydHMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Zvcm1hdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBUYWJsZWQgPSByZXF1aXJlKCcuLi8uLi8nKTtcblxuZnVuY3Rpb24gaW5jaGVzMmZlZXQoaW5jaGVzLCBtb2RlbCl7XG4gICAgdmFyIGZlZXQgPSBNYXRoLmZsb29yKGluY2hlcy8xMik7XG4gICAgdmFyIGluY2hlcyA9IGluY2hlcyAlIDEyO1xuICAgIHJldHVybiBmZWV0ICsgXCInXCIgKyBpbmNoZXMgKyAnXCInO1xufVxuXG5mdW5jdGlvbiBmZWV0X2ZpbHRlcih0ZXJtLCB2YWx1ZSwgZm9ybWF0dGVkLCBtb2RlbCkge1xuICAgIGlmICh0ZXJtID09IFwidGFsbFwiKSByZXR1cm4gdmFsdWUgPiA3MDtcbiAgICBpZiAodGVybSA9PSBcInNob3J0XCIpIHJldHVybiB2YWx1ZSA8IDY5O1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY29sdW1ucyA9IFtcbiAgICB7IGlkOiBcInNlbGVjdG9yXCIsIGtleTogXCJzZWxlY3RlZFwiLCBsYWJlbDogXCJcIiwgc2VsZWN0OiB0cnVlLCB3aWR0aDogMzAsIGxvY2tfd2lkdGg6IHRydWUgfSxcbiAgICB7IGlkOiBcImZpcnN0X25hbWVcIiwga2V5OiBcImZpcnN0X25hbWVcIiwgbGFiZWw6IFwiRmlyc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImxhc3RfbmFtZVwiLCBrZXk6IFwibGFzdF9uYW1lXCIsIGxhYmVsOiBcIkxhc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImFnZVwiLCBrZXk6IFwiYWdlXCIsIGxhYmVsOiBcIkFnZVwiLCBzb3J0OiBcIm51bWJlclwiLCBmaWx0ZXI6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcImhlaWdodFwiLCBrZXk6IFwiaGVpZ2h0XCIsIGxhYmVsOiBcIkhlaWdodFwiLCBmb3JtYXQ6IGluY2hlczJmZWV0LCBmaWx0ZXI6IGZlZXRfZmlsdGVyLCBzb3J0OiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJ3ZWlnaHRcIiwga2V5OiBcIndlaWdodFwiLCBsYWJlbDogXCJXZWlnaHRcIiwgZmlsdGVyOiBcIm51bWJlclwiLCBzb3J0OiBcIm51bWJlclwiIH1cbl07XG52YXIgY29sbGVjdGlvbiA9IG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKFtdKTtcbnZhciB0YWJsZWQgPSBuZXcgVGFibGVkKHtcbiAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLFxuICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgdGFibGVfd2lkdGg6IDUwMCxcbiAgICBzYXZlX3N0YXRlOiB0cnVlXG59KTtcbnZhciAkcGcgPSAkKFwiI3BsYXlncm91bmRcIik7XG50YWJsZWQucmVuZGVyKCkuJGVsLmFwcGVuZFRvKCRwZyk7XG5cbnZhciBmbmFtZXMgPSBbXG4gICAgXCJqb2VcIixcbiAgICBcImZyZWRcIixcbiAgICBcImZyYW5rXCIsXG4gICAgXCJqaW1cIixcbiAgICBcIm1pa2VcIixcbiAgICBcImdhcnlcIixcbiAgICBcImF6aXpcIlxuXTtcblxudmFyIGxuYW1lcyA9IFtcbiAgICBcInN0ZXJsaW5nXCIsXG4gICAgXCJzbWl0aFwiLFxuICAgIFwiZXJpY2tzb25cIixcbiAgICBcImJ1cmtlXCJcbl07XG5cbmZ1bmN0aW9uIGdlblJvdyhpZCl7XG4gICAgdmFyIHNlZWQgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciBzZWVkMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBzZWxlY3RlZDogZmFsc2UsXG4gICAgICAgIGZpcnN0X25hbWU6IGZuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChmbmFtZXMubGVuZ3RoIC0xKSApIF0sXG4gICAgICAgIGxhc3RfbmFtZTogbG5hbWVzWyBNYXRoLnJvdW5kKCBzZWVkICogKGxuYW1lcy5sZW5ndGggLTEpICkgXSxcbiAgICAgICAgYWdlOiBNYXRoLmNlaWwoc2VlZCAqIDc1KSArIDE1LFxuICAgICAgICBoZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMzYgKSArIDQ4LFxuICAgICAgICB3ZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMTMwICkgKyA5MFxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2VuUm93cyhudW0pe1xuICAgIHZhciByZXRWYWwgPSBbXTtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBudW07IGkrKykge1xuICAgICAgICByZXRWYWwucHVzaChnZW5Sb3coaSkpO1xuICAgIH07XG4gICAgcmV0dXJuIHJldFZhbDtcbn1cblxud2luZG93LnN0b3AgPSBmYWxzZTtcbnZhciBpbnR2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgIGlmICh3aW5kb3cuc3RvcCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludHZhbCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG5ld1Jvd3MgPSBnZW5Sb3dzKDMwMCk7XG4gICAgY29sbGVjdGlvbi5yZXNldChuZXdSb3dzKTtcbn0sIDMwMDApOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vbGliL0Jhc2VWaWV3Jyk7XG52YXIgQ29sdW1uID0gcmVxdWlyZSgnLi9saWIvQ29sdW1uJykubW9kZWw7XG52YXIgQ29sdW1ucyA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLmNvbGxlY3Rpb247XG52YXIgVGhlYWQgPSByZXF1aXJlKCcuL2xpYi9UaGVhZCcpO1xudmFyIFRib2R5ID0gcmVxdWlyZSgnLi9saWIvVGJvZHknKTtcbnZhciBUYWJsZWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgLy8gU2V0IG9wdGlvbnNcbiAgICAgICAgdGhpcy5vcHRpb25zID0gXy5leHRlbmQoXG4gICAgICAgICAgICB7fSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gTWFrZXMgdGFibGUgd2lkdGggYW5kIGNvbHVtbiB3aWR0aHMgYWRqdXN0YWJsZVxuICAgICAgICAgICAgICAgIGFkanVzdGFibGVfd2lkdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHRhYmxlIHdpZHRoc1xuICAgICAgICAgICAgICAgIHNhdmVfc3RhdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgbWluaW11bSBjb2x1bW4gd2lkdGgsIGluIHBpeGVsc1xuICAgICAgICAgICAgICAgIG1pbl9jb2x1bW5fd2lkdGg6IDMwLFxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgd2lkdGggZm9yIHRoZSB0YWJsZSBpdHNlbGYuIEVpdGhlciBwaXhlbHMgb3IgJ2F1dG8nXG4gICAgICAgICAgICAgICAgdGFibGVfd2lkdGg6ICdhdXRvJ1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQ29sdW1uc1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBuZXcgQ29sdW1ucyh0aGlzLm9wdGlvbnMuY29sdW1ucywgdGhpcy5vcHRpb25zICk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJ2aWV3c1xuICAgICAgICB0aGlzLnRoZWFkID0gbmV3IFRoZWFkKHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy50Ym9keSA9IG5ldyBUYm9keSh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0ZVxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVfc3RhdGUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZVByZXZpb3VzU3RhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuZXJzXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTp3aWR0aFwiLCB0aGlzLm9uV2lkdGhDaGFuZ2UgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmZpbHRlcl92YWx1ZVwiLCB0aGlzLnJlbmRlckJvZHkpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6Y29tcGFyYXRvclwiLCB0aGlzLnVwZGF0ZUNvbXBhcmF0b3IpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJzb3J0XCIsIHRoaXMub25Db2x1bW5Tb3J0KTtcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiBbXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFibGVkLWN0bnJcIj48ZGl2IGNsYXNzPVwidGFibGVkLWlubmVyXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0YWJsZWRcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRoZWFkXCI+PC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0Ym9keVwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicmVzaXplLXRhYmxlXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PjxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PjxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PjwvZGl2PidcbiAgICBdLmpvaW4oXCJcIiksXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgbWFya3VwXG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIC8vIFNldCB0aGUgd2lkdGhzIG9mIHRoZSBjb2x1bW5zXG4gICAgICAgIHRoaXMuc2V0V2lkdGhzKCk7XG4gICAgICAgIC8vIChSZSlyZW5kZXIgc3Vidmlld3NcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50aGVhZCc6IHRoaXMudGhlYWQsXG4gICAgICAgICAgICAnLnRib2R5JzogdGhpcy50Ym9keVxuICAgICAgICB9KVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckJvZHk6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGJvZHknOiB0aGlzLnRib2R5XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVySGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50aGVhZCc6IHRoaXMudGhlYWRcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICBvbldpZHRoQ2hhbmdlOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFkanVzdElubmVyRGl2KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHRoZSB3aWR0aHNcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc2F2ZV9zdGF0ZSkgcmV0dXJuO1xuICAgICAgICB2YXIgd2lkdGhzID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICBtZW1vW2NvbHVtbi5nZXQoJ2lkJyldID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LCB7fSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnLCB3aWR0aHMpO1xuICAgIH0sXG4gICAgXG4gICAgb25Db2x1bW5Tb3J0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc29ydFxuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5zYXZlX3N0YXRlKSByZXR1cm47XG4gICAgICAgIHZhciBzb3J0cyA9IHRoaXMuY29sdW1ucy5jb2xfc29ydHM7XG4gICAgICAgIHRoaXMuc3RhdGUoJ2NvbHVtbl9zb3J0cycsIHNvcnRzKTtcbiAgICB9LFxuICAgIFxuICAgIHNldFdpZHRoczogZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBUYWJsZSdzIHdpZHRoXG4gICAgICAgIHZhciB0b3RhbFdpZHRoID0gdGhpcy5vcHRpb25zLnRhYmxlX3dpZHRoID09PSAnYXV0bycgPyB0aGlzLiRlbC53aWR0aCgpIDogdGhpcy5vcHRpb25zLnRhYmxlX3dpZHRoO1xuICAgICAgICB2YXIgbWFrZURlZmF1bHQgPSBbXTtcbiAgICAgICAgdmFyIGFkanVzdGVkV2lkdGggPSAwO1xuICAgICAgICB0aGlzLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICB2YXIgY29sX3dpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHZhciBtaW5fY29sX3dpZHRoID0gY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpXG4gICAgICAgICAgICBpZiAoIGNvbF93aWR0aCApIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IGNvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IGNvbF93aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1pbl9jb2xfd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSBtaW5fY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWtlRGVmYXVsdC5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgYXZnX3dpZHRoID0gbWFrZURlZmF1bHQubGVuZ3RoID8gdG90YWxXaWR0aC9tYWtlRGVmYXVsdC5sZW5ndGggOiAwIDtcbiAgICAgICAgdmFyIGRlZmF1bHRXaWR0aCA9IE1hdGgubWF4KE1hdGguZmxvb3IoYXZnX3dpZHRoKSwgdGhpcy5vcHRpb25zLm1pbl9jb2x1bW5fd2lkdGgpIDtcbiAgICAgICAgbWFrZURlZmF1bHQuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBNYXRoLm1heChkZWZhdWx0V2lkdGgsIGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKSB8fCBkZWZhdWx0V2lkdGgpO1xuICAgICAgICAgICAgY29sdW1uLnNldCgnd2lkdGgnLCB3aWR0aCk7XG4gICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IHdpZHRoO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gdGhpcy4kZWwud2lkdGgoYWRqdXN0ZWRXaWR0aCk7XG4gICAgfSxcbiAgICBcbiAgICBhZGp1c3RJbm5lckRpdjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuY29sdW1ucy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbi5nZXQoJ3dpZHRoJykgfHwgY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW8qMSArIHdpZHRoKjE7XG4gICAgICAgIH0sIDApO1xuICAgICAgICB0aGlzLiQoJy50YWJsZWQtaW5uZXInKS53aWR0aCh3aWR0aCk7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ21vdXNlZG93biAucmVzaXplLXRhYmxlJzogJ2dyYWJUYWJsZVJlc2l6ZXInXG4gICAgfSxcbiAgICBcbiAgICBncmFiVGFibGVSZXNpemVyOiBmdW5jdGlvbihldnQpe1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbF9zdGF0ZSA9IHRoaXMuY29sdW1ucy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY29sdW1uLCBpbmRleCl7XG4gICAgICAgICAgICBtZW1vW2NvbHVtbi5nZXQoJ2lkJyldID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LHt9LHRoaXMpO1xuICAgICAgICB2YXIgdGFibGVfcmVzaXplID0gZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSAoZXZ0LmNsaWVudFggLSBtb3VzZVgpL3NlbGYuY29sdW1ucy5sZW5ndGg7XG4gICAgICAgICAgICBzZWxmLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjpjb2xfc3RhdGVbY29sdW1uLmdldChcImlkXCIpXSoxK2NoYW5nZX0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IFxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIHRhYmxlX3Jlc2l6ZSk7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIGNsZWFudXBfcmVzaXplKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5jb21wYXJhdG9yID0gZm47XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9LFxuICAgIFxuICAgIHJlc3RvcmVQcmV2aW91c1N0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgd2lkdGhzXG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJyk7XG4gICAgICAgIGlmICh3aWR0aHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5lYWNoKHdpZHRocywgZnVuY3Rpb24odmFsLCBrZXkpe1xuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1ucy5nZXQoa2V5KS5zZXQoJ3dpZHRoJywgdmFsKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgY29sdW1uIHNvcnQgb3JkZXJcbiAgICAgICAgdmFyIGNvbHNvcnRzID0gdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJyk7XG4gICAgICAgIGlmIChjb2xzb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbnMuY29sX3NvcnRzID0gY29sc29ydHM7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbnMuc29ydCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzdGF0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZV9rZXkgPSAndGFibGVkLicrdGhpcy5vcHRpb25zLmlkO1xuICAgICAgICB2YXIgc3RvcmUgPSB0aGlzLnN0b3JlIHx8IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHN0b3JhZ2Vfa2V5KSB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygc3RvcmUgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RvcmUgPSBKU09OLnBhcnNlKHN0b3JlKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIHN0b3JlID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0b3JlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHN0b3JhZ2Vfa2V5LCBKU09OLnN0cmluZ2lmeShzdG9yZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcmVba2V5XTtcbiAgICAgICAgfVxuICAgIH1cblxufSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRhYmxlZCIsInZhciBCYXNlVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICAvLyBBc3NpZ25zIGEgc3VidmlldyB0byBhIGpxdWVyeSBzZWxlY3RvciBpbiB0aGlzIHZpZXcncyBlbFxuICAgIGFzc2lnbiA6IGZ1bmN0aW9uIChzZWxlY3Rvciwgdmlldykge1xuICAgICAgICB2YXIgc2VsZWN0b3JzO1xuICAgICAgICBpZiAoXy5pc09iamVjdChzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHNlbGVjdG9ycyA9IHNlbGVjdG9yO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0b3JzID0ge307XG4gICAgICAgICAgICBzZWxlY3RvcnNbc2VsZWN0b3JdID0gdmlldztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNlbGVjdG9ycykgcmV0dXJuO1xuICAgICAgICBfLmVhY2goc2VsZWN0b3JzLCBmdW5jdGlvbiAodmlldywgc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHZpZXcuc2V0RWxlbWVudCh0aGlzLiQoc2VsZWN0b3IpKS5yZW5kZXIoKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIFxufSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGhDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0aCcsXG4gICAgXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCIgdGl0bGU9XCI8JT0gbGFiZWwgJT5cIj48c3BhbiBjbGFzcz1cInRoLWhlYWRlclwiPjwlPSBsYWJlbCAlPjwvc3Bhbj48L2Rpdj48JSBpZihsb2NrX3dpZHRoICE9PSB0cnVlKSB7JT48c3BhbiBjbGFzcz1cInJlc2l6ZVwiPjwvc3Bhbj48JX0lPicpLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5yZW5kZXIgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihtb2RlbCwgd2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIganNvbiA9IHRoaXMubW9kZWwuc2VyaWFsaXplKCk7XG4gICAgICAgIHZhciBzb3J0X2NsYXNzID0ganNvbi5zb3J0X3ZhbHVlID8gKGpzb24uc29ydF92YWx1ZSA9PSBcImRcIiA/IFwiZGVzY1wiIDogXCJhc2NcIiApIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FzYyBkZXNjJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY29sLScranNvbi5pZCtcIiBcIitzb3J0X2NsYXNzKVxuICAgICAgICAgICAgLndpZHRoKGpzb24ud2lkdGgpXG4gICAgICAgICAgICAuaHRtbCh0aGlzLnRlbXBsYXRlKGpzb24pKTtcbiAgICAgICAgaWYgKHNvcnRfY2xhc3MgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi50aC1oZWFkZXJcIikucHJlcGVuZCgnPGkgY2xhc3M9XCInK3NvcnRfY2xhc3MrJy1pY29uXCI+PC9pPiAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAucmVzaXplXCI6IFwiZ3JhYlJlc2l6ZXJcIixcbiAgICAgICAgXCJkYmxjbGljayAucmVzaXplXCI6IFwiZml0VG9Db250ZW50XCIsXG4gICAgICAgIFwibW91c2V1cCAudGgtaGVhZGVyXCI6IFwiY2hhbmdlQ29sdW1uU29ydFwiLFxuICAgICAgICBcIm1vdXNlZG93blwiOiBcImdyYWJDb2x1bW5cIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbHVtbldpZHRoID0gdGhpcy5tb2RlbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgLy8gSGFuZGxlciBmb3Igd2hlbiBtb3VzZSBpcyBtb3ZpbmdcbiAgICAgICAgdmFyIGNvbF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLm1vZGVsO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGV2dC5jbGllbnRYIC0gbW91c2VYO1xuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gY29sdW1uV2lkdGggKyBjaGFuZ2U7XG4gICAgICAgICAgICBpZiAoIG5ld1dpZHRoIDwgKGNvbHVtbi5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpIHx8IHNlbGYub3B0aW9ucy5taW5fY29sdW1uX3dpZHRoKSApIHJldHVybjtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjogbmV3V2lkdGh9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgZml0VG9Db250ZW50OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IDA7XG4gICAgICAgIHZhciBtaW5fd2lkdGggPSB0aGlzLm1vZGVsLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKTtcbiAgICAgICAgdmFyICRjdHggPSB0aGlzLiRlbC5wYXJlbnRzKCcudGFibGVkJykuZmluZCgnLnRib2R5Jyk7XG4gICAgICAgICQoXCIudGQuY29sLVwiK2lkK1wiIC5jZWxsLWlubmVyXCIsICRjdHgpLmVhY2goZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgbmV3X3dpZHRoID0gTWF0aC5tYXgobmV3X3dpZHRoLCQodGhpcykub3V0ZXJXaWR0aCh0cnVlKSwgbWluX3dpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnd2lkdGgnOm5ld193aWR0aH0se3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgfSxcbiAgICBcbiAgICBjaGFuZ2VDb2x1bW5Tb3J0OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG1vZGVsLmdldChcInNvcnRcIikgIT09IFwiZnVuY3Rpb25cIiB8fCBtb2RlbC5nZXQoXCJtb3ZpbmdcIikgPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJfc29ydCA9IG1vZGVsLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2dC5zaGlmdEtleSkge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBhbGwgc29ydHNcbiAgICAgICAgICAgIG1vZGVsLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2wpe1xuICAgICAgICAgICAgICAgIGlmIChjb2wgIT09IG1vZGVsKSBjb2wuc2V0KHtcInNvcnRfdmFsdWVcIjogXCJcIn0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoKGN1cl9zb3J0KSB7XG4gICAgICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImFcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYVwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBncmFiQ29sdW1uOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZ3JhYmJpbmcgY29sdW1uXCIpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBvZmZzZXRYID0gZXZ0Lm9mZnNldFg7XG4gICAgICAgIHZhciB0aHJlc2hvbGRzID0gW107XG4gICAgICAgIHZhciBjdXJyZW50SWR4ID0gdGhpcy5tb2RlbC5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyICR0ciA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAkdHIuZmluZCgnLnRoJykuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJHRoaXMub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgIHZhciBoYWxmID0gJHRoaXMud2lkdGgoKSAvIDI7XG4gICAgICAgICAgICBpZiAoaSAhPSBjdXJyZW50SWR4KSB0aHJlc2hvbGRzLnB1c2gob2Zmc2V0K2hhbGYpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByZXZlbnRfbW91c2V1cCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGdldE5ld0luZGV4ID0gZnVuY3Rpb24ocG9zKSB7XG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHRocmVzaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdGhyZXNob2xkc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocG9zID4gdmFsKSBuZXdJZHgrKztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBuZXdJZHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGRyYXdIZWxwZXIgPSBmdW5jdGlvbihuZXdJZHgpIHtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGlmIChuZXdJZHggPT0gY3VycmVudElkeCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG5ld0lkeCA8IGN1cnJlbnRJZHggPyAnYmVmb3JlJyA6ICdhZnRlcic7XG4gICAgICAgICAgICAkdHIuZmluZCgnLnRoOmVxKCcrbmV3SWR4KycpJylbbWV0aG9kXSgnPGRpdiBjbGFzcz1cImNvbHNvcnQtaGVscGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlX2NvbHVtbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzpjaGFuZ2UsICdvcGFjaXR5JzowLjUsICd6SW5kZXgnOiAxMH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpO1xuICAgICAgICAgICAgZHJhd0hlbHBlcihuZXdJZHgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xlYW51cF9tb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzogMCwgJ29wYWNpdHknOjF9KTtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zb3J0SW5kZXgoZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpKTtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9tb3ZlKVxuICAgIH1cbn0pO1xuXG52YXIgVGhSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBUaENlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsIClcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IGNsYXNzPVwiZmlsdGVyXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiZmlsdGVyXCIgLz48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXInKTtcbiAgICAgICAgdmFyIG1hcmt1cCA9IHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy50ZW1wbGF0ZSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygndGQgY29sLScrdGhpcy5tb2RlbC5nZXQoJ2lkJykpLndpZHRoKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbChtYXJrdXApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcImNsaWNrIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJcIixcbiAgICAgICAgXCJrZXl1cCAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyRGVsYXllZFwiXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgnZmlsdGVyX3ZhbHVlJywgJC50cmltKHRoaXMuJCgnLmZpbHRlcicpLnZhbCgpKSApO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyRGVsYXllZDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpXG4gICAgICAgIHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXIuYmluZCh0aGlzLCBldnQpLCAyMDApO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyUm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjbGVhciBpdFxuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGVhY2ggdGggY2VsbFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRmlsdGVyQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKVxuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBUaGVhZCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLnRoX3JvdyAgICAgPSBuZXcgVGhSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSk7XG4gICAgICAgIGlmICh0aGlzLm5lZWRzRmlsdGVyUm93KCkpIHtcbiAgICAgICAgICAgIHRoaXMuZmlsdGVyX3JvdyA9IG5ldyBGaWx0ZXJSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInRyIHRoLXJvd1wiPjwvZGl2PjxkaXYgY2xhc3M9XCJ0ciBmaWx0ZXItcm93XCI+PC9kaXY+JyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLmFzc2lnbih7ICcudGgtcm93JyA6IHRoaXMudGhfcm93IH0pO1xuICAgICAgICBpZiAodGhpcy5maWx0ZXJfcm93KSB0aGlzLmFzc2lnbih7ICcuZmlsdGVyLXJvdycgOiB0aGlzLmZpbHRlcl9yb3cgfSk7XG4gICAgICAgIGVsc2UgdGhpcy4kKCcuZmlsdGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIG5lZWRzRmlsdGVyUm93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5lZWRzX2l0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbHVtbi5nZXQoJ2ZpbHRlcicpICE9PSAndW5kZWZpbmVkJykgbmVlZHNfaXQgPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5lZWRzX2l0O1xuICAgIH1cbiAgICBcbn0pO1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGhlYWQ7IiwidmFyIEZpbHRlcnMgPSByZXF1aXJlKFwiLi9GaWx0ZXJzXCIpO1xudmFyIFNvcnRzID0gcmVxdWlyZShcIi4vU29ydHNcIik7XG52YXIgRm9ybWF0cyA9IHJlcXVpcmUoXCIuL0Zvcm1hdHNcIik7XG52YXIgQ29sdW1uID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICBcbiAgICBkZWZhdWx0czoge1xuICAgICAgICBpZDogXCJcIixcbiAgICAgICAga2V5OiBcIlwiLFxuICAgICAgICBsYWJlbDogXCJcIixcbiAgICAgICAgc29ydDogdW5kZWZpbmVkLFxuICAgICAgICBmaWx0ZXI6IHVuZGVmaW5lZCxcbiAgICAgICAgZm9ybWF0OiB1bmRlZmluZWQsXG4gICAgICAgIHNlbGVjdDogZmFsc2UsXG4gICAgICAgIGZpbHRlcl92YWx1ZTogXCJcIixcbiAgICAgICAgc29ydF92YWx1ZTogXCJcIixcbiAgICAgICAgbG9ja193aWR0aDogZmFsc2VcbiAgICB9LFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgZmlsdGVyXG4gICAgICAgIHZhciBmaWx0ZXIgPSB0aGlzLmdldChcImZpbHRlclwiKTtcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09IFwic3RyaW5nXCIgJiYgRmlsdGVycy5oYXNPd25Qcm9wZXJ0eShmaWx0ZXIpKSB7XG4gICAgICAgICAgICB0aGlzLnNldChcImZpbHRlclwiLCBGaWx0ZXJzW2ZpbHRlcl0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3Igc29ydFxuICAgICAgICB2YXIgc29ydCA9IHRoaXMuZ2V0KFwic29ydFwiKTtcbiAgICAgICAgaWYgKHR5cGVvZiBzb3J0ID09PSBcInN0cmluZ1wiICYmIFNvcnRzLmhhc093blByb3BlcnR5KHNvcnQpKSB7XG4gICAgICAgICAgICB0aGlzLnNldChcInNvcnRcIiwgU29ydHNbc29ydF0odGhpcy5nZXQoXCJrZXlcIikpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZvcm1hdFxuICAgICAgICB2YXIgc2VsZWN0ID0gdGhpcy5nZXQoJ3NlbGVjdCcpO1xuICAgICAgICBpZiAoc2VsZWN0KSB7XG4gICAgICAgICAgICB0aGlzLnNldChcImZvcm1hdFwiLCBGb3JtYXRzLnNlbGVjdCApO1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzZWxlY3Rfa2V5XCIsIHRoaXMuZ2V0KFwia2V5XCIpKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9KU09OKCk7XG4gICAgfSxcbiAgICBcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy53aWR0aCA8IGF0dHJzLm1pbl9jb2x1bW5fd2lkdGgpIHJldHVybiBcIkEgY29sdW1uIHdpZHRoIGNhbm5vdCBiZSA9PiAwXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAoYXR0cnMubG9ja193aWR0aCA9PT0gdHJ1ZSAmJiBhdHRycy53aWR0aCA+IDApIHJldHVybiBcIlRoaXMgY29sdW1uIGhhcyBhIGxvY2tlZCB3aWR0aFwiO1xuICAgICAgICBcbiAgICB9LFxuICAgIFxuICAgIGdldEtleTogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmdldCh0aGlzLmdldCgna2V5JykpO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Rm9ybWF0dGVkOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICB2YXIgZm4gPSB0aGlzLmdldCgnZm9ybWF0Jyk7XG4gICAgICAgIHJldHVybiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICA/IGZuKHRoaXMuZ2V0S2V5KG1vZGVsKSwgbW9kZWwpXG4gICAgICAgICAgICA6IHRoaXMuZ2V0S2V5KG1vZGVsKTtcbiAgICB9LFxuICAgIFxuICAgIHNvcnRJbmRleDogZnVuY3Rpb24obmV3SW5kZXgpIHtcbiAgICAgICAgdmFyIHNvcnRzID0gdGhpcy5jb2xsZWN0aW9uLmNvbF9zb3J0cztcbiAgICAgICAgaWYgKHR5cGVvZiBuZXdJbmRleCA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHNvcnRzLmluZGV4T2YodGhpcy5nZXQoXCJpZFwiKSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgY3VySWR4ID0gdGhpcy5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyIGlkID0gc29ydHMuc3BsaWNlKGN1cklkeCwgMSlbMF07XG4gICAgICAgIHNvcnRzLnNwbGljZShuZXdJbmRleCwgMCwgaWQpO1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uc29ydCgpO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgQ29sdW1ucyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBcbiAgICBtb2RlbDogQ29sdW1uLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICBfLmVhY2gobW9kZWxzLCB0aGlzLnNldE1pbldpZHRoLCB0aGlzKTtcbiAgICAgICAgdGhpcy5yb3dfc29ydHMgPSB0aGlzLmdldEluaXRpYWxSb3dTb3J0cyhtb2RlbHMpO1xuICAgICAgICB0aGlzLmNvbF9zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbENvbFNvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMub24oXCJjaGFuZ2U6c29ydF92YWx1ZVwiLCB0aGlzLm9uU29ydENoYW5nZSk7XG4gICAgfSxcbiAgICBcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihjb2wxLCBjb2wyKSB7XG4gICAgICAgIHZhciBpZHgxID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wxLmdldChcImlkXCIpKTtcbiAgICAgICAgdmFyIGlkeDIgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDIuZ2V0KFwiaWRcIikpO1xuICAgICAgICByZXR1cm4gaWR4MSAtIGlkeDI7XG4gICAgfSxcbiAgICBcbiAgICAvLyByZXNldENvbXBhcmF0b3I6IGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICB0aGlzLmNvbXBhcmF0b3IgPSBmdW5jdGlvbihjb2wxLCBjb2wyKSB7XG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuY29sX3NvcnRzXCIsIHRoaXMuY29sX3NvcnRzKTtcbiAgICAvLyAgICAgICAgIHZhciBpZHgxID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wxLmdldChcImlkXCIpKTtcbiAgICAvLyAgICAgICAgIHZhciBpZHgyID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wyLmdldChcImlkXCIpKTtcbiAgICAvLyAgICAgICAgIHJldHVybiBpZHgxIC0gaWR4MjtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICB0aGlzLnNvcnQoKTtcbiAgICAvLyB9XG4gICAgXG4gICAgc2V0TWluV2lkdGg6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIGlmIChtb2RlbC5oYXNPd25Qcm9wZXJ0eSgnbWluX2NvbHVtbl93aWR0aCcpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBtb2RlbFsnbWluX2NvbHVtbl93aWR0aCddID0gdGhpcy5vcHRpb25zLm1pbl9jb2x1bW5fd2lkdGg7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsUm93U29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJvd19zb3J0cykge1xuICAgICAgICAgICAgc29ydHMgPSB0aGlzLm9wdGlvbnMucm93X3NvcnRzO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdyb3dfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gXy5yZWR1Y2UobW9kZWxzLGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7IFxuICAgICAgICAgICAgICAgIGlmIChjb2x1bW5bJ3NvcnRfdmFsdWUnXSkgXG4gICAgICAgICAgICAgICAgICAgIG1lbW8ucHVzaChjb2x1bW5bXCJpZFwiXSk7IFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICAgICAgfSxbXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvcnRzO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SW5pdGlhbENvbFNvcnRzOiBmdW5jdGlvbihtb2RlbHMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmYXVsdFNvcnRzID0gXy5wbHVjayhtb2RlbHMsIFwiaWRcIik7XG4gICAgICAgIHZhciBzb3J0cztcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb2xfc29ydHMpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5vcHRpb25zLmNvbF9zb3J0cztcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAnY29sX3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IGRlZmF1bHRTb3J0cztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc29ydHM7XG4gICAgfSxcbiAgICBcbiAgICBvblNvcnRDaGFuZ2U6IGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSkge1xuICAgICAgICB2YXIgaWQgPSBtb2RlbC5nZXQoXCJpZFwiKTtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5yb3dfc29ydHMuaW5kZXhPZihpZCk7XG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucm93X3NvcnRzLnB1c2goaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlQ29tcGFyYXRvcigpO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ29tcGFyYXRvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnJvd19zb3J0cy5sZW5ndGggIT09IDApe1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmdW5jdGlvbihyb3cxLCByb3cyKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZi5yb3dfc29ydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gc2VsZi5yb3dfc29ydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLmdldChpZCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IGNvbHVtbi5nZXQoXCJzb3J0XCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBjb2x1bW4uZ2V0KFwic29ydF92YWx1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRfcmVzdWx0ID0gdmFsdWUgPT0gXCJhXCIgPyBmbihyb3cxLCByb3cyKSA6IGZuKHJvdzIsIHJvdzEpIDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRfcmVzdWx0ICE9IDApIHJldHVybiBzb3J0X3Jlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZTpjb21wYXJhdG9yXCIsIGNvbXBhcmF0b3IpO1xuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzLm1vZGVsID0gQ29sdW1uO1xuZXhwb3J0cy5jb2xsZWN0aW9uID0gQ29sdW1uczsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG5cbnZhciBUZGF0YSA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgY2xhc3NOYW1lOiAndGQnLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuICAgICAgICB0aGlzLmNvbHVtbiA9IG9wdGlvbnMuY29sdW1uO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1uLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihjb2x1bW4sIHdpZHRoKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6XCIrdGhpcy5jb2x1bW4uZ2V0KFwia2V5XCIpLCB0aGlzLnJlbmRlciApO1xuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2NvbC0nK3RoaXMuY29sdW1uLmlkKS53aWR0aCh0aGlzLmNvbHVtbi5nZXQoJ3dpZHRoJykpO1xuICAgICAgICB0aGlzLmVsLmlubmVySFRNTCA9IHRoaXMudGVtcGxhdGU7XG4gICAgICAgIC8vIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuJChcIi5jZWxsLWlubmVyXCIpLmFwcGVuZCggdGhpcy5jb2x1bW4uZ2V0Rm9ybWF0dGVkKHRoaXMubW9kZWwpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgVHJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgY2xhc3NOYW1lOiAndHInLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHRkVmlldyA9IG5ldyBUZGF0YSh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBjb2x1bW5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gdGhpcy4kZWwuYXBwZW5kKCB0ZFZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQoIHRkVmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn0pO1xuXG52YXIgVGJvZHkgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gb3B0aW9ucy5jb2x1bW5zO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJhbGxcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXJndW1lbnRzOiBcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInNvcnRcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHZhciBzdGFydFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24ocm93KXtcbiAgICAgICAgICAgIHZhciByb3dWaWV3ID0gbmV3IFRyb3coe1xuICAgICAgICAgICAgICAgIG1vZGVsOiByb3csXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICggdGhpcy5wYXNzZXNGaWx0ZXJzKHJvdykgKSB0aGlzLiRlbC5hcHBlbmQoIHJvd1ZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHZhciBlbGFwc2VkVGltZSA9ICtuZXcgRGF0ZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zb2xlLmxvZyhcImVsYXBzZWRUaW1lXCIsZWxhcHNlZFRpbWUvMTAwMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgcGFzc2VzRmlsdGVyczogZnVuY3Rpb24ocm93KXtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sdW1ucy5ldmVyeShmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgaWYgKGNvbHVtbi5nZXQoJ2ZpbHRlcl92YWx1ZScpID09IFwiXCIgfHwgdHlwZW9mIGNvbHVtbi5nZXQoJ2ZpbHRlcicpICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFzc2VzRmlsdGVyKHJvdywgY29sdW1uKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICBwYXNzZXNGaWx0ZXI6IGZ1bmN0aW9uKHJvdywgY29sdW1uKXtcbiAgICAgICAgcmV0dXJuIGNvbHVtbi5nZXQoJ2ZpbHRlcicpKCBjb2x1bW4uZ2V0KCdmaWx0ZXJfdmFsdWUnKSwgcm93LmdldChjb2x1bW4uZ2V0KCdrZXknKSksIGNvbHVtbi5nZXRGb3JtYXR0ZWQocm93KSwgcm93ICk7XG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYm9keTsiLCJleHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpKjEgLSByb3cyLmdldChmaWVsZCkqMTtcbiAgICB9XG59XG5leHBvcnRzLnN0cmluZyA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICBpZiAoIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT0gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSApIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA+IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPyAxIDogLTEgO1xuICAgIH1cbn0iLCJleHBvcnRzLmxpa2UgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YodGVybSkgPiAtMTtcbn1cbmV4cG9ydHMuaXMgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHRlcm0gPT0gdmFsdWU7XG59XG5leHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlKSB7XG4gICAgdmFsdWUgKj0gMTtcbiAgICB2YXIgZmlyc3RfdHdvID0gdGVybS5zdWJzdHIoMCwyKTtcbiAgICB2YXIgZmlyc3RfY2hhciA9IHRlcm1bMF07XG4gICAgdmFyIGFnYWluc3RfMSA9IHRlcm0uc3Vic3RyKDEpKjE7XG4gICAgdmFyIGFnYWluc3RfMiA9IHRlcm0uc3Vic3RyKDIpKjE7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI8PVwiICkgcmV0dXJuIHZhbHVlIDw9IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI+PVwiICkgcmV0dXJuIHZhbHVlID49IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPFwiICkgcmV0dXJuIHZhbHVlIDwgYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI+XCIgKSByZXR1cm4gdmFsdWUgPiBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIn5cIiApIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKSA9PSBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj1cIiApIHJldHVybiBhZ2FpbnN0XzEgPT0gdmFsdWUgO1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpLmluZGV4T2YodGVybS50b1N0cmluZygpKSA+IC0xIDtcbn0iLCJleHBvcnRzLnNlbGVjdCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlbCkge1xuICAgIHZhciBzZWxlY3Rfa2V5ID0gbW9kZWwuZ2V0KCdzZWxlY3Rfa2V5JykgfHwgJ3NlbGVjdGVkJztcbiAgICB2YXIgY2hlY2tlZCA9IG1vZGVsLmdldChzZWxlY3Rfa2V5KSA9PT0gdHJ1ZTtcbiAgICB2YXIgJHJldCA9ICQoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjwvZGl2PicpO1xuICAgIFxuICAgIC8vIFNldCBjaGVja2VkXG4gICAgdmFyICRjYiA9ICRyZXQuZmluZCgnaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgY2hlY2tlZCk7XG4gICAgXG4gICAgLy8gU2V0IGNsaWNrIGJlaGF2aW9yXG4gICAgJGNiLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoJGNiLmlzKFwiOmNoZWNrZWRcIikpIG1vZGVsLnNldChzZWxlY3Rfa2V5LCB0cnVlKTtcbiAgICAgICAgZWxzZSBtb2RlbC5zZXQoc2VsZWN0X2tleSwgZmFsc2UpO1xuICAgIH0pXG4gICAgXG4gICAgcmV0dXJuICRyZXQ7XG59Il19
;