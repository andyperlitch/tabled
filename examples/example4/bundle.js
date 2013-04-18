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
    { id: "ID", key: "id", label: "ID", sort: "number", filter: "number" },
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
    table_width: 800    
});
var $pg = $("#playground");
tabled.render().$el.appendTo($pg);

function genRow(id){
    
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
    
    var seed = Math.random();
    var seed2 = Math.random();
    
    var first_name = fnames[ Math.round( seed * (fnames.length -1) ) ];
    var last_name = lnames[ Math.round( seed * (lnames.length -1) ) ];
    
    return {
        id: id,
        selected: false,
        first_name: first_name,
        last_name: last_name,
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
    var method = collection.length ? 'set' : 'reset' ;
    // var startTime = +new Date();
    collection[method](newRows);
    // var endTime = +new Date();
    // console.log((endTime - startTime)/1000);
    if (method === 'set') collection.trigger('update');
}, 3000);
},{"../../":2}],2:[function(require,module,exports){
var BaseView = require('./lib/BaseView');
var Column = require('./lib/Column').model;
var Columns = require('./lib/Column').collection;
var Thead = require('./lib/Thead');
var Tbody = require('./lib/Tbody');
var Scroller = require('./lib/Scroller');

var ConfigModel = Backbone.Model.extend({
    
    defaults: {
        // Makes table width and column widths adjustable
        adjustable_width: true,
        // Save the state of the table widths
        save_state: false,
        // Default minimum column width, in pixels
        min_column_width: 30,
        // Default width for the table itself. Either pixels or 'auto'
        table_width: 'auto',
        // Default max number of rows to render before scroll on tbody
        max_rows: 30,
        // Default offset for the tbody
        offset: 0,
        // Set in the rendering phase of the tbody (code smell...)
        total_rows: 0
    },
    
    validate: function(attrs) {
        if ( attrs.offset > Math.max(attrs.max_rows, attrs.total_rows) - attrs.max_rows ) {
            return "Offset cannot be that high.";
        }
        if (attrs.offset < 0) {
            return "Offset must be greater than 0";
        }
        if (attrs.max_rows < 1) {
            return "max_rows must atleast 1";
        }
    },
    getVisibleRows: function() {
        var total = 0;
        var offset = this.get('offset');
        var limit = this.get('max_rows');
        var rows_to_render = [];
        this.get("collection").each(function(row, i){
            
            if ( this.passesFilters(row) ) ++total;
            else return;
            
            if ( total <= offset ) return;
            
            if ( total > (offset + limit) ) return;
            
            rows_to_render.push(row);
            
        }, this);
        
        var prev_total = this.get('total_rows')*1;
        if (total !== prev_total) {
            this.set('total_rows', total)
            var newOffset = Math.min(total - limit, offset);
            if (newOffset === offset) this.trigger('update');
            else this.set('offset', newOffset);
            
            return false;
        }
        
        return rows_to_render;
    },
    passesFilters: function(row){
        return this.columns.every(function(column){
            if (column.get('filter_value') == "" || typeof column.get('filter') !== "function") return true;
            return this.passesFilter(row, column);
        }, this);
    },
    passesFilter: function(row, column){
        return column.get('filter')( column.get('filter_value'), row.get(column.get('key')), column.getFormatted(row), row );
    },
    
});

var Tabled = BaseView.extend({
    
    initialize: function(options) {

        // Ensure that this.collection (the data) is a backbone collection
        if ( !(this.collection instanceof Backbone.Collection) ) throw "Tabled must be provided with a backbone collection as its data";
        
        // Config object
        this.config = new ConfigModel(this.options);

        // Columns
        this.columns = new Columns(this.config.get("columns"),{config: this.config});
        this.config.columns = this.columns;
        
        // Subviews
        this.subview("thead", new Thead({
            collection: this.columns,
            config: this.config
        }));
        this.subview("tbody", new Tbody({
            collection: this.collection,
            columns: this.columns
        }));
        this.subview('scroller', new Scroller({
            model: this.config,
            tbody: this.subview('tbody')
        }));
        
        // State
        if (this.config.get("save_state")) {
            this.restorePreviousState();
        }
        
        // Listeners
        this.listenTo(this.columns, "change:width", this.onWidthChange );
        this.listenTo(this.columns, "change:filter_value", function(){
            this.config.set("offset", 0);
            this.renderBody();
        });
        this.listenTo(this.config, "change:max_rows", this.onMaxRowChange);
        this.listenTo(this.columns, "change:comparator", this.updateComparator);
        this.listenTo(this.columns, "sort", this.onColumnSort);
        
        // HACK: set up data comparator
        this.columns.updateComparator();
    },
    
    template: [
        '<div class="tabled-ctnr"><div class="tabled-inner">',
        '<div class="tabled">',
        '<div class="thead"></div>',
        '<div class="tbody-outer">',
        '<div class="tbody"></div>',
        '<div class="scroller"></div>',
        '</div>',
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
            '.thead': 'thead',
            '.tbody': 'tbody',
            '.scroller': 'scroller'
        });
        
        return this;
    },
    
    renderBody: function(){
        this.assign({
            '.tbody': 'tbody',
            '.scroller': 'scroller'
        });
    },
    
    renderHead: function(){
        this.assign({
            '.thead': 'thead'
        });
    },
    
    onWidthChange: function(){
        this.adjustInnerDiv();
        
        // Save the widths
        if (!this.config.get("save_state")) return;
        var widths = this.columns.reduce(function(memo, column, key){
            memo[column.get('id')] = column.get('width');
            return memo;
        }, {}, this);
        this.state('column_widths', widths);
    },
    
    onMaxRowChange: function(model, value) {
        this.renderBody();
        this.state('max_rows', value);
    },
    
    onColumnSort: function() {
        this.render();
        
        // Save sort
        if (!this.config.get("save_state")) return;
        var sorts = this.columns.col_sorts;
        this.state('column_sorts', sorts);
    },
    
    setWidths: function() {
        
        // Table's width
        var totalWidth = this.config.get("table_width") === 'auto' ? this.$el.width() : this.config.get("table_width");
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
        var defaultWidth = Math.max(Math.floor(avg_width), this.config.get("min_column_width")) ;
        makeDefault.forEach(function(column, key){
            var width = Math.max(defaultWidth, column.get('min_column_width') || defaultWidth);
            column.set('width', width);
            adjustedWidth += width;
        });
        this.$('.tabled-inner').width(adjustedWidth);
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
        
        // Horizontal
        var mouseX = evt.clientX;
        var col_state = this.columns.reduce(function(memo, column, index){
            memo[column.get('id')] = column.get('width');
            return memo;
        },{},this);
        
        // Vertical 
        var mouseY = evt.clientY;
        var row_height = $(".tr", this.$el).height();
        var initMax = this.config.get('max_rows');
        
        var table_resize = function(evt){
            // Horizontal
            var changeX = (evt.clientX - mouseX)/self.columns.length;
            self.columns.each(function(column){
                column.set({"width":col_state[column.get("id")]*1+changeX}, {validate:true});
            });
            
            // Vertical
            var changeY = (evt.clientY - mouseY);
            var abChangeY = Math.abs(changeY);
            if ( abChangeY > row_height) {
                abChangeY = Math.floor(abChangeY/row_height) * (changeY > 0 ? 1 : -1);
                self.config.set({'max_rows':initMax + abChangeY}, {validate:true});
            }
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
        if (colsorts !== undefined && colsorts.length === this.columns.length) {
            this.columns.col_sorts = colsorts;
            this.columns.sort();
        }
        
        // Check for row sort order
        // var rowsorts = 
        
        // Check for max_rows
        var max_rows = this.state('max_rows');
        if (max_rows) {
            this.config.set({'max_rows':max_rows},{validate:true});
        }
    },
    
    state: function(key, value) {
        var storage_key = 'tabled.'+this.config.get("id");
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
},{"./lib/Column":3,"./lib/BaseView":4,"./lib/Thead":5,"./lib/Tbody":6,"./lib/Scroller":7}],4:[function(require,module,exports){
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
            if (typeof view === "string") view = this.__subviews__[view];
            view.setElement(this.$(selector)).render();
        }, this);
    },
    
    remove: function () {
        this.trigger("clean_up");
        this.unbind();
        Backbone.View.prototype.remove.call(this);
    },
    
    subview: function(key, view){
        // Set up subview object
        var sv = this.__subviews__ = this.__subviews__ || {};
        
        // Check if getting
        if (view === undefined) return sv[key];
        
        // Add listener for removal event
        view.listenTo(this, "clean_up", view.remove);
        
        // Set the key
        sv[key] = view;
        
        // Allow chaining
        return view
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
            if ( newWidth < column.get("min_column_width")) return;
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
            view.listenTo(this, "clean_up", view.remove);
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
        this.$("input").val(this.model.get('filter_value'));
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
        this.trigger("clean_up")
        
        // render each th cell
        this.collection.each(function(column){
            var view = new FilterCell({ model: column });
            this.$el.append( view.render().el );
            view.listenTo(this, "clean_up", view.remove);
        }, this);
        return this;
    }
    
});

