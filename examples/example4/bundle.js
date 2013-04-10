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
},{"./lib/BaseView":3,"./lib/Column":4,"./lib/Thead":5,"./lib/Tbody":6,"./lib/Scroller":7}],3:[function(require,module,exports){
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
        this.trigger("removal");
        this.unbind();
        Backbone.View.prototype.remove.call(this);
    },
    
    subview: function(key, view){
        // Set up subview object
        var sv = this.__subviews__ = this.__subviews__ || {};
        
        // Check if getting
        if (view === undefined) return sv[key];
        
        // Add listener for removal event
        view.listenTo(this, "removal", view.remove);
        
        // Set the key
        sv[key] = view;
        
        // Allow chaining
        return view
    }
    
});

exports = module.exports = BaseView
},{}],4:[function(require,module,exports){
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
},{"./Filters":8,"./Sorts":9,"./Formats":10}],5:[function(require,module,exports){
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
            view.listenTo(this, "removal", view.remove);
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
        this.trigger("removal")
        
        // render each th cell
        this.collection.each(function(column){
            var view = new FilterCell({ model: column });
            this.$el.append( view.render().el );
            view.listenTo(this, "removal", view.remove);
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
},{"./BaseView":3}],6:[function(require,module,exports){
var BaseView = require('./BaseView');

// var Tdata = BaseView.extend({
//     
//     className: 'td',
//     
//     initialize: function(options){
//         this.column = options.column;
//         this.listenTo(this.column, "change:width", function(column, width){
//             this.$el.width(width);
//         });
//         this.listenTo(this.model, "change:"+this.column.get("key"), this.render );
//     },
//     
//     template: '<div class="cell-inner"></div>',
//     
//     render: function() {
//         this.$el.addClass('col-'+this.column.id).width(this.column.get('width'));
//         this.el.innerHTML = this.template;
//         // this.$el.html(this.template);
//         this.$(".cell-inner").append( this.column.getFormatted(this.model) );
//         return this;
//     }
//     
// });

var Trow = BaseView.extend({
    
    className: 'tr',
    
    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },
    
    render: function() {
        this.trigger("removal");
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
        this.trigger("removal");
        var rows_to_render = this.config.getVisibleRows();
        if (rows_to_render === false) return;
        
        rows_to_render.forEach(function(row){
            var rowView = new Trow({
                model: row,
                collection: this.columns
            });
            this.$el.append( rowView.render().el );
            rowView.listenTo(this, "removal", rowView.remove);
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
},{"./BaseView":3}],7:[function(require,module,exports){
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
},{"./BaseView":3}],8:[function(require,module,exports){
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
exports.select = function(value, model) {
    var select_key = 'selected';
    var checked = model[select_key] === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox" class="selectbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        var selected = !! $cb.is(":checked");
        model[select_key] = selected;
        model.trigger('change_selected', model, selected);
    })
    
    return $ret;
}

exports.commaInt = function(value) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
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
exports.timeSince = function(value) {
    if (/^\d+$/.test(value)) {
        var newVal = timeSince(value) || "a moment";
        return newVal + " ago";
    }
    return value;
}
},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1RoZWFkLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UYm9keS5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU2Nyb2xsZXIuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1NvcnRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Gb3JtYXRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFRhYmxlZCA9IHJlcXVpcmUoJy4uLy4uLycpO1xuXG5mdW5jdGlvbiBpbmNoZXMyZmVldChpbmNoZXMsIG1vZGVsKXtcbiAgICB2YXIgZmVldCA9IE1hdGguZmxvb3IoaW5jaGVzLzEyKTtcbiAgICB2YXIgaW5jaGVzID0gaW5jaGVzICUgMTI7XG4gICAgcmV0dXJuIGZlZXQgKyBcIidcIiArIGluY2hlcyArICdcIic7XG59XG5cbmZ1bmN0aW9uIGZlZXRfZmlsdGVyKHRlcm0sIHZhbHVlLCBmb3JtYXR0ZWQsIG1vZGVsKSB7XG4gICAgaWYgKHRlcm0gPT0gXCJ0YWxsXCIpIHJldHVybiB2YWx1ZSA+IDcwO1xuICAgIGlmICh0ZXJtID09IFwic2hvcnRcIikgcmV0dXJuIHZhbHVlIDwgNjk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjb2x1bW5zID0gW1xuICAgIHsgaWQ6IFwic2VsZWN0b3JcIiwga2V5OiBcInNlbGVjdGVkXCIsIGxhYmVsOiBcIlwiLCBzZWxlY3Q6IHRydWUsIHdpZHRoOiAzMCwgbG9ja193aWR0aDogdHJ1ZSB9LFxuICAgIHsgaWQ6IFwiSURcIiwga2V5OiBcImlkXCIsIGxhYmVsOiBcIklEXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiZmlyc3RfbmFtZVwiLCBrZXk6IFwiZmlyc3RfbmFtZVwiLCBsYWJlbDogXCJGaXJzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwibGFzdF9uYW1lXCIsIGtleTogXCJsYXN0X25hbWVcIiwgbGFiZWw6IFwiTGFzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwiYWdlXCIsIGtleTogXCJhZ2VcIiwgbGFiZWw6IFwiQWdlXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiaGVpZ2h0XCIsIGtleTogXCJoZWlnaHRcIiwgbGFiZWw6IFwiSGVpZ2h0XCIsIGZvcm1hdDogaW5jaGVzMmZlZXQsIGZpbHRlcjogZmVldF9maWx0ZXIsIHNvcnQ6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcIndlaWdodFwiLCBrZXk6IFwid2VpZ2h0XCIsIGxhYmVsOiBcIldlaWdodFwiLCBmaWx0ZXI6IFwibnVtYmVyXCIsIHNvcnQ6IFwibnVtYmVyXCIgfVxuXTtcbnZhciBjb2xsZWN0aW9uID0gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oW10pO1xudmFyIHRhYmxlZCA9IG5ldyBUYWJsZWQoe1xuICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb24sXG4gICAgY29sdW1uczogY29sdW1ucyxcbiAgICB0YWJsZV93aWR0aDogODAwICAgIFxufSk7XG52YXIgJHBnID0gJChcIiNwbGF5Z3JvdW5kXCIpO1xudGFibGVkLnJlbmRlcigpLiRlbC5hcHBlbmRUbygkcGcpO1xuXG5mdW5jdGlvbiBnZW5Sb3coaWQpe1xuICAgIFxuICAgIHZhciBmbmFtZXMgPSBbXG4gICAgICAgIFwiam9lXCIsXG4gICAgICAgIFwiZnJlZFwiLFxuICAgICAgICBcImZyYW5rXCIsXG4gICAgICAgIFwiamltXCIsXG4gICAgICAgIFwibWlrZVwiLFxuICAgICAgICBcImdhcnlcIixcbiAgICAgICAgXCJheml6XCJcbiAgICBdO1xuXG4gICAgdmFyIGxuYW1lcyA9IFtcbiAgICAgICAgXCJzdGVybGluZ1wiLFxuICAgICAgICBcInNtaXRoXCIsXG4gICAgICAgIFwiZXJpY2tzb25cIixcbiAgICAgICAgXCJidXJrZVwiXG4gICAgXTtcbiAgICBcbiAgICB2YXIgc2VlZCA9IE1hdGgucmFuZG9tKCk7XG4gICAgdmFyIHNlZWQyID0gTWF0aC5yYW5kb20oKTtcbiAgICBcbiAgICB2YXIgZmlyc3RfbmFtZSA9IGZuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChmbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgdmFyIGxhc3RfbmFtZSA9IGxuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChsbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBzZWxlY3RlZDogZmFsc2UsXG4gICAgICAgIGZpcnN0X25hbWU6IGZpcnN0X25hbWUsXG4gICAgICAgIGxhc3RfbmFtZTogbGFzdF9uYW1lLFxuICAgICAgICBhZ2U6IE1hdGguY2VpbChzZWVkICogNzUpICsgMTUsXG4gICAgICAgIGhlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAzNiApICsgNDgsXG4gICAgICAgIHdlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAxMzAgKSArIDkwXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZW5Sb3dzKG51bSl7XG4gICAgdmFyIHJldFZhbCA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IG51bTsgaSsrKSB7XG4gICAgICAgIHJldFZhbC5wdXNoKGdlblJvdyhpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0VmFsO1xufVxuXG53aW5kb3cuc3RvcCA9IGZhbHNlO1xudmFyIGludHZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgaWYgKHdpbmRvdy5zdG9wKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50dmFsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbmV3Um93cyA9IGdlblJvd3MoMzAwKTtcbiAgICB2YXIgbWV0aG9kID0gY29sbGVjdGlvbi5sZW5ndGggPyAnc2V0JyA6ICdyZXNldCcgO1xuICAgIC8vIHZhciBzdGFydFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICBjb2xsZWN0aW9uW21ldGhvZF0obmV3Um93cyk7XG4gICAgLy8gdmFyIGVuZFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAvLyBjb25zb2xlLmxvZygoZW5kVGltZSAtIHN0YXJ0VGltZSkvMTAwMCk7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ3NldCcpIGNvbGxlY3Rpb24udHJpZ2dlcigndXBkYXRlJyk7XG59LCAzMDAwKTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2xpYi9CYXNlVmlldycpO1xudmFyIENvbHVtbiA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLm1vZGVsO1xudmFyIENvbHVtbnMgPSByZXF1aXJlKCcuL2xpYi9Db2x1bW4nKS5jb2xsZWN0aW9uO1xudmFyIFRoZWFkID0gcmVxdWlyZSgnLi9saWIvVGhlYWQnKTtcbnZhciBUYm9keSA9IHJlcXVpcmUoJy4vbGliL1Rib2R5Jyk7XG52YXIgU2Nyb2xsZXIgPSByZXF1aXJlKCcuL2xpYi9TY3JvbGxlcicpO1xuXG52YXIgQ29uZmlnTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIC8vIE1ha2VzIHRhYmxlIHdpZHRoIGFuZCBjb2x1bW4gd2lkdGhzIGFkanVzdGFibGVcbiAgICAgICAgYWRqdXN0YWJsZV93aWR0aDogdHJ1ZSxcbiAgICAgICAgLy8gU2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHRhYmxlIHdpZHRoc1xuICAgICAgICBzYXZlX3N0YXRlOiBmYWxzZSxcbiAgICAgICAgLy8gRGVmYXVsdCBtaW5pbXVtIGNvbHVtbiB3aWR0aCwgaW4gcGl4ZWxzXG4gICAgICAgIG1pbl9jb2x1bW5fd2lkdGg6IDMwLFxuICAgICAgICAvLyBEZWZhdWx0IHdpZHRoIGZvciB0aGUgdGFibGUgaXRzZWxmLiBFaXRoZXIgcGl4ZWxzIG9yICdhdXRvJ1xuICAgICAgICB0YWJsZV93aWR0aDogJ2F1dG8nLFxuICAgICAgICAvLyBEZWZhdWx0IG1heCBudW1iZXIgb2Ygcm93cyB0byByZW5kZXIgYmVmb3JlIHNjcm9sbCBvbiB0Ym9keVxuICAgICAgICBtYXhfcm93czogMzAsXG4gICAgICAgIC8vIERlZmF1bHQgb2Zmc2V0IGZvciB0aGUgdGJvZHlcbiAgICAgICAgb2Zmc2V0OiAwLFxuICAgICAgICAvLyBTZXQgaW4gdGhlIHJlbmRlcmluZyBwaGFzZSBvZiB0aGUgdGJvZHkgKGNvZGUgc21lbGwuLi4pXG4gICAgICAgIHRvdGFsX3Jvd3M6IDBcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBpZiAoIGF0dHJzLm9mZnNldCA+IE1hdGgubWF4KGF0dHJzLm1heF9yb3dzLCBhdHRycy50b3RhbF9yb3dzKSAtIGF0dHJzLm1heF9yb3dzICkge1xuICAgICAgICAgICAgcmV0dXJuIFwiT2Zmc2V0IGNhbm5vdCBiZSB0aGF0IGhpZ2guXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm9mZnNldCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIk9mZnNldCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm1heF9yb3dzIDwgMSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibWF4X3Jvd3MgbXVzdCBhdGxlYXN0IDFcIjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0VmlzaWJsZVJvd3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5nZXQoJ29mZnNldCcpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmdldCgnbWF4X3Jvd3MnKTtcbiAgICAgICAgdmFyIHJvd3NfdG9fcmVuZGVyID0gW107XG4gICAgICAgIHRoaXMuZ2V0KFwiY29sbGVjdGlvblwiKS5lYWNoKGZ1bmN0aW9uKHJvdywgaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdGhpcy5wYXNzZXNGaWx0ZXJzKHJvdykgKSArK3RvdGFsO1xuICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdG90YWwgPD0gb2Zmc2V0ICkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIHRvdGFsID4gKG9mZnNldCArIGxpbWl0KSApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcm93c190b19yZW5kZXIucHVzaChyb3cpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHByZXZfdG90YWwgPSB0aGlzLmdldCgndG90YWxfcm93cycpKjE7XG4gICAgICAgIGlmICh0b3RhbCAhPT0gcHJldl90b3RhbCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX3Jvd3MnLCB0b3RhbClcbiAgICAgICAgICAgIHZhciBuZXdPZmZzZXQgPSBNYXRoLm1pbih0b3RhbCAtIGxpbWl0LCBvZmZzZXQpO1xuICAgICAgICAgICAgaWYgKG5ld09mZnNldCA9PT0gb2Zmc2V0KSB0aGlzLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnNldCgnb2Zmc2V0JywgbmV3T2Zmc2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm93c190b19yZW5kZXI7XG4gICAgfSxcbiAgICBwYXNzZXNGaWx0ZXJzOiBmdW5jdGlvbihyb3cpe1xuICAgICAgICByZXR1cm4gdGhpcy5jb2x1bW5zLmV2ZXJ5KGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICBpZiAoY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJykgPT0gXCJcIiB8fCB0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXNzZXNGaWx0ZXIocm93LCBjb2x1bW4pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuICAgIHBhc3Nlc0ZpbHRlcjogZnVuY3Rpb24ocm93LCBjb2x1bW4pe1xuICAgICAgICByZXR1cm4gY29sdW1uLmdldCgnZmlsdGVyJykoIGNvbHVtbi5nZXQoJ2ZpbHRlcl92YWx1ZScpLCByb3cuZ2V0KGNvbHVtbi5nZXQoJ2tleScpKSwgY29sdW1uLmdldEZvcm1hdHRlZChyb3cpLCByb3cgKTtcbiAgICB9LFxuICAgIFxufSk7XG5cbnZhciBUYWJsZWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGlzLmNvbGxlY3Rpb24gKHRoZSBkYXRhKSBpcyBhIGJhY2tib25lIGNvbGxlY3Rpb25cbiAgICAgICAgaWYgKCAhKHRoaXMuY29sbGVjdGlvbiBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pICkgdGhyb3cgXCJUYWJsZWQgbXVzdCBiZSBwcm92aWRlZCB3aXRoIGEgYmFja2JvbmUgY29sbGVjdGlvbiBhcyBpdHMgZGF0YVwiO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlnIG9iamVjdFxuICAgICAgICB0aGlzLmNvbmZpZyA9IG5ldyBDb25maWdNb2RlbCh0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIC8vIENvbHVtbnNcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gbmV3IENvbHVtbnModGhpcy5jb25maWcuZ2V0KFwiY29sdW1uc1wiKSx7Y29uZmlnOiB0aGlzLmNvbmZpZ30pO1xuICAgICAgICB0aGlzLmNvbmZpZy5jb2x1bW5zID0gdGhpcy5jb2x1bW5zO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhlYWRcIiwgbmV3IFRoZWFkKHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1ucyxcbiAgICAgICAgICAgIGNvbmZpZzogdGhpcy5jb25maWdcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0Ym9keVwiLCBuZXcgVGJvZHkoe1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogdGhpcy5jb2x1bW5zXG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5zdWJ2aWV3KCdzY3JvbGxlcicsIG5ldyBTY3JvbGxlcih7XG4gICAgICAgICAgICBtb2RlbDogdGhpcy5jb25maWcsXG4gICAgICAgICAgICB0Ym9keTogdGhpcy5zdWJ2aWV3KCd0Ym9keScpXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRlXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJzYXZlX3N0YXRlXCIpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVQcmV2aW91c1N0YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbmVyc1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5vbldpZHRoQ2hhbmdlICk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpmaWx0ZXJfdmFsdWVcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnNldChcIm9mZnNldFwiLCAwKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQm9keSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJjaGFuZ2U6bWF4X3Jvd3NcIiwgdGhpcy5vbk1heFJvd0NoYW5nZSk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpjb21wYXJhdG9yXCIsIHRoaXMudXBkYXRlQ29tcGFyYXRvcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcInNvcnRcIiwgdGhpcy5vbkNvbHVtblNvcnQpO1xuICAgICAgICBcbiAgICAgICAgLy8gSEFDSzogc2V0IHVwIGRhdGEgY29tcGFyYXRvclxuICAgICAgICB0aGlzLmNvbHVtbnMudXBkYXRlQ29tcGFyYXRvcigpO1xuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6IFtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0YWJsZWQtY3RuclwiPjxkaXYgY2xhc3M9XCJ0YWJsZWQtaW5uZXJcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZFwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGhlYWRcIj48L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRib2R5LW91dGVyXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0Ym9keVwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwic2Nyb2xsZXJcIj48L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyZXNpemUtdGFibGVcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+PC9kaXY+J1xuICAgIF0uam9pbihcIlwiKSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgaW5pdGlhbCBtYXJrdXBcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgLy8gU2V0IHRoZSB3aWR0aHMgb2YgdGhlIGNvbHVtbnNcbiAgICAgICAgdGhpcy5zZXRXaWR0aHMoKTtcbiAgICAgICAgLy8gKFJlKXJlbmRlciBzdWJ2aWV3c1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJyxcbiAgICAgICAgICAgICcudGJvZHknOiAndGJvZHknLFxuICAgICAgICAgICAgJy5zY3JvbGxlcic6ICdzY3JvbGxlcidcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckJvZHk6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGJvZHknOiAndGJvZHknLFxuICAgICAgICAgICAgJy5zY3JvbGxlcic6ICdzY3JvbGxlcidcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXJIZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIG9uV2lkdGhDaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYWRqdXN0SW5uZXJEaXYoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdGhlIHdpZHRoc1xuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHJldHVybjtcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuY29sdW1ucy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSwge30sIHRoaXMpO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJywgd2lkdGhzKTtcbiAgICB9LFxuICAgIFxuICAgIG9uTWF4Um93Q2hhbmdlOiBmdW5jdGlvbihtb2RlbCwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJCb2R5KCk7XG4gICAgICAgIHRoaXMuc3RhdGUoJ21heF9yb3dzJywgdmFsdWUpO1xuICAgIH0sXG4gICAgXG4gICAgb25Db2x1bW5Tb3J0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc29ydFxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHJldHVybjtcbiAgICAgICAgdmFyIHNvcnRzID0gdGhpcy5jb2x1bW5zLmNvbF9zb3J0cztcbiAgICAgICAgdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJywgc29ydHMpO1xuICAgIH0sXG4gICAgXG4gICAgc2V0V2lkdGhzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIFRhYmxlJ3Mgd2lkdGhcbiAgICAgICAgdmFyIHRvdGFsV2lkdGggPSB0aGlzLmNvbmZpZy5nZXQoXCJ0YWJsZV93aWR0aFwiKSA9PT0gJ2F1dG8nID8gdGhpcy4kZWwud2lkdGgoKSA6IHRoaXMuY29uZmlnLmdldChcInRhYmxlX3dpZHRoXCIpO1xuICAgICAgICB2YXIgbWFrZURlZmF1bHQgPSBbXTtcbiAgICAgICAgdmFyIGFkanVzdGVkV2lkdGggPSAwO1xuICAgICAgICB0aGlzLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICB2YXIgY29sX3dpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHZhciBtaW5fY29sX3dpZHRoID0gY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpXG4gICAgICAgICAgICBpZiAoIGNvbF93aWR0aCApIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IGNvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IGNvbF93aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1pbl9jb2xfd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSBtaW5fY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWtlRGVmYXVsdC5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgYXZnX3dpZHRoID0gbWFrZURlZmF1bHQubGVuZ3RoID8gdG90YWxXaWR0aC9tYWtlRGVmYXVsdC5sZW5ndGggOiAwIDtcbiAgICAgICAgdmFyIGRlZmF1bHRXaWR0aCA9IE1hdGgubWF4KE1hdGguZmxvb3IoYXZnX3dpZHRoKSwgdGhpcy5jb25maWcuZ2V0KFwibWluX2NvbHVtbl93aWR0aFwiKSkgO1xuICAgICAgICBtYWtlRGVmYXVsdC5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IE1hdGgubWF4KGRlZmF1bHRXaWR0aCwgY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpIHx8IGRlZmF1bHRXaWR0aCk7XG4gICAgICAgICAgICBjb2x1bW4uc2V0KCd3aWR0aCcsIHdpZHRoKTtcbiAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gd2lkdGg7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiQoJy50YWJsZWQtaW5uZXInKS53aWR0aChhZGp1c3RlZFdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGFkanVzdElubmVyRGl2OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKSB8fCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbyoxICsgd2lkdGgqMTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIHRoaXMuJCgnLnRhYmxlZC1pbm5lcicpLndpZHRoKHdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICAnbW91c2Vkb3duIC5yZXNpemUtdGFibGUnOiAnZ3JhYlRhYmxlUmVzaXplcidcbiAgICB9LFxuICAgIFxuICAgIGdyYWJUYWJsZVJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgY29sX3N0YXRlID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGluZGV4KXtcbiAgICAgICAgICAgIG1lbW9bY29sdW1uLmdldCgnaWQnKV0gPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH0se30sdGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBWZXJ0aWNhbCBcbiAgICAgICAgdmFyIG1vdXNlWSA9IGV2dC5jbGllbnRZO1xuICAgICAgICB2YXIgcm93X2hlaWdodCA9ICQoXCIudHJcIiwgdGhpcy4kZWwpLmhlaWdodCgpO1xuICAgICAgICB2YXIgaW5pdE1heCA9IHRoaXMuY29uZmlnLmdldCgnbWF4X3Jvd3MnKTtcbiAgICAgICAgXG4gICAgICAgIHZhciB0YWJsZV9yZXNpemUgPSBmdW5jdGlvbihldnQpe1xuICAgICAgICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgICAgICAgdmFyIGNoYW5nZVggPSAoZXZ0LmNsaWVudFggLSBtb3VzZVgpL3NlbGYuY29sdW1ucy5sZW5ndGg7XG4gICAgICAgICAgICBzZWxmLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjpjb2xfc3RhdGVbY29sdW1uLmdldChcImlkXCIpXSoxK2NoYW5nZVh9LCB7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZlcnRpY2FsXG4gICAgICAgICAgICB2YXIgY2hhbmdlWSA9IChldnQuY2xpZW50WSAtIG1vdXNlWSk7XG4gICAgICAgICAgICB2YXIgYWJDaGFuZ2VZID0gTWF0aC5hYnMoY2hhbmdlWSk7XG4gICAgICAgICAgICBpZiAoIGFiQ2hhbmdlWSA+IHJvd19oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICBhYkNoYW5nZVkgPSBNYXRoLmZsb29yKGFiQ2hhbmdlWS9yb3dfaGVpZ2h0KSAqIChjaGFuZ2VZID4gMCA/IDEgOiAtMSk7XG4gICAgICAgICAgICAgICAgc2VsZi5jb25maWcuc2V0KHsnbWF4X3Jvd3MnOmluaXRNYXggKyBhYkNoYW5nZVl9LCB7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIHRhYmxlX3Jlc2l6ZSk7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIGNsZWFudXBfcmVzaXplKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5jb21wYXJhdG9yID0gZm47XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9LFxuICAgIFxuICAgIHJlc3RvcmVQcmV2aW91c1N0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgd2lkdGhzXG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJyk7XG4gICAgICAgIGlmICh3aWR0aHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5lYWNoKHdpZHRocywgZnVuY3Rpb24odmFsLCBrZXkpe1xuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1ucy5nZXQoa2V5KS5zZXQoJ3dpZHRoJywgdmFsKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgY29sdW1uIHNvcnQgb3JkZXJcbiAgICAgICAgdmFyIGNvbHNvcnRzID0gdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJyk7XG4gICAgICAgIGlmIChjb2xzb3J0cyAhPT0gdW5kZWZpbmVkICYmIGNvbHNvcnRzLmxlbmd0aCA9PT0gdGhpcy5jb2x1bW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmNvbF9zb3J0cyA9IGNvbHNvcnRzO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLnNvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJvdyBzb3J0IG9yZGVyXG4gICAgICAgIC8vIHZhciByb3dzb3J0cyA9IFxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1heF9yb3dzXG4gICAgICAgIHZhciBtYXhfcm93cyA9IHRoaXMuc3RhdGUoJ21heF9yb3dzJyk7XG4gICAgICAgIGlmIChtYXhfcm93cykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KHsnbWF4X3Jvd3MnOm1heF9yb3dzfSx7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzdGF0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZV9rZXkgPSAndGFibGVkLicrdGhpcy5jb25maWcuZ2V0KFwiaWRcIik7XG4gICAgICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmUgfHwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZV9rZXkpIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdG9yZSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IEpTT04ucGFyc2Uoc3RvcmUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgc3RvcmUgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHN0b3JlKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9yZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGFibGVkIiwidmFyIEJhc2VWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgIC8vIEFzc2lnbnMgYSBzdWJ2aWV3IHRvIGEganF1ZXJ5IHNlbGVjdG9yIGluIHRoaXMgdmlldydzIGVsXG4gICAgYXNzaWduIDogZnVuY3Rpb24gKHNlbGVjdG9yLCB2aWV3KSB7XG4gICAgICAgIHZhciBzZWxlY3RvcnM7XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgc2VsZWN0b3JzID0gc2VsZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSB7fTtcbiAgICAgICAgICAgIHNlbGVjdG9yc1tzZWxlY3Rvcl0gPSB2aWV3O1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2VsZWN0b3JzKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChzZWxlY3RvcnMsIGZ1bmN0aW9uICh2aWV3LCBzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2aWV3ID09PSBcInN0cmluZ1wiKSB2aWV3ID0gdGhpcy5fX3N1YnZpZXdzX19bdmlld107XG4gICAgICAgICAgICB2aWV3LnNldEVsZW1lbnQodGhpcy4kKHNlbGVjdG9yKSkucmVuZGVyKCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInJlbW92YWxcIik7XG4gICAgICAgIHRoaXMudW5iaW5kKCk7XG4gICAgICAgIEJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgc3VidmlldzogZnVuY3Rpb24oa2V5LCB2aWV3KXtcbiAgICAgICAgLy8gU2V0IHVwIHN1YnZpZXcgb2JqZWN0XG4gICAgICAgIHZhciBzdiA9IHRoaXMuX19zdWJ2aWV3c19fID0gdGhpcy5fX3N1YnZpZXdzX18gfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBnZXR0aW5nXG4gICAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHJldHVybiBzdltrZXldO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3RlbmVyIGZvciByZW1vdmFsIGV2ZW50XG4gICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB0aGUga2V5XG4gICAgICAgIHN2W2tleV0gPSB2aWV3O1xuICAgICAgICBcbiAgICAgICAgLy8gQWxsb3cgY2hhaW5pbmdcbiAgICAgICAgcmV0dXJuIHZpZXdcbiAgICB9XG4gICAgXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXciLCJ2YXIgRmlsdGVycyA9IHJlcXVpcmUoXCIuL0ZpbHRlcnNcIik7XG52YXIgU29ydHMgPSByZXF1aXJlKFwiLi9Tb3J0c1wiKTtcbnZhciBGb3JtYXRzID0gcmVxdWlyZShcIi4vRm9ybWF0c1wiKTtcbnZhciBDb2x1bW4gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBrZXk6IFwiXCIsXG4gICAgICAgIGxhYmVsOiBcIlwiLFxuICAgICAgICBzb3J0OiB1bmRlZmluZWQsXG4gICAgICAgIGZpbHRlcjogdW5kZWZpbmVkLFxuICAgICAgICBmb3JtYXQ6IHVuZGVmaW5lZCxcbiAgICAgICAgc2VsZWN0OiBmYWxzZSxcbiAgICAgICAgZmlsdGVyX3ZhbHVlOiBcIlwiLFxuICAgICAgICBzb3J0X3ZhbHVlOiBcIlwiLFxuICAgICAgICBsb2NrX3dpZHRoOiBmYWxzZVxuICAgIH0sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBmaWx0ZXJcbiAgICAgICAgdmFyIGZpbHRlciA9IHRoaXMuZ2V0KFwiZmlsdGVyXCIpO1xuICAgICAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJzdHJpbmdcIiAmJiBGaWx0ZXJzLmhhc093blByb3BlcnR5KGZpbHRlcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiZmlsdGVyXCIsIEZpbHRlcnNbZmlsdGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBzb3J0XG4gICAgICAgIHZhciBzb3J0ID0gdGhpcy5nZXQoXCJzb3J0XCIpO1xuICAgICAgICBpZiAodHlwZW9mIHNvcnQgPT09IFwic3RyaW5nXCIgJiYgU29ydHMuaGFzT3duUHJvcGVydHkoc29ydCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic29ydFwiLCBTb3J0c1tzb3J0XSh0aGlzLmdldChcImtleVwiKSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZm9ybWF0XG4gICAgICAgIHZhciBzZWxlY3QgPSB0aGlzLmdldCgnc2VsZWN0Jyk7XG4gICAgICAgIHZhciBmb3JtYXQgPSB0aGlzLmdldCgnZm9ybWF0Jyk7XG4gICAgICAgIGlmIChzZWxlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiZm9ybWF0XCIsIEZvcm1hdHMuc2VsZWN0ICk7XG4gICAgICAgICAgICB0aGlzLnNldChcInNlbGVjdF9rZXlcIiwgdGhpcy5nZXQoXCJrZXlcIikpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmb3JtYXQgPT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIEZvcm1hdHNbZm9ybWF0XSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0c1tmb3JtYXRdKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9KU09OKCk7XG4gICAgfSxcbiAgICBcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy53aWR0aCA8IGF0dHJzLm1pbl9jb2x1bW5fd2lkdGgpIHJldHVybiBcIkEgY29sdW1uIHdpZHRoIGNhbm5vdCBiZSA9PiAwXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAoYXR0cnMubG9ja193aWR0aCA9PT0gdHJ1ZSAmJiBhdHRycy53aWR0aCA+IDApIHJldHVybiBcIlRoaXMgY29sdW1uIGhhcyBhIGxvY2tlZCB3aWR0aFwiO1xuICAgICAgICBcbiAgICB9LFxuICAgIFxuICAgIGdldEtleTogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmdldCh0aGlzLmdldCgna2V5JykpO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0Rm9ybWF0dGVkOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICB2YXIgZm4gPSB0aGlzLmdldCgnZm9ybWF0Jyk7XG4gICAgICAgIHJldHVybiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgICAgICA/IGZuKHRoaXMuZ2V0S2V5KG1vZGVsKSwgbW9kZWwpXG4gICAgICAgICAgICA6IHRoaXMuZ2V0S2V5KG1vZGVsKTtcbiAgICB9LFxuICAgIFxuICAgIHNvcnRJbmRleDogZnVuY3Rpb24obmV3SW5kZXgpIHtcbiAgICAgICAgdmFyIHNvcnRzID0gdGhpcy5jb2xsZWN0aW9uLmNvbF9zb3J0cztcbiAgICAgICAgaWYgKHR5cGVvZiBuZXdJbmRleCA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHNvcnRzLmluZGV4T2YodGhpcy5nZXQoXCJpZFwiKSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgY3VySWR4ID0gdGhpcy5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyIGlkID0gc29ydHMuc3BsaWNlKGN1cklkeCwgMSlbMF07XG4gICAgICAgIHNvcnRzLnNwbGljZShuZXdJbmRleCwgMCwgaWQpO1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uc29ydCgpO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgQ29sdW1ucyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBcbiAgICBtb2RlbDogQ29sdW1uLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG1vZGVscywgb3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgICAgICBfLmVhY2gobW9kZWxzLCB0aGlzLnNldE1pbldpZHRoLCB0aGlzKTtcbiAgICAgICAgdGhpcy5yb3dfc29ydHMgPSB0aGlzLmdldEluaXRpYWxSb3dTb3J0cyhtb2RlbHMpO1xuICAgICAgICB0aGlzLmNvbF9zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbENvbFNvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMub24oXCJjaGFuZ2U6c29ydF92YWx1ZVwiLCB0aGlzLm9uU29ydENoYW5nZSk7XG4gICAgfSxcbiAgICBcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihjb2wxLCBjb2wyKSB7XG4gICAgICAgIHZhciBpZHgxID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wxLmdldChcImlkXCIpKTtcbiAgICAgICAgdmFyIGlkeDIgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDIuZ2V0KFwiaWRcIikpO1xuICAgICAgICByZXR1cm4gaWR4MSAtIGlkeDI7XG4gICAgfSxcbiAgICBcbiAgICBzZXRNaW5XaWR0aDogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgaWYgKG1vZGVsLmhhc093blByb3BlcnR5KCdtaW5fY29sdW1uX3dpZHRoJykpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIG1vZGVsWydtaW5fY29sdW1uX3dpZHRoJ10gPSB0aGlzLmNvbmZpZy5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SW5pdGlhbFJvd1NvcnRzOiBmdW5jdGlvbihtb2RlbHMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmYXVsdFNvcnRzID0gXy5wbHVjayhtb2RlbHMsIFwiaWRcIik7XG4gICAgICAgIHZhciBzb3J0cztcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldChcInJvd19zb3J0c1wiKSkge1xuICAgICAgICAgICAgc29ydHMgPSB0aGlzLmNvbmZpZy5nZXQoXCJyb3dfc29ydHNcIik7XG4gICAgICAgICAgICBpZiAoICEgKF8uZXZlcnkoc29ydHMsIGZ1bmN0aW9uKHNvcnQpIHsgcmV0dXJuIGRlZmF1bHRTb3J0cy5pbmRleE9mKHNvcnQpID4gLTEgfSkpICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9uZSBvciBtb3JlIHZhbHVlcyBpbiB0aGUgJ3Jvd19zb3J0cycgb3B0aW9uIGRvZXMgbm90IG1hdGNoIGEgY29sdW1uIGlkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ydHMgPSBfLnJlZHVjZShtb2RlbHMsZnVuY3Rpb24obWVtbywgY29sdW1uKXsgXG4gICAgICAgICAgICAgICAgaWYgKGNvbHVtblsnc29ydF92YWx1ZSddKSBcbiAgICAgICAgICAgICAgICAgICAgbWVtby5wdXNoKGNvbHVtbltcImlkXCJdKTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgICAgICB9LFtdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc29ydHM7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsQ29sU29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5jb25maWcuZ2V0KFwiY29sX3NvcnRzXCIpKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMuY29uZmlnLmdldChcImNvbF9zb3J0c1wiKTtcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAnY29sX3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IGRlZmF1bHRTb3J0cztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc29ydHM7XG4gICAgfSxcbiAgICBcbiAgICBvblNvcnRDaGFuZ2U6IGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSkge1xuICAgICAgICB2YXIgaWQgPSBtb2RlbC5nZXQoXCJpZFwiKTtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5yb3dfc29ydHMuaW5kZXhPZihpZCk7XG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucm93X3NvcnRzLnB1c2goaWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlQ29tcGFyYXRvcigpO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ29tcGFyYXRvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnJvd19zb3J0cy5sZW5ndGggIT09IDApe1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmdW5jdGlvbihyb3cxLCByb3cyKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZi5yb3dfc29ydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gc2VsZi5yb3dfc29ydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLmdldChpZCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IGNvbHVtbi5nZXQoXCJzb3J0XCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBjb2x1bW4uZ2V0KFwic29ydF92YWx1ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRfcmVzdWx0ID0gdmFsdWUgPT0gXCJhXCIgPyBmbihyb3cxLCByb3cyKSA6IGZuKHJvdzIsIHJvdzEpIDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRfcmVzdWx0ICE9IDApIHJldHVybiBzb3J0X3Jlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNoYW5nZTpjb21wYXJhdG9yXCIsIGNvbXBhcmF0b3IpO1xuICAgICAgICBcbiAgICB9XG4gICAgXG59KTtcblxuZXhwb3J0cy5tb2RlbCA9IENvbHVtbjtcbmV4cG9ydHMuY29sbGVjdGlvbiA9IENvbHVtbnM7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGhDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0aCcsXG4gICAgXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCIgdGl0bGU9XCI8JT0gbGFiZWwgJT5cIj48c3BhbiBjbGFzcz1cInRoLWhlYWRlclwiPjwlPSBsYWJlbCAlPjwvc3Bhbj48L2Rpdj48JSBpZihsb2NrX3dpZHRoICE9PSB0cnVlKSB7JT48c3BhbiBjbGFzcz1cInJlc2l6ZVwiPjwvc3Bhbj48JX0lPicpLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5yZW5kZXIgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihtb2RlbCwgd2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIganNvbiA9IHRoaXMubW9kZWwuc2VyaWFsaXplKCk7XG4gICAgICAgIHZhciBzb3J0X2NsYXNzID0ganNvbi5zb3J0X3ZhbHVlID8gKGpzb24uc29ydF92YWx1ZSA9PSBcImRcIiA/IFwiZGVzY1wiIDogXCJhc2NcIiApIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FzYyBkZXNjJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY29sLScranNvbi5pZCtcIiBcIitzb3J0X2NsYXNzKVxuICAgICAgICAgICAgLndpZHRoKGpzb24ud2lkdGgpXG4gICAgICAgICAgICAuaHRtbCh0aGlzLnRlbXBsYXRlKGpzb24pKTtcbiAgICAgICAgaWYgKHNvcnRfY2xhc3MgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi50aC1oZWFkZXJcIikucHJlcGVuZCgnPGkgY2xhc3M9XCInK3NvcnRfY2xhc3MrJy1pY29uXCI+PC9pPiAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAucmVzaXplXCI6IFwiZ3JhYlJlc2l6ZXJcIixcbiAgICAgICAgXCJkYmxjbGljayAucmVzaXplXCI6IFwiZml0VG9Db250ZW50XCIsXG4gICAgICAgIFwibW91c2V1cCAudGgtaGVhZGVyXCI6IFwiY2hhbmdlQ29sdW1uU29ydFwiLFxuICAgICAgICBcIm1vdXNlZG93blwiOiBcImdyYWJDb2x1bW5cIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbHVtbldpZHRoID0gdGhpcy5tb2RlbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgLy8gSGFuZGxlciBmb3Igd2hlbiBtb3VzZSBpcyBtb3ZpbmdcbiAgICAgICAgdmFyIGNvbF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLm1vZGVsO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGV2dC5jbGllbnRYIC0gbW91c2VYO1xuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gY29sdW1uV2lkdGggKyBjaGFuZ2U7XG4gICAgICAgICAgICBpZiAoIG5ld1dpZHRoIDwgY29sdW1uLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIikpIHJldHVybjtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjogbmV3V2lkdGh9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgZml0VG9Db250ZW50OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IDA7XG4gICAgICAgIHZhciBtaW5fd2lkdGggPSB0aGlzLm1vZGVsLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKTtcbiAgICAgICAgdmFyICRjdHggPSB0aGlzLiRlbC5wYXJlbnRzKCcudGFibGVkJykuZmluZCgnLnRib2R5Jyk7XG4gICAgICAgICQoXCIudGQuY29sLVwiK2lkK1wiIC5jZWxsLWlubmVyXCIsICRjdHgpLmVhY2goZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgbmV3X3dpZHRoID0gTWF0aC5tYXgobmV3X3dpZHRoLCQodGhpcykub3V0ZXJXaWR0aCh0cnVlKSwgbWluX3dpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnd2lkdGgnOm5ld193aWR0aH0se3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgfSxcbiAgICBcbiAgICBjaGFuZ2VDb2x1bW5Tb3J0OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG1vZGVsLmdldChcInNvcnRcIikgIT09IFwiZnVuY3Rpb25cIiB8fCBtb2RlbC5nZXQoXCJtb3ZpbmdcIikgPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJfc29ydCA9IG1vZGVsLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2dC5zaGlmdEtleSkge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBhbGwgc29ydHNcbiAgICAgICAgICAgIG1vZGVsLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2wpe1xuICAgICAgICAgICAgICAgIGlmIChjb2wgIT09IG1vZGVsKSBjb2wuc2V0KHtcInNvcnRfdmFsdWVcIjogXCJcIn0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoKGN1cl9zb3J0KSB7XG4gICAgICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImFcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYVwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBncmFiQ29sdW1uOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBvZmZzZXRYID0gZXZ0Lm9mZnNldFg7XG4gICAgICAgIHZhciB0aHJlc2hvbGRzID0gW107XG4gICAgICAgIHZhciBjdXJyZW50SWR4ID0gdGhpcy5tb2RlbC5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyICR0ciA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAkdHIuZmluZCgnLnRoJykuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJHRoaXMub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgIHZhciBoYWxmID0gJHRoaXMud2lkdGgoKSAvIDI7XG4gICAgICAgICAgICBpZiAoaSAhPSBjdXJyZW50SWR4KSB0aHJlc2hvbGRzLnB1c2gob2Zmc2V0K2hhbGYpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByZXZlbnRfbW91c2V1cCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGdldE5ld0luZGV4ID0gZnVuY3Rpb24ocG9zKSB7XG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHRocmVzaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdGhyZXNob2xkc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocG9zID4gdmFsKSBuZXdJZHgrKztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBuZXdJZHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGRyYXdIZWxwZXIgPSBmdW5jdGlvbihuZXdJZHgpIHtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGlmIChuZXdJZHggPT0gY3VycmVudElkeCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG5ld0lkeCA8IGN1cnJlbnRJZHggPyAnYmVmb3JlJyA6ICdhZnRlcic7XG4gICAgICAgICAgICAkdHIuZmluZCgnLnRoOmVxKCcrbmV3SWR4KycpJylbbWV0aG9kXSgnPGRpdiBjbGFzcz1cImNvbHNvcnQtaGVscGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlX2NvbHVtbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzpjaGFuZ2UsICdvcGFjaXR5JzowLjUsICd6SW5kZXgnOiAxMH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpO1xuICAgICAgICAgICAgZHJhd0hlbHBlcihuZXdJZHgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xlYW51cF9tb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzogMCwgJ29wYWNpdHknOjF9KTtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zb3J0SW5kZXgoZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpKTtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9tb3ZlKVxuICAgIH1cbn0pO1xuXG52YXIgVGhSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBUaENlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsIClcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IGNsYXNzPVwiZmlsdGVyXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiZmlsdGVyXCIgLz48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXInKTtcbiAgICAgICAgdmFyIG1hcmt1cCA9IHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy50ZW1wbGF0ZSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygndGQgY29sLScrdGhpcy5tb2RlbC5nZXQoJ2lkJykpLndpZHRoKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbChtYXJrdXApO1xuICAgICAgICB0aGlzLiQoXCJpbnB1dFwiKS52YWwodGhpcy5tb2RlbC5nZXQoJ2ZpbHRlcl92YWx1ZScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJjbGljayAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyXCIsXG4gICAgICAgIFwia2V5dXAgLmZpbHRlclwiOiBcInVwZGF0ZUZpbHRlckRlbGF5ZWRcIlxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ2ZpbHRlcl92YWx1ZScsICQudHJpbSh0aGlzLiQoJy5maWx0ZXInKS52YWwoKSkgKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUZpbHRlckRlbGF5ZWQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAodGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0KVxuICAgICAgICB0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMudXBkYXRlRmlsdGVyLmJpbmQodGhpcywgZXZ0KSwgMjAwKTtcbiAgICB9XG4gICAgXG59KTtcblxudmFyIEZpbHRlclJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gY2xlYXIgaXRcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwicmVtb3ZhbFwiKVxuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGVhY2ggdGggY2VsbFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRmlsdGVyQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgVGhlYWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgLy8gU2V0IGNvbmZpZ1xuICAgICAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgc3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhfcm93XCIsIG5ldyBUaFJvdyh7IGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbiB9KSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5uZWVkc0ZpbHRlclJvdygpKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnZpZXcoXCJmaWx0ZXJfcm93XCIsIG5ldyBGaWx0ZXJSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIHdoZW4gb2Zmc2V0IGlzIG5vdCB6ZXJvXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb25maWcsIFwiY2hhbmdlOm9mZnNldFwiLCBmdW5jdGlvbihtb2RlbCwgb2Zmc2V0KXtcbiAgICAgICAgICAgIHZhciB0b2dnbGVDbGFzcyA9IG9mZnNldCA9PT0gMCA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnIDtcbiAgICAgICAgICAgIHRoaXMuJGVsW3RvZ2dsZUNsYXNzXSgnb3ZlcmhhbmcnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0ciB0aC1yb3dcIj48L2Rpdj48ZGl2IGNsYXNzPVwidHIgZmlsdGVyLXJvd1wiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy5hc3NpZ24oeyAnLnRoLXJvdycgOiAndGhfcm93JyB9KTtcbiAgICAgICAgaWYgKHRoaXMuc3VidmlldygnZmlsdGVyX3JvdycpKSB7XG4gICAgICAgICAgICB0aGlzLmFzc2lnbih7ICcuZmlsdGVyLXJvdycgOiAnZmlsdGVyX3JvdycgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB0aGlzLiQoJy5maWx0ZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgbmVlZHNGaWx0ZXJSb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLnNvbWUoZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIGNvbHVtbi5nZXQoJ2ZpbHRlcicpICE9PSAndW5kZWZpbmVkJylcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG59KTtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRoZWFkOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vQmFzZVZpZXcnKTtcblxuLy8gdmFyIFRkYXRhID0gQmFzZVZpZXcuZXh0ZW5kKHtcbi8vICAgICBcbi8vICAgICBjbGFzc05hbWU6ICd0ZCcsXG4vLyAgICAgXG4vLyAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucyl7XG4vLyAgICAgICAgIHRoaXMuY29sdW1uID0gb3B0aW9ucy5jb2x1bW47XG4vLyAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW4sIFwiY2hhbmdlOndpZHRoXCIsIGZ1bmN0aW9uKGNvbHVtbiwgd2lkdGgpe1xuLy8gICAgICAgICAgICAgdGhpcy4kZWwud2lkdGgod2lkdGgpO1xuLy8gICAgICAgICB9KTtcbi8vICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpcIit0aGlzLmNvbHVtbi5nZXQoXCJrZXlcIiksIHRoaXMucmVuZGVyICk7XG4vLyAgICAgfSxcbi8vICAgICBcbi8vICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PC9kaXY+Jyxcbi8vICAgICBcbi8vICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnY29sLScrdGhpcy5jb2x1bW4uaWQpLndpZHRoKHRoaXMuY29sdW1uLmdldCgnd2lkdGgnKSk7XG4vLyAgICAgICAgIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy50ZW1wbGF0ZTtcbi8vICAgICAgICAgLy8gdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbi8vICAgICAgICAgdGhpcy4kKFwiLmNlbGwtaW5uZXJcIikuYXBwZW5kKCB0aGlzLmNvbHVtbi5nZXRGb3JtYXR0ZWQodGhpcy5tb2RlbCkgKTtcbi8vICAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICAgfVxuLy8gICAgIFxuLy8gfSk7XG5cbnZhciBUcm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0cicsXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwicmVtb3ZhbFwiKTtcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgaWQgPSBjb2x1bW4uZ2V0KCdpZCcpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBjb2x1bW4uZ2V0Rm9ybWF0dGVkKHRoaXMubW9kZWwpO1xuICAgICAgICAgICAgdmFyICR2aWV3ID0gJCgnPGRpdiBjbGFzcz1cInRkIGNvbC0nK2lkKydcIiBzdHlsZT1cIndpZHRoOicrd2lkdGgrJ3B4XCI+PGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICR2aWV3LmZpbmQoJy5jZWxsLWlubmVyJykuYXBwZW5kKGZvcm1hdHRlZCk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoJHZpZXcpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn0pO1xuXG5cblxudmFyIFRib2R5ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29sdW1ucyA9IG9wdGlvbnMuY29sdW1ucztcbiAgICAgICAgdGhpcy5jb25maWcgPSB0aGlzLmNvbHVtbnMuY29uZmlnO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJyZXNldFwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInNvcnRcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJ1cGRhdGVcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcInVwZGF0ZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTp3aWR0aFwiLCB0aGlzLmFkanVzdENvbHVtbldpZHRoICk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb25maWcsIFwiY2hhbmdlOm9mZnNldFwiLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICBcbiAgICBhZGp1c3RDb2x1bW5XaWR0aDogZnVuY3Rpb24obW9kZWwsIG5ld1dpZHRoLCBvcHRpb25zKXtcbiAgICAgICAgdGhpcy4kKCcudGQuY29sLScrbW9kZWwuZ2V0KFwiaWRcIikpLndpZHRoKG5ld1dpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIC8vIFJlbmRlcnMgdGhlIHZpc2libGUgcm93cyBnaXZlbiB0aGUgY3VycmVudCBvZmZzZXQgYW5kIG1heF9yb3dzXG4gICAgLy8gcHJvcGVydGllcyBvbiB0aGUgY29uZmlnIG9iamVjdC5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJyZW1vdmFsXCIpO1xuICAgICAgICB2YXIgcm93c190b19yZW5kZXIgPSB0aGlzLmNvbmZpZy5nZXRWaXNpYmxlUm93cygpO1xuICAgICAgICBpZiAocm93c190b19yZW5kZXIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICByb3dzX3RvX3JlbmRlci5mb3JFYWNoKGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgICAgICB2YXIgcm93VmlldyA9IG5ldyBUcm93KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogcm93LFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHJvd1ZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHJvd1ZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHJvd1ZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWQnKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJ3aGVlbFwiOiBcIm9uTW91c2VXaGVlbFwiLFxuICAgICAgICBcIm1vdXNld2hlZWxcIjogXCJvbk1vdXNlV2hlZWxcIlxuICAgIH0sXG4gICAgXG4gICAgb25Nb3VzZVdoZWVsOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgLy8gQmlnSW50ZWdlclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBub3JtYWxpemUgd2Via2l0L2ZpcmVmb3ggc2Nyb2xsIHZhbHVlc1xuICAgICAgICB2YXIgZGVsdGFZID0gLWV2dC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFZIHx8IGV2dC5vcmlnaW5hbEV2ZW50LmRlbHRhWSAqIDEwMDtcbiAgICAgICAgdmFyIG1vdmVtZW50ID0gTWF0aC5yb3VuZChkZWx0YVkgLyAxMDApO1xuICAgICAgICBpZiAoaXNOYU4obW92ZW1lbnQpKSByZXR1cm47XG4gICAgICAgIHZhciBvcmlnT2Zmc2V0ID0gdGhpcy5jb25maWcuZ2V0KFwib2Zmc2V0XCIpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmNvbmZpZy5nZXQoXCJtYXhfcm93c1wiKTtcbiAgICAgICAgdmFyIG9mZnNldCA9IE1hdGgubWluKCB0aGlzLmNvbGxlY3Rpb24ubGVuZ3RoIC0gbGltaXQsIE1hdGgubWF4KCAwLCBvcmlnT2Zmc2V0ICsgbW92ZW1lbnQpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29uZmlnLnNldCh7XCJvZmZzZXRcIjogb2Zmc2V0fSwge3ZhbGlkYXRlOiB0cnVlfSApO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IG9ubHkgd2hlbiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgJiYgb2Zmc2V0IDwgdGhpcy5jb2xsZWN0aW9uLmxlbmd0aCAtIGxpbWl0KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG59KTtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRib2R5OyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vQmFzZVZpZXcnKTtcbnZhciBTY3JvbGxlciA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOm9mZnNldFwiLCB0aGlzLnVwZGF0ZVBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5saXN0ZW5UbyhvcHRpb25zLnRib2R5LCBcInJlbmRlcmVkXCIsIHRoaXMucmVuZGVyKTtcbiAgICB9LCAgICBcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJpbm5lclwiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZVBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMubW9kZWwuZ2V0KCdvZmZzZXQnKTtcbiAgICAgICAgdmFyIGxpbWl0ID0gdGhpcy5tb2RlbC5nZXQoJ21heF9yb3dzJyk7XG4gICAgICAgIHZhciB0b3RhbCA9IHRoaXMubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJyk7XG4gICAgICAgIHZhciBhY3R1YWxfaCA9IHRoaXMuJGVsLnBhcmVudCgpLmhlaWdodCgpO1xuICAgICAgICB2YXIgYWN0dWFsX3IgPSBhY3R1YWxfaCAvIHRvdGFsO1xuICAgICAgICB2YXIgc2Nyb2xsX2hlaWdodCA9IGxpbWl0ICogYWN0dWFsX3I7XG4gICAgICAgIGlmIChzY3JvbGxfaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICAgIHZhciBjb3JyZWN0aW9uID0gMTAgLSBzY3JvbGxfaGVpZ2h0O1xuICAgICAgICAgICAgYWN0dWFsX2ggLT0gY29ycmVjdGlvbjtcbiAgICAgICAgICAgIGFjdHVhbF9yID0gYWN0dWFsX2ggLyB0b3RhbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2Nyb2xsX3RvcCA9IG9mZnNldCAqIGFjdHVhbF9yO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNjcm9sbF9oZWlnaHQgPCBhY3R1YWxfaCAmJiB0b3RhbCA+IGxpbWl0KSB7XG4gICAgICAgICAgICB0aGlzLiQoXCIuaW5uZXJcIikuY3NzKHtcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHNjcm9sbF9oZWlnaHQsXG4gICAgICAgICAgICAgICAgdG9wOiBzY3JvbGxfdG9wXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi5pbm5lclwiKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAuaW5uZXJcIjogXCJncmFiU2Nyb2xsZXJcIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlNjcm9sbGVyOiBmdW5jdGlvbihldnQpe1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VZID0gZXZ0LmNsaWVudFk7XG4gICAgICAgIHZhciBvZmZzZXRZID0gZXZ0Lm9mZnNldFk7XG4gICAgICAgIHZhciByYXRpbyA9IHRoaXMubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJykgLyB0aGlzLiRlbC5wYXJlbnQoKS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIGluaXRPZmZzZXQgPSBzZWxmLm1vZGVsLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBtb3ZlU2Nyb2xsZXIoZXZ0KXtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRZO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VZO1xuICAgICAgICAgICAgdmFyIG5ld09mZnNldCA9IE1hdGgubWF4KE1hdGgucm91bmQocmF0aW8gKiBjaGFuZ2UpICsgaW5pdE9mZnNldCwgMCk7XG4gICAgICAgICAgICBuZXdPZmZzZXQgPSBNYXRoLm1pbihuZXdPZmZzZXQsIHNlbGYubW9kZWwuZ2V0KCd0b3RhbF9yb3dzJykgLSBzZWxmLm1vZGVsLmdldCgnbWF4X3Jvd3MnKSlcbiAgICAgICAgICAgIHNlbGYubW9kZWwuc2V0KHsnb2Zmc2V0JzpuZXdPZmZzZXR9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gcmVsZWFzZVNjcm9sbGVyKGV2dCl7XG4gICAgICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIG1vdmVTY3JvbGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBtb3ZlU2Nyb2xsZXIpO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCByZWxlYXNlU2Nyb2xsZXIpO1xuICAgIH1cbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBTY3JvbGxlciIsImV4cG9ydHMubGlrZSA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlLCBjb21wdXRlZFZhbHVlLCByb3cpIHtcbiAgICB0ZXJtID0gdGVybS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdmFsdWUuaW5kZXhPZih0ZXJtKSA+IC0xO1xufVxuZXhwb3J0cy5pcyA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlLCBjb21wdXRlZFZhbHVlLCByb3cpIHtcbiAgICB0ZXJtID0gdGVybS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gdGVybSA9PSB2YWx1ZTtcbn1cbmV4cG9ydHMubnVtYmVyID0gZnVuY3Rpb24odGVybSwgdmFsdWUpIHtcbiAgICB2YWx1ZSAqPSAxO1xuICAgIHZhciBmaXJzdF90d28gPSB0ZXJtLnN1YnN0cigwLDIpO1xuICAgIHZhciBmaXJzdF9jaGFyID0gdGVybVswXTtcbiAgICB2YXIgYWdhaW5zdF8xID0gdGVybS5zdWJzdHIoMSkqMTtcbiAgICB2YXIgYWdhaW5zdF8yID0gdGVybS5zdWJzdHIoMikqMTtcbiAgICBpZiAoIGZpcnN0X3R3byA9PSBcIjw9XCIgKSByZXR1cm4gdmFsdWUgPD0gYWdhaW5zdF8yIDtcbiAgICBpZiAoIGZpcnN0X3R3byA9PSBcIj49XCIgKSByZXR1cm4gdmFsdWUgPj0gYWdhaW5zdF8yIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI8XCIgKSByZXR1cm4gdmFsdWUgPCBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj5cIiApIHJldHVybiB2YWx1ZSA+IGFnYWluc3RfMSA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiflwiICkgcmV0dXJuIE1hdGgucm91bmQodmFsdWUpID09IGFnYWluc3RfMSA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPVwiICkgcmV0dXJuIGFnYWluc3RfMSA9PSB2YWx1ZSA7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCkuaW5kZXhPZih0ZXJtLnRvU3RyaW5nKCkpID4gLTEgO1xufSIsImV4cG9ydHMubnVtYmVyID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmdW5jdGlvbihyb3cxLHJvdzIpIHsgXG4gICAgICAgIHJldHVybiByb3cxLmdldChmaWVsZCkqMSAtIHJvdzIuZ2V0KGZpZWxkKSoxO1xuICAgIH1cbn1cbmV4cG9ydHMuc3RyaW5nID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiBmdW5jdGlvbihyb3cxLHJvdzIpIHsgXG4gICAgICAgIGlmICggcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA9PSByb3cyLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpICkgcmV0dXJuIDA7XG4gICAgICAgIHJldHVybiByb3cxLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID4gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA/IDEgOiAtMSA7XG4gICAgfVxufSIsImV4cG9ydHMuc2VsZWN0ID0gZnVuY3Rpb24odmFsdWUsIG1vZGVsKSB7XG4gICAgdmFyIHNlbGVjdF9rZXkgPSAnc2VsZWN0ZWQnO1xuICAgIHZhciBjaGVja2VkID0gbW9kZWxbc2VsZWN0X2tleV0gPT09IHRydWU7XG4gICAgdmFyICRyZXQgPSAkKCc8ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cInNlbGVjdGJveFwiPjwvZGl2PicpO1xuICAgIFxuICAgIC8vIFNldCBjaGVja2VkXG4gICAgdmFyICRjYiA9ICRyZXQuZmluZCgnaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgY2hlY2tlZCk7XG4gICAgXG4gICAgLy8gU2V0IGNsaWNrIGJlaGF2aW9yXG4gICAgJGNiLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB2YXIgc2VsZWN0ZWQgPSAhISAkY2IuaXMoXCI6Y2hlY2tlZFwiKTtcbiAgICAgICAgbW9kZWxbc2VsZWN0X2tleV0gPSBzZWxlY3RlZDtcbiAgICAgICAgbW9kZWwudHJpZ2dlcignY2hhbmdlX3NlbGVjdGVkJywgbW9kZWwsIHNlbGVjdGVkKTtcbiAgICB9KVxuICAgIFxuICAgIHJldHVybiAkcmV0O1xufVxuXG5leHBvcnRzLmNvbW1hSW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgcGFydHMgPSB4LnRvU3RyaW5nKCkuc3BsaXQoXCIuXCIpO1xuICAgIHBhcnRzWzBdID0gcGFydHNbMF0ucmVwbGFjZSgvXFxCKD89KFxcZHszfSkrKD8hXFxkKSkvZywgXCIsXCIpO1xuICAgIHJldHVybiBwYXJ0cy5qb2luKFwiLlwiKTtcbn1cbmZ1bmN0aW9uIHRpbWVTaW5jZSh0aW1lc3RhbXAsIGNvbXBhcmVEYXRlLCB0aW1lQ2h1bmspIHtcbiAgICB2YXIgbm93ID0gY29tcGFyZURhdGUgPT09IHVuZGVmaW5lZCA/ICtuZXcgRGF0ZSgpIDogY29tcGFyZURhdGU7XG4gICAgdmFyIHJlbWFpbmluZyA9ICh0aW1lQ2h1bmsgIT09IHVuZGVmaW5lZCkgPyB0aW1lQ2h1bmsgOiBub3cgLSB0aW1lc3RhbXA7XG4gICAgdmFyIHN0cmluZyA9IFwiXCI7XG4gICAgdmFyIHNlcGFyYXRvciA9IFwiLCBcIjtcbiAgICB2YXIgbGV2ZWwgPSAwO1xuICAgIHZhciBtYXhfbGV2ZWxzID0gMztcbiAgICB2YXIgbWlsbGlfcGVyX3NlY29uZCA9IDEwMDA7XG4gICAgdmFyIG1pbGxpX3Blcl9taW51dGUgPSBtaWxsaV9wZXJfc2Vjb25kICogNjA7XG4gICAgdmFyIG1pbGxpX3Blcl9ob3VyID0gbWlsbGlfcGVyX21pbnV0ZSAqIDYwO1xuICAgIHZhciBtaWxsaV9wZXJfZGF5ID0gbWlsbGlfcGVyX2hvdXIgKiAyNDtcbiAgICB2YXIgbWlsbGlfcGVyX3dlZWsgPSBtaWxsaV9wZXJfZGF5ICogNztcbiAgICB2YXIgbWlsbGlfcGVyX21vbnRoID0gbWlsbGlfcGVyX3dlZWsgKiA0O1xuICAgIHZhciBtaWxsaV9wZXJfeWVhciA9IG1pbGxpX3Blcl9kYXkgKiAzNjU7XG4gICAgXG4gICAgdmFyIGxldmVscyA9IFtcbiAgICBcbiAgICAgICAgeyBwbHVyYWw6IFwieWVhcnNcIiwgc2luZ3VsYXI6IFwieWVhclwiLCBtczogbWlsbGlfcGVyX3llYXIgfSxcbiAgICAgICAgeyBwbHVyYWw6IFwibW9udGhzXCIsIHNpbmd1bGFyOiBcIm1vbnRoXCIsIG1zOiBtaWxsaV9wZXJfbW9udGggfSxcbiAgICAgICAgeyBwbHVyYWw6IFwid2Vla3NcIiwgc2luZ3VsYXI6IFwid2Vla1wiLCBtczogbWlsbGlfcGVyX3dlZWsgfSxcbiAgICAgICAgeyBwbHVyYWw6IFwiZGF5c1wiLCBzaW5ndWxhcjogXCJkYXlcIiwgbXM6IG1pbGxpX3Blcl9kYXkgfSxcbiAgICAgICAgeyBwbHVyYWw6IFwiaG91cnNcIiwgc2luZ3VsYXI6IFwiaG91clwiLCBtczogbWlsbGlfcGVyX2hvdXIgfSxcbiAgICAgICAgeyBwbHVyYWw6IFwibWludXRlc1wiLCBzaW5ndWxhcjogXCJtaW51dGVcIiwgbXM6IG1pbGxpX3Blcl9taW51dGUgfSxcbiAgICAgICAgeyBwbHVyYWw6IFwic2Vjb25kc1wiLCBzaW5ndWxhcjogXCJzZWNvbmRcIiwgbXM6IG1pbGxpX3Blcl9zZWNvbmQgfVxuICAgIF07XG4gICAgXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICggcmVtYWluaW5nIDwgbGV2ZWxzW2ldLm1zICkgY29udGludWU7XG4gICAgICAgIGxldmVsKys7XG4gICAgICAgIHZhciBudW0gPSBNYXRoLmZsb29yKCByZW1haW5pbmcgLyBsZXZlbHNbaV0ubXMgKTtcbiAgICAgICAgdmFyIGxhYmVsID0gbnVtID09IDEgPyBsZXZlbHNbaV0uc2luZ3VsYXIgOiBsZXZlbHNbaV0ucGx1cmFsIDtcbiAgICAgICAgc3RyaW5nICs9IG51bSArIFwiIFwiICsgbGFiZWwgKyBzZXBhcmF0b3I7XG4gICAgICAgIHJlbWFpbmluZyAlPSBsZXZlbHNbaV0ubXM7XG4gICAgICAgIGlmICggbGV2ZWwgPj0gbWF4X2xldmVscyApIGJyZWFrO1xuICAgIH07XG4gICAgXG4gICAgc3RyaW5nID0gc3RyaW5nLnN1YnN0cmluZygwLCBzdHJpbmcubGVuZ3RoIC0gc2VwYXJhdG9yLmxlbmd0aCk7XG4gICAgcmV0dXJuIHN0cmluZztcbn1cbmV4cG9ydHMudGltZVNpbmNlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoL15cXGQrJC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIG5ld1ZhbCA9IHRpbWVTaW5jZSh2YWx1ZSkgfHwgXCJhIG1vbWVudFwiO1xuICAgICAgICByZXR1cm4gbmV3VmFsICsgXCIgYWdvXCI7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn0iXX0=
;