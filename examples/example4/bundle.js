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
        var resizableColCount = 0;
        var col_state = this.columns.reduce(function(memo, column, index){
            memo[column.get('id')] = column.get('width');
            if (!column.get('lock_width')) ++resizableColCount;
            return memo;
        },{},this);
        
        // Vertical 
        var mouseY = evt.clientY;
        var row_height = $(".tr", this.$el).height();
        var initMax = this.config.get('max_rows');
        
        var table_resize = function(evt){
            // Horizontal
            var changeX = (evt.clientX - mouseX)/resizableColCount;
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
},{"./BaseView":3}],5:[function(require,module,exports){
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1Rib2R5LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UaGVhZC5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU2Nyb2xsZXIuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1NvcnRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Gb3JtYXRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL25vZGVfbW9kdWxlcy9ib3JtYXQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFRhYmxlZCA9IHJlcXVpcmUoJy4uLy4uLycpO1xuXG5mdW5jdGlvbiBpbmNoZXMyZmVldChpbmNoZXMsIG1vZGVsKXtcbiAgICB2YXIgZmVldCA9IE1hdGguZmxvb3IoaW5jaGVzLzEyKTtcbiAgICB2YXIgaW5jaGVzID0gaW5jaGVzICUgMTI7XG4gICAgcmV0dXJuIGZlZXQgKyBcIidcIiArIGluY2hlcyArICdcIic7XG59XG5cbmZ1bmN0aW9uIGZlZXRfZmlsdGVyKHRlcm0sIHZhbHVlLCBmb3JtYXR0ZWQsIG1vZGVsKSB7XG4gICAgaWYgKHRlcm0gPT0gXCJ0YWxsXCIpIHJldHVybiB2YWx1ZSA+IDcwO1xuICAgIGlmICh0ZXJtID09IFwic2hvcnRcIikgcmV0dXJuIHZhbHVlIDwgNjk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjb2x1bW5zID0gW1xuICAgIHsgaWQ6IFwic2VsZWN0b3JcIiwga2V5OiBcInNlbGVjdGVkXCIsIGxhYmVsOiBcIlwiLCBzZWxlY3Q6IHRydWUsIHdpZHRoOiAzMCwgbG9ja193aWR0aDogdHJ1ZSB9LFxuICAgIHsgaWQ6IFwiSURcIiwga2V5OiBcImlkXCIsIGxhYmVsOiBcIklEXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiZmlyc3RfbmFtZVwiLCBrZXk6IFwiZmlyc3RfbmFtZVwiLCBsYWJlbDogXCJGaXJzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwibGFzdF9uYW1lXCIsIGtleTogXCJsYXN0X25hbWVcIiwgbGFiZWw6IFwiTGFzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwiYWdlXCIsIGtleTogXCJhZ2VcIiwgbGFiZWw6IFwiQWdlXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiaGVpZ2h0XCIsIGtleTogXCJoZWlnaHRcIiwgbGFiZWw6IFwiSGVpZ2h0XCIsIGZvcm1hdDogaW5jaGVzMmZlZXQsIGZpbHRlcjogZmVldF9maWx0ZXIsIHNvcnQ6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcIndlaWdodFwiLCBrZXk6IFwid2VpZ2h0XCIsIGxhYmVsOiBcIldlaWdodFwiLCBmaWx0ZXI6IFwibnVtYmVyXCIsIHNvcnQ6IFwibnVtYmVyXCIgfVxuXTtcbnZhciBjb2xsZWN0aW9uID0gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oW10pO1xudmFyIHRhYmxlZCA9IG5ldyBUYWJsZWQoe1xuICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb24sXG4gICAgY29sdW1uczogY29sdW1ucyxcbiAgICB0YWJsZV93aWR0aDogODAwICAgIFxufSk7XG52YXIgJHBnID0gJChcIiNwbGF5Z3JvdW5kXCIpO1xudGFibGVkLnJlbmRlcigpLiRlbC5hcHBlbmRUbygkcGcpO1xuXG5mdW5jdGlvbiBnZW5Sb3coaWQpe1xuICAgIFxuICAgIHZhciBmbmFtZXMgPSBbXG4gICAgICAgIFwiam9lXCIsXG4gICAgICAgIFwiZnJlZFwiLFxuICAgICAgICBcImZyYW5rXCIsXG4gICAgICAgIFwiamltXCIsXG4gICAgICAgIFwibWlrZVwiLFxuICAgICAgICBcImdhcnlcIixcbiAgICAgICAgXCJheml6XCJcbiAgICBdO1xuXG4gICAgdmFyIGxuYW1lcyA9IFtcbiAgICAgICAgXCJzdGVybGluZ1wiLFxuICAgICAgICBcInNtaXRoXCIsXG4gICAgICAgIFwiZXJpY2tzb25cIixcbiAgICAgICAgXCJidXJrZVwiXG4gICAgXTtcbiAgICBcbiAgICB2YXIgc2VlZCA9IE1hdGgucmFuZG9tKCk7XG4gICAgdmFyIHNlZWQyID0gTWF0aC5yYW5kb20oKTtcbiAgICBcbiAgICB2YXIgZmlyc3RfbmFtZSA9IGZuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChmbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgdmFyIGxhc3RfbmFtZSA9IGxuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChsbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBzZWxlY3RlZDogZmFsc2UsXG4gICAgICAgIGZpcnN0X25hbWU6IGZpcnN0X25hbWUsXG4gICAgICAgIGxhc3RfbmFtZTogbGFzdF9uYW1lLFxuICAgICAgICBhZ2U6IE1hdGguY2VpbChzZWVkICogNzUpICsgMTUsXG4gICAgICAgIGhlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAzNiApICsgNDgsXG4gICAgICAgIHdlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAxMzAgKSArIDkwXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZW5Sb3dzKG51bSl7XG4gICAgdmFyIHJldFZhbCA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IG51bTsgaSsrKSB7XG4gICAgICAgIHJldFZhbC5wdXNoKGdlblJvdyhpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0VmFsO1xufVxuXG53aW5kb3cuc3RvcCA9IGZhbHNlO1xudmFyIGludHZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgaWYgKHdpbmRvdy5zdG9wKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50dmFsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbmV3Um93cyA9IGdlblJvd3MoMzAwKTtcbiAgICB2YXIgbWV0aG9kID0gY29sbGVjdGlvbi5sZW5ndGggPyAnc2V0JyA6ICdyZXNldCcgO1xuICAgIC8vIHZhciBzdGFydFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICBjb2xsZWN0aW9uW21ldGhvZF0obmV3Um93cyk7XG4gICAgLy8gdmFyIGVuZFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAvLyBjb25zb2xlLmxvZygoZW5kVGltZSAtIHN0YXJ0VGltZSkvMTAwMCk7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ3NldCcpIGNvbGxlY3Rpb24udHJpZ2dlcigndXBkYXRlJyk7XG59LCAzMDAwKTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2xpYi9CYXNlVmlldycpO1xudmFyIENvbHVtbiA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLm1vZGVsO1xudmFyIENvbHVtbnMgPSByZXF1aXJlKCcuL2xpYi9Db2x1bW4nKS5jb2xsZWN0aW9uO1xudmFyIFRoZWFkID0gcmVxdWlyZSgnLi9saWIvVGhlYWQnKTtcbnZhciBUYm9keSA9IHJlcXVpcmUoJy4vbGliL1Rib2R5Jyk7XG52YXIgU2Nyb2xsZXIgPSByZXF1aXJlKCcuL2xpYi9TY3JvbGxlcicpO1xuXG52YXIgQ29uZmlnTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIC8vIE1ha2VzIHRhYmxlIHdpZHRoIGFuZCBjb2x1bW4gd2lkdGhzIGFkanVzdGFibGVcbiAgICAgICAgYWRqdXN0YWJsZV93aWR0aDogdHJ1ZSxcbiAgICAgICAgLy8gU2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHRhYmxlIHdpZHRoc1xuICAgICAgICBzYXZlX3N0YXRlOiBmYWxzZSxcbiAgICAgICAgLy8gRGVmYXVsdCBtaW5pbXVtIGNvbHVtbiB3aWR0aCwgaW4gcGl4ZWxzXG4gICAgICAgIG1pbl9jb2x1bW5fd2lkdGg6IDMwLFxuICAgICAgICAvLyBEZWZhdWx0IHdpZHRoIGZvciB0aGUgdGFibGUgaXRzZWxmLiBFaXRoZXIgcGl4ZWxzIG9yICdhdXRvJ1xuICAgICAgICB0YWJsZV93aWR0aDogJ2F1dG8nLFxuICAgICAgICAvLyBEZWZhdWx0IG1heCBudW1iZXIgb2Ygcm93cyB0byByZW5kZXIgYmVmb3JlIHNjcm9sbCBvbiB0Ym9keVxuICAgICAgICBtYXhfcm93czogMzAsXG4gICAgICAgIC8vIERlZmF1bHQgb2Zmc2V0IGZvciB0aGUgdGJvZHlcbiAgICAgICAgb2Zmc2V0OiAwLFxuICAgICAgICAvLyBTZXQgaW4gdGhlIHJlbmRlcmluZyBwaGFzZSBvZiB0aGUgdGJvZHkgKGNvZGUgc21lbGwuLi4pXG4gICAgICAgIHRvdGFsX3Jvd3M6IDBcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBpZiAoIGF0dHJzLm9mZnNldCA+IE1hdGgubWF4KGF0dHJzLm1heF9yb3dzLCBhdHRycy50b3RhbF9yb3dzKSAtIGF0dHJzLm1heF9yb3dzICkge1xuICAgICAgICAgICAgcmV0dXJuIFwiT2Zmc2V0IGNhbm5vdCBiZSB0aGF0IGhpZ2guXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm9mZnNldCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIk9mZnNldCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm1heF9yb3dzIDwgMSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibWF4X3Jvd3MgbXVzdCBhdGxlYXN0IDFcIjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0VmlzaWJsZVJvd3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5nZXQoJ29mZnNldCcpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmdldCgnbWF4X3Jvd3MnKTtcbiAgICAgICAgdmFyIHJvd3NfdG9fcmVuZGVyID0gW107XG4gICAgICAgIHRoaXMuZ2V0KFwiY29sbGVjdGlvblwiKS5lYWNoKGZ1bmN0aW9uKHJvdywgaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdGhpcy5wYXNzZXNGaWx0ZXJzKHJvdykgKSArK3RvdGFsO1xuICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdG90YWwgPD0gb2Zmc2V0ICkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIHRvdGFsID4gKG9mZnNldCArIGxpbWl0KSApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcm93c190b19yZW5kZXIucHVzaChyb3cpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHByZXZfdG90YWwgPSB0aGlzLmdldCgndG90YWxfcm93cycpKjE7XG4gICAgICAgIGlmICh0b3RhbCAhPT0gcHJldl90b3RhbCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX3Jvd3MnLCB0b3RhbClcbiAgICAgICAgICAgIHZhciBuZXdPZmZzZXQgPSBNYXRoLm1pbih0b3RhbCAtIGxpbWl0LCBvZmZzZXQpO1xuICAgICAgICAgICAgaWYgKG5ld09mZnNldCA9PT0gb2Zmc2V0KSB0aGlzLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnNldCgnb2Zmc2V0JywgbmV3T2Zmc2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm93c190b19yZW5kZXI7XG4gICAgfSxcbiAgICBwYXNzZXNGaWx0ZXJzOiBmdW5jdGlvbihyb3cpe1xuICAgICAgICByZXR1cm4gdGhpcy5jb2x1bW5zLmV2ZXJ5KGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICBpZiAoY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJykgPT0gXCJcIiB8fCB0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXNzZXNGaWx0ZXIocm93LCBjb2x1bW4pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuICAgIHBhc3Nlc0ZpbHRlcjogZnVuY3Rpb24ocm93LCBjb2x1bW4pe1xuICAgICAgICByZXR1cm4gY29sdW1uLmdldCgnZmlsdGVyJykoIGNvbHVtbi5nZXQoJ2ZpbHRlcl92YWx1ZScpLCByb3cuZ2V0KGNvbHVtbi5nZXQoJ2tleScpKSwgY29sdW1uLmdldEZvcm1hdHRlZChyb3cpLCByb3cgKTtcbiAgICB9LFxuICAgIFxufSk7XG5cbnZhciBUYWJsZWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGlzLmNvbGxlY3Rpb24gKHRoZSBkYXRhKSBpcyBhIGJhY2tib25lIGNvbGxlY3Rpb25cbiAgICAgICAgaWYgKCAhKHRoaXMuY29sbGVjdGlvbiBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pICkgdGhyb3cgXCJUYWJsZWQgbXVzdCBiZSBwcm92aWRlZCB3aXRoIGEgYmFja2JvbmUgY29sbGVjdGlvbiBhcyBpdHMgZGF0YVwiO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlnIG9iamVjdFxuICAgICAgICB0aGlzLmNvbmZpZyA9IG5ldyBDb25maWdNb2RlbCh0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIC8vIENvbHVtbnNcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gbmV3IENvbHVtbnModGhpcy5jb25maWcuZ2V0KFwiY29sdW1uc1wiKSx7Y29uZmlnOiB0aGlzLmNvbmZpZ30pO1xuICAgICAgICB0aGlzLmNvbmZpZy5jb2x1bW5zID0gdGhpcy5jb2x1bW5zO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhlYWRcIiwgbmV3IFRoZWFkKHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1ucyxcbiAgICAgICAgICAgIGNvbmZpZzogdGhpcy5jb25maWdcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0Ym9keVwiLCBuZXcgVGJvZHkoe1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogdGhpcy5jb2x1bW5zXG4gICAgICAgIH0pKTtcbiAgICAgICAgdGhpcy5zdWJ2aWV3KCdzY3JvbGxlcicsIG5ldyBTY3JvbGxlcih7XG4gICAgICAgICAgICBtb2RlbDogdGhpcy5jb25maWcsXG4gICAgICAgICAgICB0Ym9keTogdGhpcy5zdWJ2aWV3KCd0Ym9keScpXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRlXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJzYXZlX3N0YXRlXCIpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVQcmV2aW91c1N0YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbmVyc1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5vbldpZHRoQ2hhbmdlICk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpmaWx0ZXJfdmFsdWVcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLnNldChcIm9mZnNldFwiLCAwKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQm9keSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJjaGFuZ2U6bWF4X3Jvd3NcIiwgdGhpcy5vbk1heFJvd0NoYW5nZSk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpjb21wYXJhdG9yXCIsIHRoaXMudXBkYXRlQ29tcGFyYXRvcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcInNvcnRcIiwgdGhpcy5vbkNvbHVtblNvcnQpO1xuICAgICAgICBcbiAgICAgICAgLy8gSEFDSzogc2V0IHVwIGRhdGEgY29tcGFyYXRvclxuICAgICAgICB0aGlzLmNvbHVtbnMudXBkYXRlQ29tcGFyYXRvcigpO1xuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6IFtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0YWJsZWQtY3RuclwiPjxkaXYgY2xhc3M9XCJ0YWJsZWQtaW5uZXJcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZFwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGhlYWRcIj48L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRib2R5LW91dGVyXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0Ym9keVwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwic2Nyb2xsZXJcIj48L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyZXNpemUtdGFibGVcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+PC9kaXY+J1xuICAgIF0uam9pbihcIlwiKSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgaW5pdGlhbCBtYXJrdXBcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgLy8gU2V0IHRoZSB3aWR0aHMgb2YgdGhlIGNvbHVtbnNcbiAgICAgICAgdGhpcy5zZXRXaWR0aHMoKTtcbiAgICAgICAgLy8gKFJlKXJlbmRlciBzdWJ2aWV3c1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJyxcbiAgICAgICAgICAgICcudGJvZHknOiAndGJvZHknLFxuICAgICAgICAgICAgJy5zY3JvbGxlcic6ICdzY3JvbGxlcidcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckJvZHk6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGJvZHknOiAndGJvZHknLFxuICAgICAgICAgICAgJy5zY3JvbGxlcic6ICdzY3JvbGxlcidcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXJIZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIG9uV2lkdGhDaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYWRqdXN0SW5uZXJEaXYoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdGhlIHdpZHRoc1xuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHJldHVybjtcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuY29sdW1ucy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSwge30sIHRoaXMpO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJywgd2lkdGhzKTtcbiAgICB9LFxuICAgIFxuICAgIG9uTWF4Um93Q2hhbmdlOiBmdW5jdGlvbihtb2RlbCwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJCb2R5KCk7XG4gICAgICAgIHRoaXMuc3RhdGUoJ21heF9yb3dzJywgdmFsdWUpO1xuICAgIH0sXG4gICAgXG4gICAgb25Db2x1bW5Tb3J0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc29ydFxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHJldHVybjtcbiAgICAgICAgdmFyIHNvcnRzID0gdGhpcy5jb2x1bW5zLmNvbF9zb3J0cztcbiAgICAgICAgdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJywgc29ydHMpO1xuICAgIH0sXG4gICAgXG4gICAgc2V0V2lkdGhzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIFRhYmxlJ3Mgd2lkdGhcbiAgICAgICAgdmFyIHRvdGFsV2lkdGggPSB0aGlzLmNvbmZpZy5nZXQoXCJ0YWJsZV93aWR0aFwiKSA9PT0gJ2F1dG8nID8gdGhpcy4kZWwud2lkdGgoKSA6IHRoaXMuY29uZmlnLmdldChcInRhYmxlX3dpZHRoXCIpO1xuICAgICAgICB2YXIgbWFrZURlZmF1bHQgPSBbXTtcbiAgICAgICAgdmFyIGFkanVzdGVkV2lkdGggPSAwO1xuICAgICAgICB0aGlzLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICB2YXIgY29sX3dpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHZhciBtaW5fY29sX3dpZHRoID0gY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpXG4gICAgICAgICAgICBpZiAoIGNvbF93aWR0aCApIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IGNvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IGNvbF93aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG1pbl9jb2xfd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB0b3RhbFdpZHRoIC09IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSBtaW5fY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYWtlRGVmYXVsdC5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgYXZnX3dpZHRoID0gbWFrZURlZmF1bHQubGVuZ3RoID8gdG90YWxXaWR0aC9tYWtlRGVmYXVsdC5sZW5ndGggOiAwIDtcbiAgICAgICAgdmFyIGRlZmF1bHRXaWR0aCA9IE1hdGgubWF4KE1hdGguZmxvb3IoYXZnX3dpZHRoKSwgdGhpcy5jb25maWcuZ2V0KFwibWluX2NvbHVtbl93aWR0aFwiKSkgO1xuICAgICAgICBtYWtlRGVmYXVsdC5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IE1hdGgubWF4KGRlZmF1bHRXaWR0aCwgY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpIHx8IGRlZmF1bHRXaWR0aCk7XG4gICAgICAgICAgICBjb2x1bW4uc2V0KCd3aWR0aCcsIHdpZHRoKTtcbiAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gd2lkdGg7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiQoJy50YWJsZWQtaW5uZXInKS53aWR0aChhZGp1c3RlZFdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGFkanVzdElubmVyRGl2OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKSB8fCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbyoxICsgd2lkdGgqMTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIHRoaXMuJCgnLnRhYmxlZC1pbm5lcicpLndpZHRoKHdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICAnbW91c2Vkb3duIC5yZXNpemUtdGFibGUnOiAnZ3JhYlRhYmxlUmVzaXplcidcbiAgICB9LFxuICAgIFxuICAgIGdyYWJUYWJsZVJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgcmVzaXphYmxlQ29sQ291bnQgPSAwO1xuICAgICAgICB2YXIgY29sX3N0YXRlID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGluZGV4KXtcbiAgICAgICAgICAgIG1lbW9bY29sdW1uLmdldCgnaWQnKV0gPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgaWYgKCFjb2x1bW4uZ2V0KCdsb2NrX3dpZHRoJykpICsrcmVzaXphYmxlQ29sQ291bnQ7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSx7fSx0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZlcnRpY2FsIFxuICAgICAgICB2YXIgbW91c2VZID0gZXZ0LmNsaWVudFk7XG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gJChcIi50clwiLCB0aGlzLiRlbCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBpbml0TWF4ID0gdGhpcy5jb25maWcuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHRhYmxlX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgICAgICAvLyBIb3Jpem9udGFsXG4gICAgICAgICAgICB2YXIgY2hhbmdlWCA9IChldnQuY2xpZW50WCAtIG1vdXNlWCkvcmVzaXphYmxlQ29sQ291bnQ7XG4gICAgICAgICAgICBzZWxmLmNvbHVtbnMuZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjpjb2xfc3RhdGVbY29sdW1uLmdldChcImlkXCIpXSoxK2NoYW5nZVh9LCB7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZlcnRpY2FsXG4gICAgICAgICAgICB2YXIgY2hhbmdlWSA9IChldnQuY2xpZW50WSAtIG1vdXNlWSk7XG4gICAgICAgICAgICB2YXIgYWJDaGFuZ2VZID0gTWF0aC5hYnMoY2hhbmdlWSk7XG4gICAgICAgICAgICBpZiAoIGFiQ2hhbmdlWSA+IHJvd19oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICBhYkNoYW5nZVkgPSBNYXRoLmZsb29yKGFiQ2hhbmdlWS9yb3dfaGVpZ2h0KSAqIChjaGFuZ2VZID4gMCA/IDEgOiAtMSk7XG4gICAgICAgICAgICAgICAgc2VsZi5jb25maWcuc2V0KHsnbWF4X3Jvd3MnOmluaXRNYXggKyBhYkNoYW5nZVl9LCB7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIHRhYmxlX3Jlc2l6ZSk7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIGNsZWFudXBfcmVzaXplKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5jb21wYXJhdG9yID0gZm47XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9LFxuICAgIFxuICAgIHJlc3RvcmVQcmV2aW91c1N0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgd2lkdGhzXG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJyk7XG4gICAgICAgIGlmICh3aWR0aHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5lYWNoKHdpZHRocywgZnVuY3Rpb24odmFsLCBrZXkpe1xuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1ucy5nZXQoa2V5KS5zZXQoJ3dpZHRoJywgdmFsKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgY29sdW1uIHNvcnQgb3JkZXJcbiAgICAgICAgdmFyIGNvbHNvcnRzID0gdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJyk7XG4gICAgICAgIGlmIChjb2xzb3J0cyAhPT0gdW5kZWZpbmVkICYmIGNvbHNvcnRzLmxlbmd0aCA9PT0gdGhpcy5jb2x1bW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmNvbF9zb3J0cyA9IGNvbHNvcnRzO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLnNvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJvdyBzb3J0IG9yZGVyXG4gICAgICAgIC8vIHZhciByb3dzb3J0cyA9IFxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1heF9yb3dzXG4gICAgICAgIHZhciBtYXhfcm93cyA9IHRoaXMuc3RhdGUoJ21heF9yb3dzJyk7XG4gICAgICAgIGlmIChtYXhfcm93cykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KHsnbWF4X3Jvd3MnOm1heF9yb3dzfSx7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzdGF0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZV9rZXkgPSAndGFibGVkLicrdGhpcy5jb25maWcuZ2V0KFwiaWRcIik7XG4gICAgICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmUgfHwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZV9rZXkpIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdG9yZSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IEpTT04ucGFyc2Uoc3RvcmUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgc3RvcmUgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHN0b3JlKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9yZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGFibGVkIiwidmFyIEJhc2VWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgIC8vIEFzc2lnbnMgYSBzdWJ2aWV3IHRvIGEganF1ZXJ5IHNlbGVjdG9yIGluIHRoaXMgdmlldydzIGVsXG4gICAgYXNzaWduIDogZnVuY3Rpb24gKHNlbGVjdG9yLCB2aWV3KSB7XG4gICAgICAgIHZhciBzZWxlY3RvcnM7XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgc2VsZWN0b3JzID0gc2VsZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSB7fTtcbiAgICAgICAgICAgIHNlbGVjdG9yc1tzZWxlY3Rvcl0gPSB2aWV3O1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2VsZWN0b3JzKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChzZWxlY3RvcnMsIGZ1bmN0aW9uICh2aWV3LCBzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2aWV3ID09PSBcInN0cmluZ1wiKSB2aWV3ID0gdGhpcy5fX3N1YnZpZXdzX19bdmlld107XG4gICAgICAgICAgICB2aWV3LnNldEVsZW1lbnQodGhpcy4kKHNlbGVjdG9yKSkucmVuZGVyKCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNsZWFuX3VwXCIpO1xuICAgICAgICB0aGlzLnVuYmluZCgpO1xuICAgICAgICBCYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzKTtcbiAgICB9LFxuICAgIFxuICAgIHN1YnZpZXc6IGZ1bmN0aW9uKGtleSwgdmlldyl7XG4gICAgICAgIC8vIFNldCB1cCBzdWJ2aWV3IG9iamVjdFxuICAgICAgICB2YXIgc3YgPSB0aGlzLl9fc3Vidmlld3NfXyA9IHRoaXMuX19zdWJ2aWV3c19fIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZ2V0dGluZ1xuICAgICAgICBpZiAodmlldyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Zba2V5XTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0ZW5lciBmb3IgcmVtb3ZhbCBldmVudFxuICAgICAgICB2aWV3Lmxpc3RlblRvKHRoaXMsIFwiY2xlYW5fdXBcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBrZXlcbiAgICAgICAgc3Zba2V5XSA9IHZpZXc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbGxvdyBjaGFpbmluZ1xuICAgICAgICByZXR1cm4gdmlld1xuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldyIsInZhciBGaWx0ZXJzID0gcmVxdWlyZShcIi4vRmlsdGVyc1wiKTtcbnZhciBTb3J0cyA9IHJlcXVpcmUoXCIuL1NvcnRzXCIpO1xudmFyIEZvcm1hdHMgPSByZXF1aXJlKFwiLi9Gb3JtYXRzXCIpO1xudmFyIENvbHVtbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGtleTogXCJcIixcbiAgICAgICAgbGFiZWw6IFwiXCIsXG4gICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgZmlsdGVyOiB1bmRlZmluZWQsXG4gICAgICAgIGZvcm1hdDogdW5kZWZpbmVkLFxuICAgICAgICBzZWxlY3Q6IGZhbHNlLFxuICAgICAgICBmaWx0ZXJfdmFsdWU6IFwiXCIsXG4gICAgICAgIHNvcnRfdmFsdWU6IFwiXCIsXG4gICAgICAgIGxvY2tfd2lkdGg6IGZhbHNlXG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbHRlclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhpcy5nZXQoXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInN0cmluZ1wiICYmIEZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmaWx0ZXJcIiwgRmlsdGVyc1tmaWx0ZXJdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNvcnRcbiAgICAgICAgdmFyIHNvcnQgPSB0aGlzLmdldChcInNvcnRcIik7XG4gICAgICAgIGlmICh0eXBlb2Ygc29ydCA9PT0gXCJzdHJpbmdcIiAmJiBTb3J0cy5oYXNPd25Qcm9wZXJ0eShzb3J0KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzb3J0XCIsIFNvcnRzW3NvcnRdKHRoaXMuZ2V0KFwia2V5XCIpKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBmb3JtYXRcbiAgICAgICAgdmFyIHNlbGVjdCA9IHRoaXMuZ2V0KCdzZWxlY3QnKTtcbiAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgaWYgKHNlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0cy5zZWxlY3QgKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic2VsZWN0X2tleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZvcm1hdCA9PT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgRm9ybWF0c1tmb3JtYXRdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aGlzLnNldChcImZvcm1hdFwiLCBGb3JtYXRzW2Zvcm1hdF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTT04oKTtcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLndpZHRoIDwgYXR0cnMubWluX2NvbHVtbl93aWR0aCkgcmV0dXJuIFwiQSBjb2x1bW4gd2lkdGggY2Fubm90IGJlID0+IDBcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy5sb2NrX3dpZHRoID09PSB0cnVlICYmIGF0dHJzLndpZHRoID4gMCkgcmV0dXJuIFwiVGhpcyBjb2x1bW4gaGFzIGEgbG9ja2VkIHdpZHRoXCI7XG4gICAgICAgIFxuICAgIH0sXG4gICAgXG4gICAgZ2V0S2V5OiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHRoaXMuZ2V0KCdrZXknKSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRGb3JtYXR0ZWQ6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgID8gZm4odGhpcy5nZXRLZXkobW9kZWwpLCBtb2RlbClcbiAgICAgICAgICAgIDogdGhpcy5nZXRLZXkobW9kZWwpO1xuICAgIH0sXG4gICAgXG4gICAgc29ydEluZGV4OiBmdW5jdGlvbihuZXdJbmRleCkge1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbGxlY3Rpb24uY29sX3NvcnRzO1xuICAgICAgICBpZiAodHlwZW9mIG5ld0luZGV4ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gc29ydHMuaW5kZXhPZih0aGlzLmdldChcImlkXCIpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJJZHggPSB0aGlzLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgaWQgPSBzb3J0cy5zcGxpY2UoY3VySWR4LCAxKVswXTtcbiAgICAgICAgc29ydHMuc3BsaWNlKG5ld0luZGV4LCAwLCBpZCk7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5zb3J0KCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBDb2x1bW5zID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIFxuICAgIG1vZGVsOiBDb2x1bW4sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICAgIF8uZWFjaChtb2RlbHMsIHRoaXMuc2V0TWluV2lkdGgsIHRoaXMpO1xuICAgICAgICB0aGlzLnJvd19zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbFJvd1NvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMuY29sX3NvcnRzID0gdGhpcy5nZXRJbml0aWFsQ29sU29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5vbihcImNoYW5nZTpzb3J0X3ZhbHVlXCIsIHRoaXMub25Tb3J0Q2hhbmdlKTtcbiAgICB9LFxuICAgIFxuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGNvbDEsIGNvbDIpIHtcbiAgICAgICAgdmFyIGlkeDEgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDEuZ2V0KFwiaWRcIikpO1xuICAgICAgICB2YXIgaWR4MiA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMi5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHJldHVybiBpZHgxIC0gaWR4MjtcbiAgICB9LFxuICAgIFxuICAgIHNldE1pbldpZHRoOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICBpZiAobW9kZWwuaGFzT3duUHJvcGVydHkoJ21pbl9jb2x1bW5fd2lkdGgnKSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgbW9kZWxbJ21pbl9jb2x1bW5fd2lkdGgnXSA9IHRoaXMuY29uZmlnLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIik7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsUm93U29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5jb25maWcuZ2V0KFwicm93X3NvcnRzXCIpKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMuY29uZmlnLmdldChcInJvd19zb3J0c1wiKTtcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAncm93X3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IF8ucmVkdWNlKG1vZGVscyxmdW5jdGlvbihtZW1vLCBjb2x1bW4peyBcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uWydzb3J0X3ZhbHVlJ10pIFxuICAgICAgICAgICAgICAgICAgICBtZW1vLnB1c2goY29sdW1uW1wiaWRcIl0pOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgICAgIH0sW10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxDb2xTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJjb2xfc29ydHNcIikpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5jb25maWcuZ2V0KFwiY29sX3NvcnRzXCIpO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdjb2xfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gZGVmYXVsdFNvcnRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIG9uU29ydENoYW5nZTogZnVuY3Rpb24obW9kZWwsIHZhbHVlKSB7XG4gICAgICAgIHZhciBpZCA9IG1vZGVsLmdldChcImlkXCIpO1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnJvd19zb3J0cy5pbmRleE9mKGlkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDb21wYXJhdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMucm93X3NvcnRzLmxlbmd0aCAhPT0gMCl7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZ1bmN0aW9uKHJvdzEsIHJvdzIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzZWxmLnJvd19zb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBzZWxmLnJvd19zb3J0c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYuZ2V0KGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gY29sdW1uLmdldChcInNvcnRcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbHVtbi5nZXQoXCJzb3J0X3ZhbHVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydF9yZXN1bHQgPSB2YWx1ZSA9PSBcImFcIiA/IGZuKHJvdzEsIHJvdzIpIDogZm4ocm93Miwgcm93MSkgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydF9yZXN1bHQgIT0gMCkgcmV0dXJuIHNvcnRfcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgY29tcGFyYXRvcik7XG4gICAgICAgIFxuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzLm1vZGVsID0gQ29sdW1uO1xuZXhwb3J0cy5jb2xsZWN0aW9uID0gQ29sdW1uczsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG5cbnZhciBUcm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0cicsXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIik7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIGlkID0gY29sdW1uLmdldCgnaWQnKTtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gY29sdW1uLmdldEZvcm1hdHRlZCh0aGlzLm1vZGVsKTtcbiAgICAgICAgICAgIHZhciAkdmlldyA9ICQoJzxkaXYgY2xhc3M9XCJ0ZCBjb2wtJytpZCsnXCIgc3R5bGU9XCJ3aWR0aDonK3dpZHRoKydweFwiPjxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PC9kaXY+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkdmlldy5maW5kKCcuY2VsbC1pbm5lcicpLmFwcGVuZChmb3JtYXR0ZWQpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCR2aWV3KTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59KTtcblxuXG5cbnZhciBUYm9keSA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBvcHRpb25zLmNvbHVtbnM7XG4gICAgICAgIHRoaXMuY29uZmlnID0gdGhpcy5jb2x1bW5zLmNvbmZpZztcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwicmVzZXRcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJzb3J0XCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwidXBkYXRlXCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJ1cGRhdGVcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5hZGp1c3RDb2x1bW5XaWR0aCApO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTpvZmZzZXRcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0Q29sdW1uV2lkdGg6IGZ1bmN0aW9uKG1vZGVsLCBuZXdXaWR0aCwgb3B0aW9ucyl7XG4gICAgICAgIHRoaXMuJCgnLnRkLmNvbC0nK21vZGVsLmdldChcImlkXCIpKS53aWR0aChuZXdXaWR0aCk7XG4gICAgfSxcbiAgICBcbiAgICAvLyBSZW5kZXJzIHRoZSB2aXNpYmxlIHJvd3MgZ2l2ZW4gdGhlIGN1cnJlbnQgb2Zmc2V0IGFuZCBtYXhfcm93c1xuICAgIC8vIHByb3BlcnRpZXMgb24gdGhlIGNvbmZpZyBvYmplY3QuXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIik7XG4gICAgICAgIHZhciByb3dzX3RvX3JlbmRlciA9IHRoaXMuY29uZmlnLmdldFZpc2libGVSb3dzKCk7XG4gICAgICAgIGlmIChyb3dzX3RvX3JlbmRlciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHJvd3NfdG9fcmVuZGVyLmZvckVhY2goZnVuY3Rpb24ocm93KXtcbiAgICAgICAgICAgIHZhciByb3dWaWV3ID0gbmV3IFRyb3coe1xuICAgICAgICAgICAgICAgIG1vZGVsOiByb3csXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggcm93Vmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICAgICAgcm93Vmlldy5saXN0ZW5Ubyh0aGlzLCBcImNsZWFuX3VwXCIsIHJvd1ZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWQnKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJ3aGVlbFwiOiBcIm9uTW91c2VXaGVlbFwiLFxuICAgICAgICBcIm1vdXNld2hlZWxcIjogXCJvbk1vdXNlV2hlZWxcIlxuICAgIH0sXG4gICAgXG4gICAgb25Nb3VzZVdoZWVsOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgLy8gQmlnSW50ZWdlclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBub3JtYWxpemUgd2Via2l0L2ZpcmVmb3ggc2Nyb2xsIHZhbHVlc1xuICAgICAgICB2YXIgZGVsdGFZID0gLWV2dC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGFZIHx8IGV2dC5vcmlnaW5hbEV2ZW50LmRlbHRhWSAqIDEwMDtcbiAgICAgICAgdmFyIG1vdmVtZW50ID0gTWF0aC5yb3VuZChkZWx0YVkgLyAxMDApO1xuICAgICAgICBpZiAoaXNOYU4obW92ZW1lbnQpKSByZXR1cm47XG4gICAgICAgIHZhciBvcmlnT2Zmc2V0ID0gdGhpcy5jb25maWcuZ2V0KFwib2Zmc2V0XCIpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmNvbmZpZy5nZXQoXCJtYXhfcm93c1wiKTtcbiAgICAgICAgdmFyIG9mZnNldCA9IE1hdGgubWluKCB0aGlzLmNvbGxlY3Rpb24ubGVuZ3RoIC0gbGltaXQsIE1hdGgubWF4KCAwLCBvcmlnT2Zmc2V0ICsgbW92ZW1lbnQpKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29uZmlnLnNldCh7XCJvZmZzZXRcIjogb2Zmc2V0fSwge3ZhbGlkYXRlOiB0cnVlfSApO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJldmVudCBkZWZhdWx0IG9ubHkgd2hlbiBuZWNlc3NhcnlcbiAgICAgICAgaWYgKG9mZnNldCA+IDAgJiYgb2Zmc2V0IDwgdGhpcy5jb2xsZWN0aW9uLmxlbmd0aCAtIGxpbWl0KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG59KTtcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFRib2R5OyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vQmFzZVZpZXcnKTtcblxudmFyIFRoQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgY2xhc3NOYW1lOiAndGgnLFxuICAgIFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKCc8ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiIHRpdGxlPVwiPCU9IGxhYmVsICU+XCI+PHNwYW4gY2xhc3M9XCJ0aC1oZWFkZXJcIj48JT0gbGFiZWwgJT48L3NwYW4+PC9kaXY+PCUgaWYobG9ja193aWR0aCAhPT0gdHJ1ZSkgeyU+PHNwYW4gY2xhc3M9XCJyZXNpemVcIj48L3NwYW4+PCV9JT4nKSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpzb3J0X3ZhbHVlXCIsIHRoaXMucmVuZGVyICk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24obW9kZWwsIHdpZHRoKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGpzb24gPSB0aGlzLm1vZGVsLnNlcmlhbGl6ZSgpO1xuICAgICAgICB2YXIgc29ydF9jbGFzcyA9IGpzb24uc29ydF92YWx1ZSA/IChqc29uLnNvcnRfdmFsdWUgPT0gXCJkXCIgPyBcImRlc2NcIiA6IFwiYXNjXCIgKSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbFxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhc2MgZGVzYycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2NvbC0nK2pzb24uaWQrXCIgXCIrc29ydF9jbGFzcylcbiAgICAgICAgICAgIC53aWR0aChqc29uLndpZHRoKVxuICAgICAgICAgICAgLmh0bWwodGhpcy50ZW1wbGF0ZShqc29uKSk7XG4gICAgICAgIGlmIChzb3J0X2NsYXNzICE9PSBcIlwiKSB7XG4gICAgICAgICAgICB0aGlzLiQoXCIudGgtaGVhZGVyXCIpLnByZXBlbmQoJzxpIGNsYXNzPVwiJytzb3J0X2NsYXNzKyctaWNvblwiPjwvaT4gJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJtb3VzZWRvd24gLnJlc2l6ZVwiOiBcImdyYWJSZXNpemVyXCIsXG4gICAgICAgIFwiZGJsY2xpY2sgLnJlc2l6ZVwiOiBcImZpdFRvQ29udGVudFwiLFxuICAgICAgICBcIm1vdXNldXAgLnRoLWhlYWRlclwiOiBcImNoYW5nZUNvbHVtblNvcnRcIixcbiAgICAgICAgXCJtb3VzZWRvd25cIjogXCJncmFiQ29sdW1uXCJcbiAgICB9LFxuICAgIFxuICAgIGdyYWJSZXNpemVyOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBjb2x1bW5XaWR0aCA9IHRoaXMubW9kZWwuZ2V0KFwid2lkdGhcIik7XG4gICAgICAgIC8vIEhhbmRsZXIgZm9yIHdoZW4gbW91c2UgaXMgbW92aW5nXG4gICAgICAgIHZhciBjb2xfcmVzaXplID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICB2YXIgY29sdW1uID0gc2VsZi5tb2RlbDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBldnQuY2xpZW50WCAtIG1vdXNlWDtcbiAgICAgICAgICAgIHZhciBuZXdXaWR0aCA9IGNvbHVtbldpZHRoICsgY2hhbmdlO1xuICAgICAgICAgICAgaWYgKCBuZXdXaWR0aCA8IGNvbHVtbi5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpKSByZXR1cm47XG4gICAgICAgICAgICBjb2x1bW4uc2V0KHtcIndpZHRoXCI6IG5ld1dpZHRofSwge3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNsZWFudXBfcmVzaXplID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIGNvbF9yZXNpemUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIGNsZWFudXBfcmVzaXplKTtcbiAgICB9LFxuICAgIFxuICAgIGZpdFRvQ29udGVudDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBuZXdfd2lkdGggPSAwO1xuICAgICAgICB2YXIgbWluX3dpZHRoID0gdGhpcy5tb2RlbC5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKTtcbiAgICAgICAgdmFyIGlkID0gdGhpcy5tb2RlbC5nZXQoJ2lkJyk7XG4gICAgICAgIHZhciAkY3R4ID0gdGhpcy4kZWwucGFyZW50cygnLnRhYmxlZCcpLmZpbmQoJy50Ym9keScpO1xuICAgICAgICAkKFwiLnRkLmNvbC1cIitpZCtcIiAuY2VsbC1pbm5lclwiLCAkY3R4KS5lYWNoKGZ1bmN0aW9uKGksIGVsKXtcbiAgICAgICAgICAgIG5ld193aWR0aCA9IE1hdGgubWF4KG5ld193aWR0aCwkKHRoaXMpLm91dGVyV2lkdGgodHJ1ZSksIG1pbl93aWR0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J3dpZHRoJzpuZXdfd2lkdGh9LHt2YWxpZGF0ZTogdHJ1ZX0pO1xuICAgIH0sXG4gICAgXG4gICAgY2hhbmdlQ29sdW1uU29ydDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgbW9kZWwgPSB0aGlzLm1vZGVsO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBtb2RlbC5nZXQoXCJzb3J0XCIpICE9PSBcImZ1bmN0aW9uXCIgfHwgbW9kZWwuZ2V0KFwibW92aW5nXCIpID09PSB0cnVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICB2YXIgY3VyX3NvcnQgPSBtb2RlbC5nZXQoXCJzb3J0X3ZhbHVlXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFldnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgYWxsIHNvcnRzXG4gICAgICAgICAgICBtb2RlbC5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sKXtcbiAgICAgICAgICAgICAgICBpZiAoY29sICE9PSBtb2RlbCkgY29sLnNldCh7XCJzb3J0X3ZhbHVlXCI6IFwiXCJ9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaChjdXJfc29ydCkge1xuICAgICAgICAgICAgY2FzZSBcIlwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJhXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImFcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiZFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJkXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcIlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgZ3JhYkNvbHVtbjogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgb2Zmc2V0WCA9IGV2dC5vZmZzZXRYO1xuICAgICAgICB2YXIgdGhyZXNob2xkcyA9IFtdO1xuICAgICAgICB2YXIgY3VycmVudElkeCA9IHRoaXMubW9kZWwuc29ydEluZGV4KCk7XG4gICAgICAgIHZhciAkdHIgPSB0aGlzLiRlbC5wYXJlbnQoKTtcbiAgICAgICAgJHRyLmZpbmQoJy50aCcpLmVhY2goZnVuY3Rpb24oaSxlbCl7XG4gICAgICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9ICR0aGlzLm9mZnNldCgpLmxlZnQ7XG4gICAgICAgICAgICB2YXIgaGFsZiA9ICR0aGlzLndpZHRoKCkgLyAyO1xuICAgICAgICAgICAgaWYgKGkgIT0gY3VycmVudElkeCkgdGhyZXNob2xkcy5wdXNoKG9mZnNldCtoYWxmKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBwcmV2ZW50X21vdXNldXAgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIHZhciBnZXROZXdJbmRleCA9IGZ1bmN0aW9uKHBvcykge1xuICAgICAgICAgICAgdmFyIG5ld0lkeCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCB0aHJlc2hvbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IHRocmVzaG9sZHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKHBvcyA+IHZhbCkgbmV3SWR4Kys7XG4gICAgICAgICAgICAgICAgZWxzZSByZXR1cm4gbmV3SWR4O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBuZXdJZHg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBkcmF3SGVscGVyID0gZnVuY3Rpb24obmV3SWR4KSB7XG4gICAgICAgICAgICAkdHIuZmluZCgnLmNvbHNvcnQtaGVscGVyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBpZiAobmV3SWR4ID09IGN1cnJlbnRJZHgpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBuZXdJZHggPCBjdXJyZW50SWR4ID8gJ2JlZm9yZScgOiAnYWZ0ZXInO1xuICAgICAgICAgICAgJHRyLmZpbmQoJy50aDplcSgnK25ld0lkeCsnKScpW21ldGhvZF0oJzxkaXYgY2xhc3M9XCJjb2xzb3J0LWhlbHBlclwiPjwvZGl2PicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgbW92ZV9jb2x1bW4gPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi4kZWwuY3NzKHsnbGVmdCc6Y2hhbmdlLCAnb3BhY2l0eSc6MC41LCAnekluZGV4JzogMTB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG5ld0lkeCA9IGdldE5ld0luZGV4KGN1ck1vdXNlLCB0aHJlc2hvbGRzKTtcbiAgICAgICAgICAgIGRyYXdIZWxwZXIobmV3SWR4KTtcbiAgICAgICAgICAgIHNlbGYubW9kZWwuc2V0KCdtb3ZpbmcnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGNsZWFudXBfbW92ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgc2VsZi4kZWwuY3NzKHsnbGVmdCc6IDAsICdvcGFjaXR5JzoxfSk7XG4gICAgICAgICAgICAkdHIuZmluZCgnLmNvbHNvcnQtaGVscGVyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICB2YXIgY3VyTW91c2UgPSBldnQuY2xpZW50WDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBjdXJNb3VzZSAtIG1vdXNlWDtcbiAgICAgICAgICAgIHNlbGYubW9kZWwuc29ydEluZGV4KGdldE5ld0luZGV4KGN1ck1vdXNlLCB0aHJlc2hvbGRzKSk7XG4gICAgICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgICAgIHNlbGYubW9kZWwuc2V0KCdtb3ZpbmcnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBtb3ZlX2NvbHVtbik7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIGNsZWFudXBfbW92ZSlcbiAgICB9XG59KTtcblxudmFyIFRoUm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjbGVhciBpdFxuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGVhY2ggdGggY2VsbFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgVGhDZWxsKHsgbW9kZWw6IGNvbHVtbiB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggdmlldy5yZW5kZXIoKS5lbCApXG4gICAgICAgICAgICB2aWV3Lmxpc3RlblRvKHRoaXMsIFwiY2xlYW5fdXBcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBGaWx0ZXJDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihjb2x1bW4sIHdpZHRoKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48aW5wdXQgY2xhc3M9XCJmaWx0ZXJcIiB0eXBlPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJmaWx0ZXJcIiAvPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZuID0gdGhpcy5tb2RlbC5nZXQoJ2ZpbHRlcicpO1xuICAgICAgICB2YXIgbWFya3VwID0gdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIgPyB0aGlzLnRlbXBsYXRlIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCd0ZCBjb2wtJyt0aGlzLm1vZGVsLmdldCgnaWQnKSkud2lkdGgodGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykpO1xuICAgICAgICB0aGlzLiRlbC5odG1sKG1hcmt1cCk7XG4gICAgICAgIHRoaXMuJChcImlucHV0XCIpLnZhbCh0aGlzLm1vZGVsLmdldCgnZmlsdGVyX3ZhbHVlJykpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcImNsaWNrIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJcIixcbiAgICAgICAgXCJrZXl1cCAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyRGVsYXllZFwiXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgnZmlsdGVyX3ZhbHVlJywgJC50cmltKHRoaXMuJCgnLmZpbHRlcicpLnZhbCgpKSApO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyRGVsYXllZDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpXG4gICAgICAgIHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXIuYmluZCh0aGlzLCBldnQpLCAyMDApO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyUm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjbGVhciBpdFxuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJjbGVhbl91cFwiKVxuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGVhY2ggdGggY2VsbFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRmlsdGVyQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJjbGVhbl91cFwiLCB2aWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG59KTtcblxudmFyIFRoZWFkID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIC8vIFNldCBjb25maWdcbiAgICAgICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIHN1YnZpZXdzXG4gICAgICAgIHRoaXMuc3VidmlldyhcInRoX3Jvd1wiLCBuZXcgVGhSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMubmVlZHNGaWx0ZXJSb3coKSkge1xuICAgICAgICAgICAgdGhpcy5zdWJ2aWV3KFwiZmlsdGVyX3Jvd1wiLCBuZXcgRmlsdGVyUm93KHsgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uIH0pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciB3aGVuIG9mZnNldCBpcyBub3QgemVyb1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTpvZmZzZXRcIiwgZnVuY3Rpb24obW9kZWwsIG9mZnNldCl7XG4gICAgICAgICAgICB2YXIgdG9nZ2xlQ2xhc3MgPSBvZmZzZXQgPT09IDAgPyAncmVtb3ZlQ2xhc3MnIDogJ2FkZENsYXNzJyA7XG4gICAgICAgICAgICB0aGlzLiRlbFt0b2dnbGVDbGFzc10oJ292ZXJoYW5nJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwidHIgdGgtcm93XCI+PC9kaXY+PGRpdiBjbGFzcz1cInRyIGZpbHRlci1yb3dcIj48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuYXNzaWduKHsgJy50aC1yb3cnIDogJ3RoX3JvdycgfSk7XG4gICAgICAgIGlmICh0aGlzLnN1YnZpZXcoJ2ZpbHRlcl9yb3cnKSkge1xuICAgICAgICAgICAgdGhpcy5hc3NpZ24oeyAnLmZpbHRlci1yb3cnIDogJ2ZpbHRlcl9yb3cnIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgdGhpcy4kKCcuZmlsdGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIG5lZWRzRmlsdGVyUm93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5zb21lKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUaGVhZDsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG52YXIgU2Nyb2xsZXIgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpvZmZzZXRcIiwgdGhpcy51cGRhdGVQb3NpdGlvbik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8ob3B0aW9ucy50Ym9keSwgXCJyZW5kZXJlZFwiLCB0aGlzLnJlbmRlcik7XG4gICAgfSwgICAgXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiaW5uZXJcIj48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLm1vZGVsLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIHZhciBsaW1pdCA9IHRoaXMubW9kZWwuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICB2YXIgdG90YWwgPSB0aGlzLm1vZGVsLmdldCgndG90YWxfcm93cycpO1xuICAgICAgICB2YXIgYWN0dWFsX2ggPSB0aGlzLiRlbC5wYXJlbnQoKS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIGFjdHVhbF9yID0gYWN0dWFsX2ggLyB0b3RhbDtcbiAgICAgICAgdmFyIHNjcm9sbF9oZWlnaHQgPSBsaW1pdCAqIGFjdHVhbF9yO1xuICAgICAgICBpZiAoc2Nyb2xsX2hlaWdodCA8IDEwKSB7XG4gICAgICAgICAgICB2YXIgY29ycmVjdGlvbiA9IDEwIC0gc2Nyb2xsX2hlaWdodDtcbiAgICAgICAgICAgIGFjdHVhbF9oIC09IGNvcnJlY3Rpb247XG4gICAgICAgICAgICBhY3R1YWxfciA9IGFjdHVhbF9oIC8gdG90YWw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjcm9sbF90b3AgPSBvZmZzZXQgKiBhY3R1YWxfcjtcbiAgICAgICAgXG4gICAgICAgIGlmIChzY3JvbGxfaGVpZ2h0IDwgYWN0dWFsX2ggJiYgdG90YWwgPiBsaW1pdCkge1xuICAgICAgICAgICAgdGhpcy4kKFwiLmlubmVyXCIpLmNzcyh7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBzY3JvbGxfaGVpZ2h0LFxuICAgICAgICAgICAgICAgIHRvcDogc2Nyb2xsX3RvcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiQoXCIuaW5uZXJcIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJtb3VzZWRvd24gLmlubmVyXCI6IFwiZ3JhYlNjcm9sbGVyXCJcbiAgICB9LFxuICAgIFxuICAgIGdyYWJTY3JvbGxlcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWSA9IGV2dC5jbGllbnRZO1xuICAgICAgICB2YXIgb2Zmc2V0WSA9IGV2dC5vZmZzZXRZO1xuICAgICAgICB2YXIgcmF0aW8gPSB0aGlzLm1vZGVsLmdldCgndG90YWxfcm93cycpIC8gdGhpcy4kZWwucGFyZW50KCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBpbml0T2Zmc2V0ID0gc2VsZi5tb2RlbC5nZXQoJ29mZnNldCcpO1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gbW92ZVNjcm9sbGVyKGV2dCl7XG4gICAgICAgICAgICB2YXIgY3VyTW91c2UgPSBldnQuY2xpZW50WTtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBjdXJNb3VzZSAtIG1vdXNlWTtcbiAgICAgICAgICAgIHZhciBuZXdPZmZzZXQgPSBNYXRoLm1heChNYXRoLnJvdW5kKHJhdGlvICogY2hhbmdlKSArIGluaXRPZmZzZXQsIDApO1xuICAgICAgICAgICAgbmV3T2Zmc2V0ID0gTWF0aC5taW4obmV3T2Zmc2V0LCBzZWxmLm1vZGVsLmdldCgndG90YWxfcm93cycpIC0gc2VsZi5tb2RlbC5nZXQoJ21heF9yb3dzJykpXG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCh7J29mZnNldCc6bmV3T2Zmc2V0fSwge3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIHJlbGVhc2VTY3JvbGxlcihldnQpe1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBtb3ZlU2Nyb2xsZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgbW92ZVNjcm9sbGVyKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgcmVsZWFzZVNjcm9sbGVyKTtcbiAgICB9XG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gU2Nyb2xsZXIiLCJleHBvcnRzLmxpa2UgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YodGVybSkgPiAtMTtcbn1cbmV4cG9ydHMuaXMgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHRlcm0gPT0gdmFsdWU7XG59XG5leHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlKSB7XG4gICAgdmFsdWUgKj0gMTtcbiAgICB2YXIgZmlyc3RfdHdvID0gdGVybS5zdWJzdHIoMCwyKTtcbiAgICB2YXIgZmlyc3RfY2hhciA9IHRlcm1bMF07XG4gICAgdmFyIGFnYWluc3RfMSA9IHRlcm0uc3Vic3RyKDEpKjE7XG4gICAgdmFyIGFnYWluc3RfMiA9IHRlcm0uc3Vic3RyKDIpKjE7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI8PVwiICkgcmV0dXJuIHZhbHVlIDw9IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI+PVwiICkgcmV0dXJuIHZhbHVlID49IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPFwiICkgcmV0dXJuIHZhbHVlIDwgYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI+XCIgKSByZXR1cm4gdmFsdWUgPiBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIn5cIiApIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKSA9PSBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj1cIiApIHJldHVybiBhZ2FpbnN0XzEgPT0gdmFsdWUgO1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpLmluZGV4T2YodGVybS50b1N0cmluZygpKSA+IC0xIDtcbn0iLCJleHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpKjEgLSByb3cyLmdldChmaWVsZCkqMTtcbiAgICB9XG59XG5leHBvcnRzLnN0cmluZyA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICBpZiAoIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT0gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSApIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA+IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPyAxIDogLTEgO1xuICAgIH1cbn0iLCJ2YXIgQm9ybWF0cyA9IHJlcXVpcmUoJ2Jvcm1hdCcpO1xuZXhwb3J0cy5zZWxlY3QgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZWwpIHtcbiAgICB2YXIgc2VsZWN0X2tleSA9ICdzZWxlY3RlZCc7XG4gICAgdmFyIGNoZWNrZWQgPSBtb2RlbFtzZWxlY3Rfa2V5XSA9PT0gdHJ1ZTtcbiAgICB2YXIgJHJldCA9ICQoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwic2VsZWN0Ym94XCI+PC9kaXY+Jyk7XG4gICAgXG4gICAgLy8gU2V0IGNoZWNrZWRcbiAgICB2YXIgJGNiID0gJHJldC5maW5kKCdpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCBjaGVja2VkKTtcbiAgICBcbiAgICAvLyBTZXQgY2xpY2sgYmVoYXZpb3JcbiAgICAkY2JcbiAgICAub24oJ2NsaWNrIG1vdXNlZG93bicsIGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0pXG4gICAgLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICEhIG1vZGVsW3NlbGVjdF9rZXldO1xuICAgICAgICB2YXIgaXNfc2VsZWN0ZWRfbm93ID0gbW9kZWxbc2VsZWN0X2tleV0gPSAhc2VsZWN0ZWQ7XG4gICAgICAgICRjYi5wcm9wKCdjaGVja2VkJywgaXNfc2VsZWN0ZWRfbm93KTtcbiAgICAgICAgbW9kZWwudHJpZ2dlcignY2hhbmdlX3NlbGVjdGVkJywgbW9kZWwsIHNlbGVjdGVkKTtcbiAgICB9KVxuICAgIFxuICAgIHJldHVybiAkcmV0O1xufVxuXG52YXIgdGltZVNpbmNlID0gQm9ybWF0cy50aW1lU2luY2U7XG5cbmV4cG9ydHMudGltZVNpbmNlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoL15cXGQrJC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIG5ld1ZhbCA9IHRpbWVTaW5jZSh2YWx1ZSkgfHwgXCJhIG1vbWVudFwiO1xuICAgICAgICByZXR1cm4gbmV3VmFsICsgXCIgYWdvXCI7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0cy5jb21tYUludCA9IEJvcm1hdHMuY29tbWFHcm91cHM7IiwiZnVuY3Rpb24gdGltZVNpbmNlKHRpbWVzdGFtcCwgY29tcGFyZURhdGUsIHRpbWVDaHVuaykge1xuICAgIHZhciBub3cgPSBjb21wYXJlRGF0ZSA9PT0gdW5kZWZpbmVkID8gK25ldyBEYXRlKCkgOiBjb21wYXJlRGF0ZTtcbiAgICB2YXIgcmVtYWluaW5nID0gKHRpbWVDaHVuayAhPT0gdW5kZWZpbmVkKSA/IHRpbWVDaHVuayA6IG5vdyAtIHRpbWVzdGFtcDtcbiAgICB2YXIgc3RyaW5nID0gXCJcIjtcbiAgICB2YXIgc2VwYXJhdG9yID0gXCIsIFwiO1xuICAgIHZhciBsZXZlbCA9IDA7XG4gICAgdmFyIG1heF9sZXZlbHMgPSAzO1xuICAgIHZhciBtaWxsaV9wZXJfc2Vjb25kID0gMTAwMDtcbiAgICB2YXIgbWlsbGlfcGVyX21pbnV0ZSA9IG1pbGxpX3Blcl9zZWNvbmQgKiA2MDtcbiAgICB2YXIgbWlsbGlfcGVyX2hvdXIgPSBtaWxsaV9wZXJfbWludXRlICogNjA7XG4gICAgdmFyIG1pbGxpX3Blcl9kYXkgPSBtaWxsaV9wZXJfaG91ciAqIDI0O1xuICAgIHZhciBtaWxsaV9wZXJfd2VlayA9IG1pbGxpX3Blcl9kYXkgKiA3O1xuICAgIHZhciBtaWxsaV9wZXJfbW9udGggPSBtaWxsaV9wZXJfd2VlayAqIDQ7XG4gICAgdmFyIG1pbGxpX3Blcl95ZWFyID0gbWlsbGlfcGVyX2RheSAqIDM2NTtcbiAgICBcbiAgICB2YXIgbGV2ZWxzID0gW1xuICAgIFxuICAgICAgICB7IHBsdXJhbDogXCJ5ZWFyc1wiLCBzaW5ndWxhcjogXCJ5ZWFyXCIsIG1zOiBtaWxsaV9wZXJfeWVhciB9LFxuICAgICAgICB7IHBsdXJhbDogXCJtb250aHNcIiwgc2luZ3VsYXI6IFwibW9udGhcIiwgbXM6IG1pbGxpX3Blcl9tb250aCB9LFxuICAgICAgICB7IHBsdXJhbDogXCJ3ZWVrc1wiLCBzaW5ndWxhcjogXCJ3ZWVrXCIsIG1zOiBtaWxsaV9wZXJfd2VlayB9LFxuICAgICAgICB7IHBsdXJhbDogXCJkYXlzXCIsIHNpbmd1bGFyOiBcImRheVwiLCBtczogbWlsbGlfcGVyX2RheSB9LFxuICAgICAgICB7IHBsdXJhbDogXCJob3Vyc1wiLCBzaW5ndWxhcjogXCJob3VyXCIsIG1zOiBtaWxsaV9wZXJfaG91ciB9LFxuICAgICAgICB7IHBsdXJhbDogXCJtaW51dGVzXCIsIHNpbmd1bGFyOiBcIm1pbnV0ZVwiLCBtczogbWlsbGlfcGVyX21pbnV0ZSB9LFxuICAgICAgICB7IHBsdXJhbDogXCJzZWNvbmRzXCIsIHNpbmd1bGFyOiBcInNlY29uZFwiLCBtczogbWlsbGlfcGVyX3NlY29uZCB9XG4gICAgXTtcbiAgICBcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCByZW1haW5pbmcgPCBsZXZlbHNbaV0ubXMgKSBjb250aW51ZTtcbiAgICAgICAgbGV2ZWwrKztcbiAgICAgICAgdmFyIG51bSA9IE1hdGguZmxvb3IoIHJlbWFpbmluZyAvIGxldmVsc1tpXS5tcyApO1xuICAgICAgICB2YXIgbGFiZWwgPSBudW0gPT0gMSA/IGxldmVsc1tpXS5zaW5ndWxhciA6IGxldmVsc1tpXS5wbHVyYWwgO1xuICAgICAgICBzdHJpbmcgKz0gbnVtICsgXCIgXCIgKyBsYWJlbCArIHNlcGFyYXRvcjtcbiAgICAgICAgcmVtYWluaW5nICU9IGxldmVsc1tpXS5tcztcbiAgICAgICAgaWYgKCBsZXZlbCA+PSBtYXhfbGV2ZWxzICkgYnJlYWs7XG4gICAgfTtcbiAgICBcbiAgICBzdHJpbmcgPSBzdHJpbmcuc3Vic3RyaW5nKDAsIHN0cmluZy5sZW5ndGggLSBzZXBhcmF0b3IubGVuZ3RoKTtcbiAgICByZXR1cm4gc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBjb21tYUdyb3Vwcyh2YWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IHgudG9TdHJpbmcoKS5zcGxpdChcIi5cIik7XG4gICAgcGFydHNbMF0gPSBwYXJ0c1swXS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCBcIixcIik7XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oXCIuXCIpO1xufVxuXG5leHBvcnRzLnRpbWVTaW5jZSA9IHRpbWVTaW5jZTtcbmV4cG9ydHMuY29tbWFHcm91cHMgPSBjb21tYUdyb3VwczsiXX0=
;