var Thead = BaseView.extend({
    
    initialize: function(options) {
        // Set config
        this.config = options.config;
        
        // Setup subviews
        this.subview("th_row", new ThRow({ collection: this.collection }));
        
        if (this.needsFilterRow()) {
            this.subview("filter_row", new FilterRow({ collection: this.collection }));
        }
        
        // Listen for when offset is not zero
        this.listenTo(this.config, "change:offset", function(model, offset){
            var toggleClass = offset === 0 ? 'removeClass' : 'addClass' ;
            this.$el[toggleClass]('overhang');
        });
    },
    
    template: '<div class="tr th-row"></div><div class="tr filter-row"></div>',
    
    render: function() {
        this.$el.html(this.template);
        this.assign({ '.th-row' : 'th_row' });
        if (this.subview('filter_row')) {
            this.assign({ '.filter-row' : 'filter_row' });
        }
        else this.$('.filter-row').remove();
        return this;
    },
    
    needsFilterRow: function() {
        return this.collection.some(function(column){
            return (typeof column.get('filter') !== 'undefined')
        })
    }
    
});
exports = module.exports = Thead;
},{"./BaseView":4}],3:[function(require,module,exports){
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
        var format = this.get('format');
        if (select) {
            this.set("format", Formats.select );
            this.set("select_key", this.get("key"));
        } else if (typeof format === "string" && typeof Formats[format] !== "undefined") {
            this.set("format", Formats[format]);
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
        this.config = options.config;
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
    
    setMinWidth: function(model) {
        if (model.hasOwnProperty('min_column_width')) return;
        
        model['min_column_width'] = this.config.get("min_column_width");
    },
    
    getInitialRowSorts: function(models) {
        var self = this;
        var defaultSorts = _.pluck(models, "id");
        var sorts;
        if (this.config.get("row_sorts")) {
            sorts = this.config.get("row_sorts");
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
        if (this.config.get("col_sorts")) {
            sorts = this.config.get("col_sorts");
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
},{"./Filters":8,"./Sorts":9,"./Formats":10}],6:[function(require,module,exports){
var BaseView = require('./BaseView');

var Trow = BaseView.extend({
    
    className: 'tr',
    
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },
    
    render: function() {
        this.trigger("clean_up");
        this.$el.empty();
        
        this.collection.each(function(column){
            var id = column.get('id');
            var width = column.get('width');
            var formatted = column.getFormatted(this.model);
            var $view = $('<div class="td col-'+id+'" style="width:'+width+'px"><div class="cell-inner"></div></div>');
            $view.find('.cell-inner').append(formatted);
            this.$el.append($view);
        }, this);
        
        return this;
    }
});



var Tbody = BaseView.extend({
    
    initialize: function(options) {
        this.columns = options.columns;
        this.config = this.columns.config;
        this.listenTo(this.collection, "reset", this.render);
        this.listenTo(this.collection, "sort", this.render);
        this.listenTo(this.collection, "update", this.render);
        this.listenTo(this.config, "update", this.render);
        this.listenTo(this.columns, "change:width", this.adjustColumnWidth );
        this.listenTo(this.config, "change:offset", this.render);
    },
    
    adjustColumnWidth: function(model, newWidth, options){
        this.$('.td.col-'+model.get("id")).width(newWidth);
    },
    
    // Renders the visible rows given the current offset and max_rows
    // properties on the config object.
    render: function() {
        this.$el.empty();
        this.trigger("clean_up");
        var rows_to_render = this.config.getVisibleRows();
        if (rows_to_render === false) return;
        
        rows_to_render.forEach(function(row){
            var rowView = new Trow({
                model: row,
                collection: this.columns
            });
            this.$el.append( rowView.render().el );
            rowView.listenTo(this, "clean_up", rowView.remove);
        }, this);
        this.trigger('rendered');
        return this;
    },
    
    events: {
        "wheel": "onMouseWheel",
        "mousewheel": "onMouseWheel"
    },
    
    onMouseWheel: function(evt) {
        // BigInteger
        var self = this;
        
        // normalize webkit/firefox scroll values
        var deltaY = -evt.originalEvent.wheelDeltaY || evt.originalEvent.deltaY * 100;
        var movement = Math.round(deltaY / 100);
        if (isNaN(movement)) return;
        var origOffset = this.config.get("offset");
        var limit = this.config.get("max_rows");
        var offset = Math.min( this.collection.length - limit, Math.max( 0, origOffset + movement));
        
        this.config.set({"offset": offset}, {validate: true} );
        
        // Prevent default only when necessary
        if (offset > 0 && offset < this.collection.length - limit) {
            evt.preventDefault();
            evt.originalEvent.preventDefault();
        }
    }
    
});
exports = module.exports = Tbody;
},{"./BaseView":4}],7:[function(require,module,exports){
var BaseView = require('./BaseView');
var Scroller = BaseView.extend({
    
    initialize: function(options) {
        this.listenTo(this.model, "change:offset", this.updatePosition);
        this.listenTo(options.tbody, "rendered", this.render);
    },    
    
    template: '<div class="inner"></div>',
    
    render: function() {
        this.$el.html(this.template);
        this.updatePosition();
        return this;
    },
    
    updatePosition: function() {
        var offset = this.model.get('offset');
        var limit = this.model.get('max_rows');
        var total = this.model.get('total_rows');
        var actual_h = this.$el.parent().height();
        var actual_r = actual_h / total;
        var scroll_height = limit * actual_r;
        if (scroll_height < 10) {
            var correction = 10 - scroll_height;
            actual_h -= correction;
            actual_r = actual_h / total;
        }
        var scroll_top = offset * actual_r;
        
        if (scroll_height < actual_h && total > limit) {
            this.$(".inner").css({
                height: scroll_height,
                top: scroll_top
            });
        } else {
            this.$(".inner").hide();
        }
    },
    
    events: {
        "mousedown .inner": "grabScroller"
    },
    
    grabScroller: function(evt){
        evt.preventDefault();
        var self = this;
        var mouseY = evt.clientY;
        var offsetY = evt.offsetY;
        var ratio = this.model.get('total_rows') / this.$el.parent().height();
        var initOffset = self.model.get('offset');
        
        function moveScroller(evt){
            var curMouse = evt.clientY;
            var change = curMouse - mouseY;
            var newOffset = Math.max(Math.round(ratio * change) + initOffset, 0);
            newOffset = Math.min(newOffset, self.model.get('total_rows') - self.model.get('max_rows'))
            self.model.set({'offset':newOffset}, {validate: true});
        }
        
        function releaseScroller(evt){
            $(window).off("mousemove", moveScroller);
        }
        
        $(window).on("mousemove", moveScroller);
        $(window).one("mouseup", releaseScroller);
    }
});

exports = module.exports = Scroller
},{"./BaseView":4}],8:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
var Bormats = require('bormat');
exports.select = function(value, model) {
    var select_key = 'selected';
    var checked = model[select_key] === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox" class="selectbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb
    .on('click mousedown', function(evt){
        evt.preventDefault();
    })
    .on('mouseup', function(evt) {
        var selected = !! model[select_key];
        var is_selected_now = model[select_key] = !selected;
        $cb.prop('checked', is_selected_now);
        model.trigger('change_selected', model, selected);
    })
    
    return $ret;
}

var timeSince = Bormats.timeSince;

exports.timeSince = function(value) {
    if (/^\d+$/.test(value)) {
        var newVal = timeSince(value) || "a moment";
        return newVal + " ago";
    }
    return value;
}

exports.commaInt = Bormats.commaGroups;
},{"bormat":11}],11:[function(require,module,exports){
function timeSince(timestamp, compareDate, timeChunk) {
    var now = compareDate === undefined ? +new Date() : compareDate;
    var remaining = (timeChunk !== undefined) ? timeChunk : now - timestamp;
    var string = "";
    var separator = ", ";
    var level = 0;
    var max_levels = 3;
    var milli_per_second = 1000;
    var milli_per_minute = milli_per_second * 60;
    var milli_per_hour = milli_per_minute * 60;
    var milli_per_day = milli_per_hour * 24;
    var milli_per_week = milli_per_day * 7;
    var milli_per_month = milli_per_week * 4;
    var milli_per_year = milli_per_day * 365;
    
    var levels = [
    
        { plural: "years", singular: "year", ms: milli_per_year },
        { plural: "months", singular: "month", ms: milli_per_month },
        { plural: "weeks", singular: "week", ms: milli_per_week },
        { plural: "days", singular: "day", ms: milli_per_day },
        { plural: "hours", singular: "hour", ms: milli_per_hour },
        { plural: "minutes", singular: "minute", ms: milli_per_minute },
        { plural: "seconds", singular: "second", ms: milli_per_second }
    ];
    
    for (var i=0; i < levels.length; i++) {
        if ( remaining < levels[i].ms ) continue;
        level++;
        var num = Math.floor( remaining / levels[i].ms );
        var label = num == 1 ? levels[i].singular : levels[i].plural ;
        string += num + " " + label + separator;
        remaining %= levels[i].ms;
        if ( level >= max_levels ) break;
    };
    
    string = string.substring(0, string.length - separator.length);
    return string;
}

function commaGroups(value) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

exports.timeSince = timeSince;
exports.commaGroups = commaGroups;
},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UaGVhZC5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvQ29sdW1uLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UYm9keS5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU2Nyb2xsZXIuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1NvcnRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Gb3JtYXRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL25vZGVfbW9kdWxlcy9ib3JtYXQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgVGFibGVkID0gcmVxdWlyZSgnLi4vLi4vJyk7XG5cbmZ1bmN0aW9uIGluY2hlczJmZWV0KGluY2hlcywgbW9kZWwpe1xuICAgIHZhciBmZWV0ID0gTWF0aC5mbG9vcihpbmNoZXMvMTIpO1xuICAgIHZhciBpbmNoZXMgPSBpbmNoZXMgJSAxMjtcbiAgICByZXR1cm4gZmVldCArIFwiJ1wiICsgaW5jaGVzICsgJ1wiJztcbn1cblxuZnVuY3Rpb24gZmVldF9maWx0ZXIodGVybSwgdmFsdWUsIGZvcm1hdHRlZCwgbW9kZWwpIHtcbiAgICBpZiAodGVybSA9PSBcInRhbGxcIikgcmV0dXJuIHZhbHVlID4gNzA7XG4gICAgaWYgKHRlcm0gPT0gXCJzaG9ydFwiKSByZXR1cm4gdmFsdWUgPCA2OTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNvbHVtbnMgPSBbXG4gICAgeyBpZDogXCJzZWxlY3RvclwiLCBrZXk6IFwic2VsZWN0ZWRcIiwgbGFiZWw6IFwiXCIsIHNlbGVjdDogdHJ1ZSwgd2lkdGg6IDMwLCBsb2NrX3dpZHRoOiB0cnVlIH0sXG4gICAgeyBpZDogXCJJRFwiLCBrZXk6IFwiaWRcIiwgbGFiZWw6IFwiSURcIiwgc29ydDogXCJudW1iZXJcIiwgZmlsdGVyOiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJmaXJzdF9uYW1lXCIsIGtleTogXCJmaXJzdF9uYW1lXCIsIGxhYmVsOiBcIkZpcnN0IE5hbWVcIiwgc29ydDogXCJzdHJpbmdcIiwgZmlsdGVyOiBcImxpa2VcIiwgIH0sXG4gICAgeyBpZDogXCJsYXN0X25hbWVcIiwga2V5OiBcImxhc3RfbmFtZVwiLCBsYWJlbDogXCJMYXN0IE5hbWVcIiwgc29ydDogXCJzdHJpbmdcIiwgZmlsdGVyOiBcImxpa2VcIiwgIH0sXG4gICAgeyBpZDogXCJhZ2VcIiwga2V5OiBcImFnZVwiLCBsYWJlbDogXCJBZ2VcIiwgc29ydDogXCJudW1iZXJcIiwgZmlsdGVyOiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJoZWlnaHRcIiwga2V5OiBcImhlaWdodFwiLCBsYWJlbDogXCJIZWlnaHRcIiwgZm9ybWF0OiBpbmNoZXMyZmVldCwgZmlsdGVyOiBmZWV0X2ZpbHRlciwgc29ydDogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwid2VpZ2h0XCIsIGtleTogXCJ3ZWlnaHRcIiwgbGFiZWw6IFwiV2VpZ2h0XCIsIGZpbHRlcjogXCJudW1iZXJcIiwgc29ydDogXCJudW1iZXJcIiB9XG5dO1xudmFyIGNvbGxlY3Rpb24gPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbihbXSk7XG52YXIgdGFibGVkID0gbmV3IFRhYmxlZCh7XG4gICAgY29sbGVjdGlvbjogY29sbGVjdGlvbixcbiAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgIHRhYmxlX3dpZHRoOiA4MDAgICAgXG59KTtcbnZhciAkcGcgPSAkKFwiI3BsYXlncm91bmRcIik7XG50YWJsZWQucmVuZGVyKCkuJGVsLmFwcGVuZFRvKCRwZyk7XG5cbmZ1bmN0aW9uIGdlblJvdyhpZCl7XG4gICAgXG4gICAgdmFyIGZuYW1lcyA9IFtcbiAgICAgICAgXCJqb2VcIixcbiAgICAgICAgXCJmcmVkXCIsXG4gICAgICAgIFwiZnJhbmtcIixcbiAgICAgICAgXCJqaW1cIixcbiAgICAgICAgXCJtaWtlXCIsXG4gICAgICAgIFwiZ2FyeVwiLFxuICAgICAgICBcImF6aXpcIlxuICAgIF07XG5cbiAgICB2YXIgbG5hbWVzID0gW1xuICAgICAgICBcInN0ZXJsaW5nXCIsXG4gICAgICAgIFwic21pdGhcIixcbiAgICAgICAgXCJlcmlja3NvblwiLFxuICAgICAgICBcImJ1cmtlXCJcbiAgICBdO1xuICAgIFxuICAgIHZhciBzZWVkID0gTWF0aC5yYW5kb20oKTtcbiAgICB2YXIgc2VlZDIgPSBNYXRoLnJhbmRvbSgpO1xuICAgIFxuICAgIHZhciBmaXJzdF9uYW1lID0gZm5hbWVzWyBNYXRoLnJvdW5kKCBzZWVkICogKGZuYW1lcy5sZW5ndGggLTEpICkgXTtcbiAgICB2YXIgbGFzdF9uYW1lID0gbG5hbWVzWyBNYXRoLnJvdW5kKCBzZWVkICogKGxuYW1lcy5sZW5ndGggLTEpICkgXTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgICBpZDogaWQsXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZSxcbiAgICAgICAgZmlyc3RfbmFtZTogZmlyc3RfbmFtZSxcbiAgICAgICAgbGFzdF9uYW1lOiBsYXN0X25hbWUsXG4gICAgICAgIGFnZTogTWF0aC5jZWlsKHNlZWQgKiA3NSkgKyAxNSxcbiAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKCBzZWVkMiAqIDM2ICkgKyA0OCxcbiAgICAgICAgd2VpZ2h0OiBNYXRoLnJvdW5kKCBzZWVkMiAqIDEzMCApICsgOTBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdlblJvd3MobnVtKXtcbiAgICB2YXIgcmV0VmFsID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbnVtOyBpKyspIHtcbiAgICAgICAgcmV0VmFsLnB1c2goZ2VuUm93KGkpKTtcbiAgICB9O1xuICAgIHJldHVybiByZXRWYWw7XG59XG5cbndpbmRvdy5zdG9wID0gZmFsc2U7XG52YXIgaW50dmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICBpZiAod2luZG93LnN0b3ApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnR2YWwpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBuZXdSb3dzID0gZ2VuUm93cygzMDApO1xuICAgIHZhciBtZXRob2QgPSBjb2xsZWN0aW9uLmxlbmd0aCA/ICdzZXQnIDogJ3Jlc2V0JyA7XG4gICAgLy8gdmFyIHN0YXJ0VGltZSA9ICtuZXcgRGF0ZSgpO1xuICAgIGNvbGxlY3Rpb25bbWV0aG9kXShuZXdSb3dzKTtcbiAgICAvLyB2YXIgZW5kVGltZSA9ICtuZXcgRGF0ZSgpO1xuICAgIC8vIGNvbnNvbGUubG9nKChlbmRUaW1lIC0gc3RhcnRUaW1lKS8xMDAwKTtcbiAgICBpZiAobWV0aG9kID09PSAnc2V0JykgY29sbGVjdGlvbi50cmlnZ2VyKCd1cGRhdGUnKTtcbn0sIDMwMDApOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vbGliL0Jhc2VWaWV3Jyk7XG52YXIgQ29sdW1uID0gcmVxdWlyZSgnLi9saWIvQ29sdW1uJykubW9kZWw7XG52YXIgQ29sdW1ucyA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLmNvbGxlY3Rpb247XG52YXIgVGhlYWQgPSByZXF1aXJlKCcuL2xpYi9UaGVhZCcpO1xudmFyIFRib2R5ID0gcmVxdWlyZSgnLi9saWIvVGJvZHknKTtcbnZhciBTY3JvbGxlciA9IHJlcXVpcmUoJy4vbGliL1Njcm9sbGVyJyk7XG5cbnZhciBDb25maWdNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgLy8gTWFrZXMgdGFibGUgd2lkdGggYW5kIGNvbHVtbiB3aWR0aHMgYWRqdXN0YWJsZVxuICAgICAgICBhZGp1c3RhYmxlX3dpZHRoOiB0cnVlLFxuICAgICAgICAvLyBTYXZlIHRoZSBzdGF0ZSBvZiB0aGUgdGFibGUgd2lkdGhzXG4gICAgICAgIHNhdmVfc3RhdGU6IGZhbHNlLFxuICAgICAgICAvLyBEZWZhdWx0IG1pbmltdW0gY29sdW1uIHdpZHRoLCBpbiBwaXhlbHNcbiAgICAgICAgbWluX2NvbHVtbl93aWR0aDogMzAsXG4gICAgICAgIC8vIERlZmF1bHQgd2lkdGggZm9yIHRoZSB0YWJsZSBpdHNlbGYuIEVpdGhlciBwaXhlbHMgb3IgJ2F1dG8nXG4gICAgICAgIHRhYmxlX3dpZHRoOiAnYXV0bycsXG4gICAgICAgIC8vIERlZmF1bHQgbWF4IG51bWJlciBvZiByb3dzIHRvIHJlbmRlciBiZWZvcmUgc2Nyb2xsIG9uIHRib2R5XG4gICAgICAgIG1heF9yb3dzOiAzMCxcbiAgICAgICAgLy8gRGVmYXVsdCBvZmZzZXQgZm9yIHRoZSB0Ym9keVxuICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgIC8vIFNldCBpbiB0aGUgcmVuZGVyaW5nIHBoYXNlIG9mIHRoZSB0Ym9keSAoY29kZSBzbWVsbC4uLilcbiAgICAgICAgdG90YWxfcm93czogMFxuICAgIH0sXG4gICAgXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgIGlmICggYXR0cnMub2Zmc2V0ID4gTWF0aC5tYXgoYXR0cnMubWF4X3Jvd3MsIGF0dHJzLnRvdGFsX3Jvd3MpIC0gYXR0cnMubWF4X3Jvd3MgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJPZmZzZXQgY2Fubm90IGJlIHRoYXQgaGlnaC5cIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXR0cnMub2Zmc2V0IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiT2Zmc2V0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDBcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXR0cnMubWF4X3Jvd3MgPCAxKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJtYXhfcm93cyBtdXN0IGF0bGVhc3QgMVwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXRWaXNpYmxlUm93czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIHZhciBsaW1pdCA9IHRoaXMuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICB2YXIgcm93c190b19yZW5kZXIgPSBbXTtcbiAgICAgICAgdGhpcy5nZXQoXCJjb2xsZWN0aW9uXCIpLmVhY2goZnVuY3Rpb24ocm93LCBpKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCB0aGlzLnBhc3Nlc0ZpbHRlcnMocm93KSApICsrdG90YWw7XG4gICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCB0b3RhbCA8PSBvZmZzZXQgKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdG90YWwgPiAob2Zmc2V0ICsgbGltaXQpICkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByb3dzX3RvX3JlbmRlci5wdXNoKHJvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgcHJldl90b3RhbCA9IHRoaXMuZ2V0KCd0b3RhbF9yb3dzJykqMTtcbiAgICAgICAgaWYgKHRvdGFsICE9PSBwcmV2X3RvdGFsKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgndG90YWxfcm93cycsIHRvdGFsKVxuICAgICAgICAgICAgdmFyIG5ld09mZnNldCA9IE1hdGgubWluKHRvdGFsIC0gbGltaXQsIG9mZnNldCk7XG4gICAgICAgICAgICBpZiAobmV3T2Zmc2V0ID09PSBvZmZzZXQpIHRoaXMudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuc2V0KCdvZmZzZXQnLCBuZXdPZmZzZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByb3dzX3RvX3JlbmRlcjtcbiAgICB9LFxuICAgIHBhc3Nlc0ZpbHRlcnM6IGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbHVtbnMuZXZlcnkoZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIGlmIChjb2x1bW4uZ2V0KCdmaWx0ZXJfdmFsdWUnKSA9PSBcIlwiIHx8IHR5cGVvZiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhc3Nlc0ZpbHRlcihyb3csIGNvbHVtbik7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgcGFzc2VzRmlsdGVyOiBmdW5jdGlvbihyb3csIGNvbHVtbil7XG4gICAgICAgIHJldHVybiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSggY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJyksIHJvdy5nZXQoY29sdW1uLmdldCgna2V5JykpLCBjb2x1bW4uZ2V0Rm9ybWF0dGVkKHJvdyksIHJvdyApO1xuICAgIH0sXG4gICAgXG59KTtcblxudmFyIFRhYmxlZCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHRoaXMuY29sbGVjdGlvbiAodGhlIGRhdGEpIGlzIGEgYmFja2JvbmUgY29sbGVjdGlvblxuICAgICAgICBpZiAoICEodGhpcy5jb2xsZWN0aW9uIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbikgKSB0aHJvdyBcIlRhYmxlZCBtdXN0IGJlIHByb3ZpZGVkIHdpdGggYSBiYWNrYm9uZSBjb2xsZWN0aW9uIGFzIGl0cyBkYXRhXCI7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWcgb2JqZWN0XG4gICAgICAgIHRoaXMuY29uZmlnID0gbmV3IENvbmZpZ01vZGVsKHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgLy8gQ29sdW1uc1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBuZXcgQ29sdW1ucyh0aGlzLmNvbmZpZy5nZXQoXCJjb2x1bW5zXCIpLHtjb25maWc6IHRoaXMuY29uZmlnfSk7XG4gICAgICAgIHRoaXMuY29uZmlnLmNvbHVtbnMgPSB0aGlzLmNvbHVtbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJ2aWV3c1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0aGVhZFwiLCBuZXcgVGhlYWQoe1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zLFxuICAgICAgICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZ1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuc3VidmlldyhcInRib2R5XCIsIG5ldyBUYm9keSh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoJ3Njcm9sbGVyJywgbmV3IFNjcm9sbGVyKHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgIHRib2R5OiB0aGlzLnN1YnZpZXcoJ3Rib2R5JylcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGVcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHtcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZVByZXZpb3VzU3RhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuZXJzXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTp3aWR0aFwiLCB0aGlzLm9uV2lkdGhDaGFuZ2UgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmZpbHRlcl92YWx1ZVwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KFwib2Zmc2V0XCIsIDApO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJCb2R5KCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTptYXhfcm93c1wiLCB0aGlzLm9uTWF4Um93Q2hhbmdlKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgdGhpcy51cGRhdGVDb21wYXJhdG9yKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwic29ydFwiLCB0aGlzLm9uQ29sdW1uU29ydCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIQUNLOiBzZXQgdXAgZGF0YSBjb21wYXJhdG9yXG4gICAgICAgIHRoaXMuY29sdW1ucy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogW1xuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZC1jdG5yXCI+PGRpdiBjbGFzcz1cInRhYmxlZC1pbm5lclwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFibGVkXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0aGVhZFwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGJvZHktb3V0ZXJcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRib2R5XCI+PC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJzY3JvbGxlclwiPjwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS10YWJsZVwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj48L2Rpdj4nXG4gICAgXS5qb2luKFwiXCIpLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsIG1hcmt1cFxuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAvLyBTZXQgdGhlIHdpZHRocyBvZiB0aGUgY29sdW1uc1xuICAgICAgICB0aGlzLnNldFdpZHRocygpO1xuICAgICAgICAvLyAoUmUpcmVuZGVyIHN1YnZpZXdzXG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnLFxuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keScsXG4gICAgICAgICAgICAnLnNjcm9sbGVyJzogJ3Njcm9sbGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyQm9keTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keScsXG4gICAgICAgICAgICAnLnNjcm9sbGVyJzogJ3Njcm9sbGVyJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgb25XaWR0aENoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hZGp1c3RJbm5lckRpdigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0aGUgd2lkdGhzXG4gICAgICAgIGlmICghdGhpcy5jb25maWcuZ2V0KFwic2F2ZV9zdGF0ZVwiKSkgcmV0dXJuO1xuICAgICAgICB2YXIgd2lkdGhzID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICBtZW1vW2NvbHVtbi5nZXQoJ2lkJyldID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LCB7fSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnLCB3aWR0aHMpO1xuICAgIH0sXG4gICAgXG4gICAgb25NYXhSb3dDaGFuZ2U6IGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSkge1xuICAgICAgICB0aGlzLnJlbmRlckJvZHkoKTtcbiAgICAgICAgdGhpcy5zdGF0ZSgnbWF4X3Jvd3MnLCB2YWx1ZSk7XG4gICAgfSxcbiAgICBcbiAgICBvbkNvbHVtblNvcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzb3J0XG4gICAgICAgIGlmICghdGhpcy5jb25maWcuZ2V0KFwic2F2ZV9zdGF0ZVwiKSkgcmV0dXJuO1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbHVtbnMuY29sX3NvcnRzO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnLCBzb3J0cyk7XG4gICAgfSxcbiAgICBcbiAgICBzZXRXaWR0aHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gVGFibGUncyB3aWR0aFxuICAgICAgICB2YXIgdG90YWxXaWR0aCA9IHRoaXMuY29uZmlnLmdldChcInRhYmxlX3dpZHRoXCIpID09PSAnYXV0bycgPyB0aGlzLiRlbC53aWR0aCgpIDogdGhpcy5jb25maWcuZ2V0KFwidGFibGVfd2lkdGhcIik7XG4gICAgICAgIHZhciBtYWtlRGVmYXVsdCA9IFtdO1xuICAgICAgICB2YXIgYWRqdXN0ZWRXaWR0aCA9IDA7XG4gICAgICAgIHRoaXMuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciBjb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIG1pbl9jb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJylcbiAgICAgICAgICAgIGlmICggY29sX3dpZHRoICkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gY29sX3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWluX2NvbF93aWR0aCkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gbWluX2NvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgbWFrZURlZmF1bHQucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBhdmdfd2lkdGggPSBtYWtlRGVmYXVsdC5sZW5ndGggPyB0b3RhbFdpZHRoL21ha2VEZWZhdWx0Lmxlbmd0aCA6IDAgO1xuICAgICAgICB2YXIgZGVmYXVsdFdpZHRoID0gTWF0aC5tYXgoTWF0aC5mbG9vcihhdmdfd2lkdGgpLCB0aGlzLmNvbmZpZy5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpKSA7XG4gICAgICAgIG1ha2VEZWZhdWx0LmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gTWF0aC5tYXgoZGVmYXVsdFdpZHRoLCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJykgfHwgZGVmYXVsdFdpZHRoKTtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoJ3dpZHRoJywgd2lkdGgpO1xuICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSB3aWR0aDtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJCgnLnRhYmxlZC1pbm5lcicpLndpZHRoKGFkanVzdGVkV2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0SW5uZXJEaXY6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpIHx8IGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vKjEgKyB3aWR0aCoxO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgdGhpcy4kKCcudGFibGVkLWlubmVyJykud2lkdGgod2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdtb3VzZWRvd24gLnJlc2l6ZS10YWJsZSc6ICdncmFiVGFibGVSZXNpemVyJ1xuICAgIH0sXG4gICAgXG4gICAgZ3JhYlRhYmxlUmVzaXplcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBjb2xfc3RhdGUgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwgaW5kZXgpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSx7fSx0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZlcnRpY2FsIFxuICAgICAgICB2YXIgbW91c2VZID0gZXZ0LmNsaWVudFk7XG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gJChcIi50clwiLCB0aGlzLiRlbCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBpbml0TWF4ID0gdGhpcy5jb25maWcuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHRhYmxlX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgICAgICAvLyBIb3Jpem9udGFsXG4gICAgICAgICAgICB2YXIgY2hhbmdlWCA9IChldnQuY2xpZW50WCAtIG1vdXNlWCkvc2VsZi5jb2x1bW5zLmxlbmd0aDtcbiAgICAgICAgICAgIHNlbGYuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOmNvbF9zdGF0ZVtjb2x1bW4uZ2V0KFwiaWRcIildKjErY2hhbmdlWH0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgICAgIHZhciBjaGFuZ2VZID0gKGV2dC5jbGllbnRZIC0gbW91c2VZKTtcbiAgICAgICAgICAgIHZhciBhYkNoYW5nZVkgPSBNYXRoLmFicyhjaGFuZ2VZKTtcbiAgICAgICAgICAgIGlmICggYWJDaGFuZ2VZID4gcm93X2hlaWdodCkge1xuICAgICAgICAgICAgICAgIGFiQ2hhbmdlWSA9IE1hdGguZmxvb3IoYWJDaGFuZ2VZL3Jvd19oZWlnaHQpICogKGNoYW5nZVkgPiAwID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNvbmZpZy5zZXQoeydtYXhfcm93cyc6aW5pdE1heCArIGFiQ2hhbmdlWX0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCB0YWJsZV9yZXNpemUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ29tcGFyYXRvcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSBmbjtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB0aGlzLmNvbGxlY3Rpb24uc29ydCgpO1xuICAgIH0sXG4gICAgXG4gICAgcmVzdG9yZVByZXZpb3VzU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBDaGVjayB3aWR0aHNcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnKTtcbiAgICAgICAgaWYgKHdpZHRocyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBfLmVhY2god2lkdGhzLCBmdW5jdGlvbih2YWwsIGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmdldChrZXkpLnNldCgnd2lkdGgnLCB2YWwpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBjb2x1bW4gc29ydCBvcmRlclxuICAgICAgICB2YXIgY29sc29ydHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnKTtcbiAgICAgICAgaWYgKGNvbHNvcnRzICE9PSB1bmRlZmluZWQgJiYgY29sc29ydHMubGVuZ3RoID09PSB0aGlzLmNvbHVtbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbnMuY29sX3NvcnRzID0gY29sc29ydHM7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbnMuc29ydCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3Igcm93IHNvcnQgb3JkZXJcbiAgICAgICAgLy8gdmFyIHJvd3NvcnRzID0gXG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgbWF4X3Jvd3NcbiAgICAgICAgdmFyIG1heF9yb3dzID0gdGhpcy5zdGF0ZSgnbWF4X3Jvd3MnKTtcbiAgICAgICAgaWYgKG1heF9yb3dzKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5zZXQoeydtYXhfcm93cyc6bWF4X3Jvd3N9LHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHN0YXRlOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlX2tleSA9ICd0YWJsZWQuJyt0aGlzLmNvbmZpZy5nZXQoXCJpZFwiKTtcbiAgICAgICAgdmFyIHN0b3JlID0gdGhpcy5zdG9yZSB8fCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShzdG9yYWdlX2tleSkgfHwge307XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHN0b3JlICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0b3JlID0gSlNPTi5wYXJzZShzdG9yZSk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzdG9yZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkoc3RvcmUpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHN0b3JlW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYWJsZWQiLCJ2YXIgQmFzZVZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgLy8gQXNzaWducyBhIHN1YnZpZXcgdG8gYSBqcXVlcnkgc2VsZWN0b3IgaW4gdGhpcyB2aWV3J3MgZWxcbiAgICBhc3NpZ24gOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHZpZXcpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9ycztcbiAgICAgICAgaWYgKF8uaXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSBzZWxlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdG9ycyA9IHt9O1xuICAgICAgICAgICAgc2VsZWN0b3JzW3NlbGVjdG9yXSA9IHZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZWxlY3RvcnMpIHJldHVybjtcbiAgICAgICAgXy5lYWNoKHNlbGVjdG9ycywgZnVuY3Rpb24gKHZpZXcsIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZpZXcgPT09IFwic3RyaW5nXCIpIHZpZXcgPSB0aGlzLl9fc3Vidmlld3NfX1t2aWV3XTtcbiAgICAgICAgICAgIHZpZXcuc2V0RWxlbWVudCh0aGlzLiQoc2VsZWN0b3IpKS5yZW5kZXIoKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIik7XG4gICAgICAgIHRoaXMudW5iaW5kKCk7XG4gICAgICAgIEJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgc3VidmlldzogZnVuY3Rpb24oa2V5LCB2aWV3KXtcbiAgICAgICAgLy8gU2V0IHVwIHN1YnZpZXcgb2JqZWN0XG4gICAgICAgIHZhciBzdiA9IHRoaXMuX19zdWJ2aWV3c19fID0gdGhpcy5fX3N1YnZpZXdzX18gfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBnZXR0aW5nXG4gICAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHJldHVybiBzdltrZXldO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3RlbmVyIGZvciByZW1vdmFsIGV2ZW50XG4gICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJjbGVhbl91cFwiLCB2aWV3LnJlbW92ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdGhlIGtleVxuICAgICAgICBzdltrZXldID0gdmlldztcbiAgICAgICAgXG4gICAgICAgIC8vIEFsbG93IGNoYWluaW5nXG4gICAgICAgIHJldHVybiB2aWV3XG4gICAgfVxuICAgIFxufSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGhDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0aCcsXG4gICAgXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCIgdGl0bGU9XCI8JT0gbGFiZWwgJT5cIj48c3BhbiBjbGFzcz1cInRoLWhlYWRlclwiPjwlPSBsYWJlbCAlPjwvc3Bhbj48L2Rpdj48JSBpZihsb2NrX3dpZHRoICE9PSB0cnVlKSB7JT48c3BhbiBjbGFzcz1cInJlc2l6ZVwiPjwvc3Bhbj48JX0lPicpLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5yZW5kZXIgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihtb2RlbCwgd2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIganNvbiA9IHRoaXMubW9kZWwuc2VyaWFsaXplKCk7XG4gICAgICAgIHZhciBzb3J0X2NsYXNzID0ganNvbi5zb3J0X3ZhbHVlID8gKGpzb24uc29ydF92YWx1ZSA9PSBcImRcIiA/IFwiZGVzY1wiIDogXCJhc2NcIiApIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FzYyBkZXNjJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY29sLScranNvbi5pZCtcIiBcIitzb3J0X2NsYXNzKVxuICAgICAgICAgICAgLndpZHRoKGpzb24ud2lkdGgpXG4gICAgICAgICAgICAuaHRtbCh0aGlzLnRlbXBsYXRlKGpzb24pKTtcbiAgICAgICAgaWYgKHNvcnRfY2xhc3MgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi50aC1oZWFkZXJcIikucHJlcGVuZCgnPGkgY2xhc3M9XCInK3NvcnRfY2xhc3MrJy1pY29uXCI+PC9pPiAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAucmVzaXplXCI6IFwiZ3JhYlJlc2l6ZXJcIixcbiAgICAgICAgXCJkYmxjbGljayAucmVzaXplXCI6IFwiZml0VG9Db250ZW50XCIsXG4gICAgICAgIFwibW91c2V1cCAudGgtaGVhZGVyXCI6IFwiY2hhbmdlQ29sdW1uU29ydFwiLFxuICAgICAgICBcIm1vdXNlZG93blwiOiBcImdyYWJDb2x1bW5cIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbHVtbldpZHRoID0gdGhpcy5tb2RlbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgLy8gSGFuZGxlciBmb3Igd2hlbiBtb3VzZSBpcyBtb3ZpbmdcbiAgICAgICAgdmFyIGNvbF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLm1vZGVsO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGV2dC5jbGllbnRYIC0gbW91c2VYO1xuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gY29sdW1uV2lkdGggKyBjaGFuZ2U7XG4gICAgICAgICAgICBpZiAoIG5ld1dpZHRoIDwgY29sdW1uLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIikpIHJldHVybjtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjogbmV3V2lkdGh9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgZml0VG9Db250ZW50OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IDA7XG4gICAgICAgIHZhciBtaW5fd2lkdGggPSB0aGlzLm1vZGVsLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKTtcbiAgICAgICAgdmFyICRjdHggPSB0aGlzLiRlbC5wYXJlbnRzKCcudGFibGVkJykuZmluZCgnLnRib2R5Jyk7XG4gICAgICAgICQoXCIudGQuY29sLVwiK2lkK1wiIC5jZWxsLWlubmVyXCIsICRjdHgpLmVhY2goZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgbmV3X3dpZHRoID0gTWF0aC5tYXgobmV3X3dpZHRoLCQodGhpcykub3V0ZXJXaWR0aCh0cnVlKSwgbWluX3dpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnd2lkdGgnOm5ld193aWR0aH0se3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgfSxcbiAgICBcbiAgICBjaGFuZ2VDb2x1bW5Tb3J0OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG1vZGVsLmdldChcInNvcnRcIikgIT09IFwiZnVuY3Rpb25cIiB8fCBtb2RlbC5nZXQoXCJtb3ZpbmdcIikgPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJfc29ydCA9IG1vZGVsLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2dC5zaGlmdEtleSkge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBhbGwgc29ydHNcbiAgICAgICAgICAgIG1vZGVsLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2wpe1xuICAgICAgICAgICAgICAgIGlmIChjb2wgIT09IG1vZGVsKSBjb2wuc2V0KHtcInNvcnRfdmFsdWVcIjogXCJcIn0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoKGN1cl9zb3J0KSB7XG4gICAgICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImFcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYVwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBncmFiQ29sdW1uOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBvZmZzZXRYID0gZXZ0Lm9mZnNldFg7XG4gICAgICAgIHZhciB0aHJlc2hvbGRzID0gW107XG4gICAgICAgIHZhciBjdXJyZW50SWR4ID0gdGhpcy5tb2RlbC5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyICR0ciA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAkdHIuZmluZCgnLnRoJykuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJHRoaXMub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgIHZhciBoYWxmID0gJHRoaXMud2lkdGgoKSAvIDI7XG4gICAgICAgICAgICBpZiAoaSAhPSBjdXJyZW50SWR4KSB0aHJlc2hvbGRzLnB1c2gob2Zmc2V0K2hhbGYpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByZXZlbnRfbW91c2V1cCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGdldE5ld0luZGV4ID0gZnVuY3Rpb24ocG9zKSB7XG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHRocmVzaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdGhyZXNob2xkc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocG9zID4gdmFsKSBuZXdJZHgrKztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBuZXdJZHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGRyYXdIZWxwZXIgPSBmdW5jdGlvbihuZXdJZHgpIHtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGlmIChuZXdJZHggPT0gY3VycmVudElkeCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG5ld0lkeCA8IGN1cnJlbnRJZHggPyAnYmVmb3JlJyA6ICdhZnRlcic7XG4gICAgICAgICAgICAkdHIuZmluZCgnLnRoOmVxKCcrbmV3SWR4KycpJylbbWV0aG9kXSgnPGRpdiBjbGFzcz1cImNvbHNvcnQtaGVscGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlX2NvbHVtbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzpjaGFuZ2UsICdvcGFjaXR5JzowLjUsICd6SW5kZXgnOiAxMH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpO1xuICAgICAgICAgICAgZHJhd0hlbHBlcihuZXdJZHgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xlYW51cF9tb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzogMCwgJ29wYWNpdHknOjF9KTtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zb3J0SW5kZXgoZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpKTtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9tb3ZlKVxuICAgIH1cbn0pO1xuXG52YXIgVGhSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBUaENlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsIClcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJjbGVhbl91cFwiLCB2aWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG59KTtcblxudmFyIEZpbHRlckNlbGwgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOndpZHRoXCIsIGZ1bmN0aW9uKGNvbHVtbiwgd2lkdGgpe1xuICAgICAgICAgICAgdGhpcy4kZWwud2lkdGgod2lkdGgpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjxpbnB1dCBjbGFzcz1cImZpbHRlclwiIHR5cGU9XCJzZWFyY2hcIiBwbGFjZWhvbGRlcj1cImZpbHRlclwiIC8+PC9kaXY+JyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZm4gPSB0aGlzLm1vZGVsLmdldCgnZmlsdGVyJyk7XG4gICAgICAgIHZhciBtYXJrdXAgPSB0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIiA/IHRoaXMudGVtcGxhdGUgOiBcIlwiIDtcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ3RkIGNvbC0nK3RoaXMubW9kZWwuZ2V0KCdpZCcpKS53aWR0aCh0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSk7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwobWFya3VwKTtcbiAgICAgICAgdGhpcy4kKFwiaW5wdXRcIikudmFsKHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXJfdmFsdWUnKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwiY2xpY2sgLmZpbHRlclwiOiBcInVwZGF0ZUZpbHRlclwiLFxuICAgICAgICBcImtleXVwIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJEZWxheWVkXCJcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUZpbHRlcjogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdmaWx0ZXJfdmFsdWUnLCAkLnRyaW0odGhpcy4kKCcuZmlsdGVyJykudmFsKCkpICk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXJEZWxheWVkOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudXBkYXRlRmlsdGVyVGltZW91dClcbiAgICAgICAgdGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlci5iaW5kKHRoaXMsIGV2dCksIDIwMCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBGaWx0ZXJSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNsZWFuX3VwXCIpXG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBGaWx0ZXJDZWxsKHsgbW9kZWw6IGNvbHVtbiB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggdmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcImNsZWFuX3VwXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgVGhlYWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgLy8gU2V0IGNvbmZpZ1xuICAgICAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgc3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhfcm93XCIsIG5ldyBUaFJvdyh7IGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbiB9KSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5uZWVkc0ZpbHRlclJvdygpKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnZpZXcoXCJmaWx0ZXJfcm93XCIsIG5ldyBGaWx0ZXJSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIHdoZW4gb2Zmc2V0IGlzIG5vdCB6ZXJvXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb25maWcsIFwiY2hhbmdlOm9mZnNldFwiLCBmdW5jdGlvbihtb2RlbCwgb2Zmc2V0KXtcbiAgICAgICAgICAgIHZhciB0b2dnbGVDbGFzcyA9IG9mZnNldCA9PT0gMCA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnIDtcbiAgICAgICAgICAgIHRoaXMuJGVsW3RvZ2dsZUNsYXNzXSgnb3ZlcmhhbmcnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0ciB0aC1yb3dcIj48L2Rpdj48ZGl2IGNsYXNzPVwidHIgZmlsdGVyLXJvd1wiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy5hc3NpZ24oeyAnLnRoLXJvdycgOiAndGhfcm93JyB9KTtcbiAgICAgICAgaWYgKHRoaXMuc3VidmlldygnZmlsdGVyX3JvdycpKSB7XG4gICAgICAgICAgICB0aGlzLmFzc2lnbih7ICcuZmlsdGVyLXJvdycgOiAnZmlsdGVyX3JvdycgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB0aGlzLiQoJy5maWx0ZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgbmVlZHNGaWx0ZXJSb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLnNvbWUoZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIGNvbHVtbi5nZXQoJ2ZpbHRlcicpICE9PSAndW5kZWZpbmVkJylcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG59KTtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRoZWFkOyIsInZhciBGaWx0ZXJzID0gcmVxdWlyZShcIi4vRmlsdGVyc1wiKTtcbnZhciBTb3J0cyA9IHJlcXVpcmUoXCIuL1NvcnRzXCIpO1xudmFyIEZvcm1hdHMgPSByZXF1aXJlKFwiLi9Gb3JtYXRzXCIpO1xudmFyIENvbHVtbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGtleTogXCJcIixcbiAgICAgICAgbGFiZWw6IFwiXCIsXG4gICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgZmlsdGVyOiB1bmRlZmluZWQsXG4gICAgICAgIGZvcm1hdDogdW5kZWZpbmVkLFxuICAgICAgICBzZWxlY3Q6IGZhbHNlLFxuICAgICAgICBmaWx0ZXJfdmFsdWU6IFwiXCIsXG4gICAgICAgIHNvcnRfdmFsdWU6IFwiXCIsXG4gICAgICAgIGxvY2tfd2lkdGg6IGZhbHNlXG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbHRlclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhpcy5nZXQoXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInN0cmluZ1wiICYmIEZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmaWx0ZXJcIiwgRmlsdGVyc1tmaWx0ZXJdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNvcnRcbiAgICAgICAgdmFyIHNvcnQgPSB0aGlzLmdldChcInNvcnRcIik7XG4gICAgICAgIGlmICh0eXBlb2Ygc29ydCA9PT0gXCJzdHJpbmdcIiAmJiBTb3J0cy5oYXNPd25Qcm9wZXJ0eShzb3J0KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzb3J0XCIsIFNvcnRzW3NvcnRdKHRoaXMuZ2V0KFwia2V5XCIpKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBmb3JtYXRcbiAgICAgICAgdmFyIHNlbGVjdCA9IHRoaXMuZ2V0KCdzZWxlY3QnKTtcbiAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgaWYgKHNlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0cy5zZWxlY3QgKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic2VsZWN0X2tleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZvcm1hdCA9PT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgRm9ybWF0c1tmb3JtYXRdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aGlzLnNldChcImZvcm1hdFwiLCBGb3JtYXRzW2Zvcm1hdF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTT04oKTtcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLndpZHRoIDwgYXR0cnMubWluX2NvbHVtbl93aWR0aCkgcmV0dXJuIFwiQSBjb2x1bW4gd2lkdGggY2Fubm90IGJlID0+IDBcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy5sb2NrX3dpZHRoID09PSB0cnVlICYmIGF0dHJzLndpZHRoID4gMCkgcmV0dXJuIFwiVGhpcyBjb2x1bW4gaGFzIGEgbG9ja2VkIHdpZHRoXCI7XG4gICAgICAgIFxuICAgIH0sXG4gICAgXG4gICAgZ2V0S2V5OiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHRoaXMuZ2V0KCdrZXknKSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRGb3JtYXR0ZWQ6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgID8gZm4odGhpcy5nZXRLZXkobW9kZWwpLCBtb2RlbClcbiAgICAgICAgICAgIDogdGhpcy5nZXRLZXkobW9kZWwpO1xuICAgIH0sXG4gICAgXG4gICAgc29ydEluZGV4OiBmdW5jdGlvbihuZXdJbmRleCkge1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbGxlY3Rpb24uY29sX3NvcnRzO1xuICAgICAgICBpZiAodHlwZW9mIG5ld0luZGV4ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gc29ydHMuaW5kZXhPZih0aGlzLmdldChcImlkXCIpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJJZHggPSB0aGlzLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgaWQgPSBzb3J0cy5zcGxpY2UoY3VySWR4LCAxKVswXTtcbiAgICAgICAgc29ydHMuc3BsaWNlKG5ld0luZGV4LCAwLCBpZCk7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5zb3J0KCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBDb2x1bW5zID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIFxuICAgIG1vZGVsOiBDb2x1bW4sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICAgIF8uZWFjaChtb2RlbHMsIHRoaXMuc2V0TWluV2lkdGgsIHRoaXMpO1xuICAgICAgICB0aGlzLnJvd19zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbFJvd1NvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMuY29sX3NvcnRzID0gdGhpcy5nZXRJbml0aWFsQ29sU29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5vbihcImNoYW5nZTpzb3J0X3ZhbHVlXCIsIHRoaXMub25Tb3J0Q2hhbmdlKTtcbiAgICB9LFxuICAgIFxuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGNvbDEsIGNvbDIpIHtcbiAgICAgICAgdmFyIGlkeDEgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDEuZ2V0KFwiaWRcIikpO1xuICAgICAgICB2YXIgaWR4MiA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMi5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHJldHVybiBpZHgxIC0gaWR4MjtcbiAgICB9LFxuICAgIFxuICAgIHNldE1pbldpZHRoOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICBpZiAobW9kZWwuaGFzT3duUHJvcGVydHkoJ21pbl9jb2x1bW5fd2lkdGgnKSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgbW9kZWxbJ21pbl9jb2x1bW5fd2lkdGgnXSA9IHRoaXMuY29uZmlnLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIik7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsUm93U29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5jb25maWcuZ2V0KFwicm93X3NvcnRzXCIpKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMuY29uZmlnLmdldChcInJvd19zb3J0c1wiKTtcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAncm93X3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IF8ucmVkdWNlKG1vZGVscyxmdW5jdGlvbihtZW1vLCBjb2x1bW4peyBcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uWydzb3J0X3ZhbHVlJ10pIFxuICAgICAgICAgICAgICAgICAgICBtZW1vLnB1c2goY29sdW1uW1wiaWRcIl0pOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgICAgIH0sW10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxDb2xTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJjb2xfc29ydHNcIikpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5jb25maWcuZ2V0KFwiY29sX3NvcnRzXCIpO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdjb2xfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gZGVmYXVsdFNvcnRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIG9uU29ydENoYW5nZTogZnVuY3Rpb24obW9kZWwsIHZhbHVlKSB7XG4gICAgICAgIHZhciBpZCA9IG1vZGVsLmdldChcImlkXCIpO1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnJvd19zb3J0cy5pbmRleE9mKGlkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDb21wYXJhdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMucm93X3NvcnRzLmxlbmd0aCAhPT0gMCl7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZ1bmN0aW9uKHJvdzEsIHJvdzIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzZWxmLnJvd19zb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBzZWxmLnJvd19zb3J0c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYuZ2V0KGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gY29sdW1uLmdldChcInNvcnRcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbHVtbi5nZXQoXCJzb3J0X3ZhbHVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydF9yZXN1bHQgPSB2YWx1ZSA9PSBcImFcIiA/IGZuKHJvdzEsIHJvdzIpIDogZm4ocm93Miwgcm93MSkgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydF9yZXN1bHQgIT0gMCkgcmV0dXJuIHNvcnRfcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgY29tcGFyYXRvcik7XG4gICAgICAgIFxuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzLm1vZGVsID0gQ29sdW1uO1xuZXhwb3J0cy5jb2xsZWN0aW9uID0gQ29sdW1uczsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG5cbnZhciBUcm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0cicsXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIik7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIGlkID0gY29sdW1uLmdldCgnaWQnKTtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gY29sdW1uLmdldEZvcm1hdHRlZCh0aGlzLm1vZGVsKTtcbiAgICAgICAgICAgIHZhciAkdmlldyA9ICQoJzxkaXYgY2xhc3M9XCJ0ZCBjb2wtJytpZCsnXCIgc3R5bGU9XCJ3aWR0aDonK3dpZHRoKydweFwiPjxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PC9kaXY+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkdmlldy5maW5kKCcuY2VsbC1pbm5lcicpLmFwcGVuZChmb3JtYXR0ZWQpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCR2aWV3KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59KTtcblxuXG5cbnZhciBUYm9keSA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBvcHRpb25zLmNvbHVtbnM7XG4gICAgICAgIHRoaXMuY29uZmlnID0gdGhpcy5jb2x1bW5zLmNvbmZpZztcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwicmVzZXRcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJzb3J0XCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwidXBkYXRlXCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJ1cGRhdGVcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5hZGp1c3RDb2x1bW5XaWR0aCApO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTpvZmZzZXRcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0Q29sdW1uV2lkdGg6IGZ1bmN0aW9uKG1vZGVsLCBuZXdXaWR0aCwgb3B0aW9ucyl7XG4gICAgICAgIHRoaXMuJCgnLnRkLmNvbC0nK21vZGVsLmdldChcImlkXCIpKS53aWR0aChuZXdXaWR0aCk7XG4gICAgfSxcbiAgICBcbiAgICAvLyBSZW5kZXJzIHRoZSB2aXNpYmxlIHJvd3MgZ2l2ZW4gdGhlIGN1cnJlbnQgb2Zmc2V0IGFuZCBtYXhfcm93c1xuICAgIC8vIHByb3BlcnRpZXMgb24gdGhlIGNvbmZpZyBvYmplY3QuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIik7XG4gICAgICAgIHZhciByb3dzX3RvX3JlbmRlciA9IHRoaXMuY29uZmlnLmdldFZpc2libGVSb3dzKCk7XG4gICAgICAgIGlmIChyb3dzX3RvX3JlbmRlciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHJvd3NfdG9fcmVuZGVyLmZvckVhY2goZnVuY3Rpb24ocm93KXtcbiAgICAgICAgICAgIHZhciByb3dWaWV3ID0gbmV3IFRyb3coe1xuICAgICAgICAgICAgICAgIG1vZGVsOiByb3csXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggcm93Vmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICAgICAgcm93Vmlldy5saXN0ZW5Ubyh0aGlzLCBcImNsZWFuX3VwXCIsIHJvd1ZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWQnKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJ3aGVlbFwiOiBcIm9uTW91c2VXaGVlbFwiLFxuICAgICAgICBcIm1vdXNld2hlZWxcIjogXCJvbk1vdXNlV2hlZWxcIlxuICAgIH0sXG4gICAgXG4gICAgb25Nb3VzZVdoZWVsOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgLy8gQmlnSW50ZWdlclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBub3JtYWxpemUgd2Via2l0L2ZpcmVmb3ggc2Nyb2xsIHZhbHVlc1xuICAgICAgICB2YXIgZGVsdGFZID0gLWV2dC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFZIHx8IGV2dC5vcmlnaW5hbEV2ZW50LmRlbHRhWSAqIDEwMDtcbiAgICAgICAgdmFyIG1vdmVtZW50ID0gTWF0aC5yb3VuZChkZWx0YVkgLyAxMDApO1xuICAgICAgICBpZiAoaXNOYU4obW92ZW1lbnQpKSByZXR1cm47XG4gICAgICAgIHZhciBvcmlnT2Zmc2V0ID0gdGhpcy5jb25maWcuZ2V0KFwib2Zmc2V0XCIpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmNvbmZpZy5nZXQoXCJtYXhfcm93c1wiKTtcbiAgICAgICAgdmFyIG9mZnNldCA9IE1hdGgubWluKCB0aGlzLmNvbGxlY3Rpb24ubGVuZ3RoIC0gbGltaXQsIE1hdGgubWF4KCAwLCBvcmlnT2Zmc2V0ICsgbW92ZW1lbnQpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29uZmlnLnNldCh7XCJvZmZzZXRcIjogb2Zmc2V0fSwge3ZhbGlkYXRlOiB0cnVlfSApO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IG9ubHkgd2hlbiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgJiYgb2Zmc2V0IDwgdGhpcy5jb2xsZWN0aW9uLmxlbmd0aCAtIGxpbWl0KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG59KTtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRib2R5OyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vQmFzZVZpZXcnKTtcbnZhciBTY3JvbGxlciA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOm9mZnNldFwiLCB0aGlzLnVwZGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5saXN0ZW5UbyhvcHRpb25zLnRib2R5LCBcInJlbmRlcmVkXCIsIHRoaXMucmVuZGVyKTtcbiAgICB9LCAgICBcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJpbm5lclwiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMubW9kZWwuZ2V0KCdvZmZzZXQnKTtcbiAgICAgICAgdmFyIGxpbWl0ID0gdGhpcy5tb2RlbC5nZXQoJ21heF9yb3dzJyk7XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJyk7XG4gICAgICAgIHZhciBhY3R1YWxfaCA9IHRoaXMuJGVsLnBhcmVudCgpLmhlaWdodCgpO1xuICAgICAgICB2YXIgYWN0dWFsX3IgPSBhY3R1YWxfaCAvIHRvdGFsO1xuICAgICAgICB2YXIgc2Nyb2xsX2hlaWdodCA9IGxpbWl0ICogYWN0dWFsX3I7XG4gICAgICAgIGlmIChzY3JvbGxfaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICAgIHZhciBjb3JyZWN0aW9uID0gMTAgLSBzY3JvbGxfaGVpZ2h0O1xuICAgICAgICAgICAgYWN0dWFsX2ggLT0gY29ycmVjdGlvbjtcbiAgICAgICAgICAgIGFjdHVhbF9yID0gYWN0dWFsX2ggLyB0b3RhbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2Nyb2xsX3RvcCA9IG9mZnNldCAqIGFjdHVhbF9yO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNjcm9sbF9oZWlnaHQgPCBhY3R1YWxfaCAmJiB0b3RhbCA+IGxpbWl0KSB7XG4gICAgICAgICAgICB0aGlzLiQoXCIuaW5uZXJcIikuY3NzKHtcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHNjcm9sbF9oZWlnaHQsXG4gICAgICAgICAgICAgICAgdG9wOiBzY3JvbGxfdG9wXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi5pbm5lclwiKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAuaW5uZXJcIjogXCJncmFiU2Nyb2xsZXJcIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlNjcm9sbGVyOiBmdW5jdGlvbihldnQpe1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VZID0gZXZ0LmNsaWVudFk7XG4gICAgICAgIHZhciBvZmZzZXRZID0gZXZ0Lm9mZnNldFk7XG4gICAgICAgIHZhciByYXRpbyA9IHRoaXMubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJykgLyB0aGlzLiRlbC5wYXJlbnQoKS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIGluaXRPZmZzZXQgPSBzZWxmLm1vZGVsLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBtb3ZlU2Nyb2xsZXIoZXZ0KXtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRZO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VZO1xuICAgICAgICAgICAgdmFyIG5ld09mZnNldCA9IE1hdGgubWF4KE1hdGgucm91bmQocmF0aW8gKiBjaGFuZ2UpICsgaW5pdE9mZnNldCwgMCk7XG4gICAgICAgICAgICBuZXdPZmZzZXQgPSBNYXRoLm1pbihuZXdPZmZzZXQsIHNlbGYubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJykgLSBzZWxmLm1vZGVsLmdldCgnbWF4X3Jvd3MnKSlcbiAgICAgICAgICAgIHNlbGYubW9kZWwuc2V0KHsnb2Zmc2V0JzpuZXdPZmZzZXR9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gcmVsZWFzZVNjcm9sbGVyKGV2dCl7XG4gICAgICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIG1vdmVTY3JvbGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBtb3ZlU2Nyb2xsZXIpO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCByZWxlYXNlU2Nyb2xsZXIpO1xuICAgIH1cbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBTY3JvbGxlciIsImV4cG9ydHMubGlrZSA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlLCBjb21wdXRlZFZhbHVlLCByb3cpIHtcbiAgICB0ZXJtID0gdGVybS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdmFsdWUuaW5kZXhPZih0ZXJtKSA+IC0xO1xufVxuZXhwb3J0cy5pcyA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlLCBjb21wdXRlZFZhbHVlLCByb3cpIHtcbiAgICB0ZXJtID0gdGVybS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdGVybSA9PSB2YWx1ZTtcbn1cbmV4cG9ydHMubnVtYmVyID0gZnVuY3Rpb24odGVybSwgdmFsdWUpIHtcbiAgICB2YWx1ZSAqPSAxO1xuICAgIHZhciBmaXJzdF90d28gPSB0ZXJtLnN1YnN0cigwLDIpO1xuICAgIHZhciBmaXJzdF9jaGFyID0gdGVybVswXTtcbiAgICB2YXIgYWdhaW5zdF8xID0gdGVybS5zdWJzdHIoMSkqMTtcbiAgICB2YXIgYWdhaW5zdF8yID0gdGVybS5zdWJzdHIoMikqMTtcbiAgICBpZiAoIGZpcnN0X3R3byA9PSBcIjw9XCIgKSByZXR1cm4gdmFsdWUgPD0gYWdhaW5zdF8yIDtcbiAgICBpZiAoIGZpcnN0X3R3byA9PSBcIj49XCIgKSByZXR1cm4gdmFsdWUgPj0gYWdhaW5zdF8yIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI8XCIgKSByZXR1cm4gdmFsdWUgPCBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj5cIiApIHJldHVybiB2YWx1ZSA+IGFnYWluc3RfMSA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiflwiICkgcmV0dXJuIE1hdGgucm91bmQodmFsdWUpID09IGFnYWluc3RfMSA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPVwiICkgcmV0dXJuIGFnYWluc3RfMSA9PSB2YWx1ZSA7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCkuaW5kZXhPZih0ZXJtLnRvU3RyaW5nKCkpID4gLTEgO1xufSIsImV4cG9ydHMubnVtYmVyID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmdW5jdGlvbihyb3cxLHJvdzIpIHsgXG4gICAgICAgIHJldHVybiByb3cxLmdldChmaWVsZCkqMSAtIHJvdzIuZ2V0KGZpZWxkKSoxO1xuICAgIH1cbn1cbmV4cG9ydHMuc3RyaW5nID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmdW5jdGlvbihyb3cxLHJvdzIpIHsgXG4gICAgICAgIGlmICggcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA9PSByb3cyLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpICkgcmV0dXJuIDA7XG4gICAgICAgIHJldHVybiByb3cxLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID4gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA/IDEgOiAtMSA7XG4gICAgfVxufSIsInZhciBCb3JtYXRzID0gcmVxdWlyZSgnYm9ybWF0Jyk7XG5leHBvcnRzLnNlbGVjdCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlbCkge1xuICAgIHZhciBzZWxlY3Rfa2V5ID0gJ3NlbGVjdGVkJztcbiAgICB2YXIgY2hlY2tlZCA9IG1vZGVsW3NlbGVjdF9rZXldID09PSB0cnVlO1xuICAgIHZhciAkcmV0ID0gJCgnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJzZWxlY3Rib3hcIj48L2Rpdj4nKTtcbiAgICBcbiAgICAvLyBTZXQgY2hlY2tlZFxuICAgIHZhciAkY2IgPSAkcmV0LmZpbmQoJ2lucHV0JykucHJvcCgnY2hlY2tlZCcsIGNoZWNrZWQpO1xuICAgIFxuICAgIC8vIFNldCBjbGljayBiZWhhdmlvclxuICAgICRjYlxuICAgIC5vbignY2xpY2sgbW91c2Vkb3duJywgZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSlcbiAgICAub24oJ21vdXNldXAnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIHNlbGVjdGVkID0gISEgbW9kZWxbc2VsZWN0X2tleV07XG4gICAgICAgIHZhciBpc19zZWxlY3RlZF9ub3cgPSBtb2RlbFtzZWxlY3Rfa2V5XSA9ICFzZWxlY3RlZDtcbiAgICAgICAgJGNiLnByb3AoJ2NoZWNrZWQnLCBpc19zZWxlY3RlZF9ub3cpO1xuICAgICAgICBtb2RlbC50cmlnZ2VyKCdjaGFuZ2Vfc2VsZWN0ZWQnLCBtb2RlbCwgc2VsZWN0ZWQpO1xuICAgIH0pXG4gICAgXG4gICAgcmV0dXJuICRyZXQ7XG59XG5cbnZhciB0aW1lU2luY2UgPSBCb3JtYXRzLnRpbWVTaW5jZTtcblxuZXhwb3J0cy50aW1lU2luY2UgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICgvXlxcZCskLy50ZXN0KHZhbHVlKSkge1xuICAgICAgICB2YXIgbmV3VmFsID0gdGltZVNpbmNlKHZhbHVlKSB8fCBcImEgbW9tZW50XCI7XG4gICAgICAgIHJldHVybiBuZXdWYWwgKyBcIiBhZ29cIjtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5leHBvcnRzLmNvbW1hSW50ID0gQm9ybWF0cy5jb21tYUdyb3VwczsiLCJmdW5jdGlvbiB0aW1lU2luY2UodGltZXN0YW1wLCBjb21wYXJlRGF0ZSwgdGltZUNodW5rKSB7XG4gICAgdmFyIG5vdyA9IGNvbXBhcmVEYXRlID09PSB1bmRlZmluZWQgPyArbmV3IERhdGUoKSA6IGNvbXBhcmVEYXRlO1xuICAgIHZhciByZW1haW5pbmcgPSAodGltZUNodW5rICE9PSB1bmRlZmluZWQpID8gdGltZUNodW5rIDogbm93IC0gdGltZXN0YW1wO1xuICAgIHZhciBzdHJpbmcgPSBcIlwiO1xuICAgIHZhciBzZXBhcmF0b3IgPSBcIiwgXCI7XG4gICAgdmFyIGxldmVsID0gMDtcbiAgICB2YXIgbWF4X2xldmVscyA9IDM7XG4gICAgdmFyIG1pbGxpX3Blcl9zZWNvbmQgPSAxMDAwO1xuICAgIHZhciBtaWxsaV9wZXJfbWludXRlID0gbWlsbGlfcGVyX3NlY29uZCAqIDYwO1xuICAgIHZhciBtaWxsaV9wZXJfaG91ciA9IG1pbGxpX3Blcl9taW51dGUgKiA2MDtcbiAgICB2YXIgbWlsbGlfcGVyX2RheSA9IG1pbGxpX3Blcl9ob3VyICogMjQ7XG4gICAgdmFyIG1pbGxpX3Blcl93ZWVrID0gbWlsbGlfcGVyX2RheSAqIDc7XG4gICAgdmFyIG1pbGxpX3Blcl9tb250aCA9IG1pbGxpX3Blcl93ZWVrICogNDtcbiAgICB2YXIgbWlsbGlfcGVyX3llYXIgPSBtaWxsaV9wZXJfZGF5ICogMzY1O1xuICAgIFxuICAgIHZhciBsZXZlbHMgPSBbXG4gICAgXG4gICAgICAgIHsgcGx1cmFsOiBcInllYXJzXCIsIHNpbmd1bGFyOiBcInllYXJcIiwgbXM6IG1pbGxpX3Blcl95ZWFyIH0sXG4gICAgICAgIHsgcGx1cmFsOiBcIm1vbnRoc1wiLCBzaW5ndWxhcjogXCJtb250aFwiLCBtczogbWlsbGlfcGVyX21vbnRoIH0sXG4gICAgICAgIHsgcGx1cmFsOiBcIndlZWtzXCIsIHNpbmd1bGFyOiBcIndlZWtcIiwgbXM6IG1pbGxpX3Blcl93ZWVrIH0sXG4gICAgICAgIHsgcGx1cmFsOiBcImRheXNcIiwgc2luZ3VsYXI6IFwiZGF5XCIsIG1zOiBtaWxsaV9wZXJfZGF5IH0sXG4gICAgICAgIHsgcGx1cmFsOiBcImhvdXJzXCIsIHNpbmd1bGFyOiBcImhvdXJcIiwgbXM6IG1pbGxpX3Blcl9ob3VyIH0sXG4gICAgICAgIHsgcGx1cmFsOiBcIm1pbnV0ZXNcIiwgc2luZ3VsYXI6IFwibWludXRlXCIsIG1zOiBtaWxsaV9wZXJfbWludXRlIH0sXG4gICAgICAgIHsgcGx1cmFsOiBcInNlY29uZHNcIiwgc2luZ3VsYXI6IFwic2Vjb25kXCIsIG1zOiBtaWxsaV9wZXJfc2Vjb25kIH1cbiAgICBdO1xuICAgIFxuICAgIGZvciAodmFyIGk9MDsgaSA8IGxldmVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIHJlbWFpbmluZyA8IGxldmVsc1tpXS5tcyApIGNvbnRpbnVlO1xuICAgICAgICBsZXZlbCsrO1xuICAgICAgICB2YXIgbnVtID0gTWF0aC5mbG9vciggcmVtYWluaW5nIC8gbGV2ZWxzW2ldLm1zICk7XG4gICAgICAgIHZhciBsYWJlbCA9IG51bSA9PSAxID8gbGV2ZWxzW2ldLnNpbmd1bGFyIDogbGV2ZWxzW2ldLnBsdXJhbCA7XG4gICAgICAgIHN0cmluZyArPSBudW0gKyBcIiBcIiArIGxhYmVsICsgc2VwYXJhdG9yO1xuICAgICAgICByZW1haW5pbmcgJT0gbGV2ZWxzW2ldLm1zO1xuICAgICAgICBpZiAoIGxldmVsID49IG1heF9sZXZlbHMgKSBicmVhaztcbiAgICB9O1xuICAgIFxuICAgIHN0cmluZyA9IHN0cmluZy5zdWJzdHJpbmcoMCwgc3RyaW5nLmxlbmd0aCAtIHNlcGFyYXRvci5sZW5ndGgpO1xuICAgIHJldHVybiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGNvbW1hR3JvdXBzKHZhbHVlKSB7XG4gICAgdmFyIHBhcnRzID0geC50b1N0cmluZygpLnNwbGl0KFwiLlwiKTtcbiAgICBwYXJ0c1swXSA9IHBhcnRzWzBdLnJlcGxhY2UoL1xcQig/PShcXGR7M30pKyg/IVxcZCkpL2csIFwiLFwiKTtcbiAgICByZXR1cm4gcGFydHMuam9pbihcIi5cIik7XG59XG5cbmV4cG9ydHMudGltZVNpbmNlID0gdGltZVNpbmNlO1xuZXhwb3J0cy5jb21tYUdyb3VwcyA9IGNvbW1hR3JvdXBzOyJdfQ==
;