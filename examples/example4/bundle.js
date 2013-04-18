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
        'mousedown .resize-table': 'grabTableResizer',
        'dblclick .resize-table':  'resizeTableToCtnr'
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
    
    resizeTableToCtnr: function() {
        var newWidth = this.$el.parent().width();
        var curWidth = this.$('.tabled').width();
        var delta = newWidth - curWidth;
        var resizableColCount = this.columns.reduce(function(memo, column) {
            return column.get('lock_width') ? memo : ++memo ;
        }, 0);
        var change = delta / resizableColCount;
        console.log("change",change);
        this.columns.each(function(col){
            var curWidth = col.get("width");
            col.set({"width": change*1 + curWidth*1}, {validate: true});
            console.log("change*1 + curWidth*1", change*1 + curWidth*1);
        });
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
},{"./BaseView":3}],6:[function(require,module,exports){
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1RoZWFkLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UYm9keS5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU2Nyb2xsZXIuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1NvcnRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Gb3JtYXRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL25vZGVfbW9kdWxlcy9ib3JtYXQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgVGFibGVkID0gcmVxdWlyZSgnLi4vLi4vJyk7XG5cbmZ1bmN0aW9uIGluY2hlczJmZWV0KGluY2hlcywgbW9kZWwpe1xuICAgIHZhciBmZWV0ID0gTWF0aC5mbG9vcihpbmNoZXMvMTIpO1xuICAgIHZhciBpbmNoZXMgPSBpbmNoZXMgJSAxMjtcbiAgICByZXR1cm4gZmVldCArIFwiJ1wiICsgaW5jaGVzICsgJ1wiJztcbn1cblxuZnVuY3Rpb24gZmVldF9maWx0ZXIodGVybSwgdmFsdWUsIGZvcm1hdHRlZCwgbW9kZWwpIHtcbiAgICBpZiAodGVybSA9PSBcInRhbGxcIikgcmV0dXJuIHZhbHVlID4gNzA7XG4gICAgaWYgKHRlcm0gPT0gXCJzaG9ydFwiKSByZXR1cm4gdmFsdWUgPCA2OTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNvbHVtbnMgPSBbXG4gICAgeyBpZDogXCJzZWxlY3RvclwiLCBrZXk6IFwic2VsZWN0ZWRcIiwgbGFiZWw6IFwiXCIsIHNlbGVjdDogdHJ1ZSwgd2lkdGg6IDMwLCBsb2NrX3dpZHRoOiB0cnVlIH0sXG4gICAgeyBpZDogXCJJRFwiLCBrZXk6IFwiaWRcIiwgbGFiZWw6IFwiSURcIiwgc29ydDogXCJudW1iZXJcIiwgZmlsdGVyOiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJmaXJzdF9uYW1lXCIsIGtleTogXCJmaXJzdF9uYW1lXCIsIGxhYmVsOiBcIkZpcnN0IE5hbWVcIiwgc29ydDogXCJzdHJpbmdcIiwgZmlsdGVyOiBcImxpa2VcIiwgIH0sXG4gICAgeyBpZDogXCJsYXN0X25hbWVcIiwga2V5OiBcImxhc3RfbmFtZVwiLCBsYWJlbDogXCJMYXN0IE5hbWVcIiwgc29ydDogXCJzdHJpbmdcIiwgZmlsdGVyOiBcImxpa2VcIiwgIH0sXG4gICAgeyBpZDogXCJhZ2VcIiwga2V5OiBcImFnZVwiLCBsYWJlbDogXCJBZ2VcIiwgc29ydDogXCJudW1iZXJcIiwgZmlsdGVyOiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJoZWlnaHRcIiwga2V5OiBcImhlaWdodFwiLCBsYWJlbDogXCJIZWlnaHRcIiwgZm9ybWF0OiBpbmNoZXMyZmVldCwgZmlsdGVyOiBmZWV0X2ZpbHRlciwgc29ydDogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwid2VpZ2h0XCIsIGtleTogXCJ3ZWlnaHRcIiwgbGFiZWw6IFwiV2VpZ2h0XCIsIGZpbHRlcjogXCJudW1iZXJcIiwgc29ydDogXCJudW1iZXJcIiB9XG5dO1xudmFyIGNvbGxlY3Rpb24gPSBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbihbXSk7XG52YXIgdGFibGVkID0gbmV3IFRhYmxlZCh7XG4gICAgY29sbGVjdGlvbjogY29sbGVjdGlvbixcbiAgICBjb2x1bW5zOiBjb2x1bW5zLFxuICAgIHRhYmxlX3dpZHRoOiA4MDAgICAgXG59KTtcbnZhciAkcGcgPSAkKFwiI3BsYXlncm91bmRcIik7XG50YWJsZWQucmVuZGVyKCkuJGVsLmFwcGVuZFRvKCRwZyk7XG5cbmZ1bmN0aW9uIGdlblJvdyhpZCl7XG4gICAgXG4gICAgdmFyIGZuYW1lcyA9IFtcbiAgICAgICAgXCJqb2VcIixcbiAgICAgICAgXCJmcmVkXCIsXG4gICAgICAgIFwiZnJhbmtcIixcbiAgICAgICAgXCJqaW1cIixcbiAgICAgICAgXCJtaWtlXCIsXG4gICAgICAgIFwiZ2FyeVwiLFxuICAgICAgICBcImF6aXpcIlxuICAgIF07XG5cbiAgICB2YXIgbG5hbWVzID0gW1xuICAgICAgICBcInN0ZXJsaW5nXCIsXG4gICAgICAgIFwic21pdGhcIixcbiAgICAgICAgXCJlcmlja3NvblwiLFxuICAgICAgICBcImJ1cmtlXCJcbiAgICBdO1xuICAgIFxuICAgIHZhciBzZWVkID0gTWF0aC5yYW5kb20oKTtcbiAgICB2YXIgc2VlZDIgPSBNYXRoLnJhbmRvbSgpO1xuICAgIFxuICAgIHZhciBmaXJzdF9uYW1lID0gZm5hbWVzWyBNYXRoLnJvdW5kKCBzZWVkICogKGZuYW1lcy5sZW5ndGggLTEpICkgXTtcbiAgICB2YXIgbGFzdF9uYW1lID0gbG5hbWVzWyBNYXRoLnJvdW5kKCBzZWVkICogKGxuYW1lcy5sZW5ndGggLTEpICkgXTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgICBpZDogaWQsXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZSxcbiAgICAgICAgZmlyc3RfbmFtZTogZmlyc3RfbmFtZSxcbiAgICAgICAgbGFzdF9uYW1lOiBsYXN0X25hbWUsXG4gICAgICAgIGFnZTogTWF0aC5jZWlsKHNlZWQgKiA3NSkgKyAxNSxcbiAgICAgICAgaGVpZ2h0OiBNYXRoLnJvdW5kKCBzZWVkMiAqIDM2ICkgKyA0OCxcbiAgICAgICAgd2VpZ2h0OiBNYXRoLnJvdW5kKCBzZWVkMiAqIDEzMCApICsgOTBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdlblJvd3MobnVtKXtcbiAgICB2YXIgcmV0VmFsID0gW107XG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbnVtOyBpKyspIHtcbiAgICAgICAgcmV0VmFsLnB1c2goZ2VuUm93KGkpKTtcbiAgICB9O1xuICAgIHJldHVybiByZXRWYWw7XG59XG5cbndpbmRvdy5zdG9wID0gZmFsc2U7XG52YXIgaW50dmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICBpZiAod2luZG93LnN0b3ApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnR2YWwpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBuZXdSb3dzID0gZ2VuUm93cygzMDApO1xuICAgIHZhciBtZXRob2QgPSBjb2xsZWN0aW9uLmxlbmd0aCA/ICdzZXQnIDogJ3Jlc2V0JyA7XG4gICAgLy8gdmFyIHN0YXJ0VGltZSA9ICtuZXcgRGF0ZSgpO1xuICAgIGNvbGxlY3Rpb25bbWV0aG9kXShuZXdSb3dzKTtcbiAgICAvLyB2YXIgZW5kVGltZSA9ICtuZXcgRGF0ZSgpO1xuICAgIC8vIGNvbnNvbGUubG9nKChlbmRUaW1lIC0gc3RhcnRUaW1lKS8xMDAwKTtcbiAgICBpZiAobWV0aG9kID09PSAnc2V0JykgY29sbGVjdGlvbi50cmlnZ2VyKCd1cGRhdGUnKTtcbn0sIDMwMDApOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vbGliL0Jhc2VWaWV3Jyk7XG52YXIgQ29sdW1uID0gcmVxdWlyZSgnLi9saWIvQ29sdW1uJykubW9kZWw7XG52YXIgQ29sdW1ucyA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLmNvbGxlY3Rpb247XG52YXIgVGhlYWQgPSByZXF1aXJlKCcuL2xpYi9UaGVhZCcpO1xudmFyIFRib2R5ID0gcmVxdWlyZSgnLi9saWIvVGJvZHknKTtcbnZhciBTY3JvbGxlciA9IHJlcXVpcmUoJy4vbGliL1Njcm9sbGVyJyk7XG5cbnZhciBDb25maWdNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgLy8gTWFrZXMgdGFibGUgd2lkdGggYW5kIGNvbHVtbiB3aWR0aHMgYWRqdXN0YWJsZVxuICAgICAgICBhZGp1c3RhYmxlX3dpZHRoOiB0cnVlLFxuICAgICAgICAvLyBTYXZlIHRoZSBzdGF0ZSBvZiB0aGUgdGFibGUgd2lkdGhzXG4gICAgICAgIHNhdmVfc3RhdGU6IGZhbHNlLFxuICAgICAgICAvLyBEZWZhdWx0IG1pbmltdW0gY29sdW1uIHdpZHRoLCBpbiBwaXhlbHNcbiAgICAgICAgbWluX2NvbHVtbl93aWR0aDogMzAsXG4gICAgICAgIC8vIERlZmF1bHQgd2lkdGggZm9yIHRoZSB0YWJsZSBpdHNlbGYuIEVpdGhlciBwaXhlbHMgb3IgJ2F1dG8nXG4gICAgICAgIHRhYmxlX3dpZHRoOiAnYXV0bycsXG4gICAgICAgIC8vIERlZmF1bHQgbWF4IG51bWJlciBvZiByb3dzIHRvIHJlbmRlciBiZWZvcmUgc2Nyb2xsIG9uIHRib2R5XG4gICAgICAgIG1heF9yb3dzOiAzMCxcbiAgICAgICAgLy8gRGVmYXVsdCBvZmZzZXQgZm9yIHRoZSB0Ym9keVxuICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgIC8vIFNldCBpbiB0aGUgcmVuZGVyaW5nIHBoYXNlIG9mIHRoZSB0Ym9keSAoY29kZSBzbWVsbC4uLilcbiAgICAgICAgdG90YWxfcm93czogMFxuICAgIH0sXG4gICAgXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgIGlmICggYXR0cnMub2Zmc2V0ID4gTWF0aC5tYXgoYXR0cnMubWF4X3Jvd3MsIGF0dHJzLnRvdGFsX3Jvd3MpIC0gYXR0cnMubWF4X3Jvd3MgKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJPZmZzZXQgY2Fubm90IGJlIHRoYXQgaGlnaC5cIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXR0cnMub2Zmc2V0IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiT2Zmc2V0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDBcIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXR0cnMubWF4X3Jvd3MgPCAxKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJtYXhfcm93cyBtdXN0IGF0bGVhc3QgMVwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXRWaXNpYmxlUm93czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIHZhciBsaW1pdCA9IHRoaXMuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICB2YXIgcm93c190b19yZW5kZXIgPSBbXTtcbiAgICAgICAgdGhpcy5nZXQoXCJjb2xsZWN0aW9uXCIpLmVhY2goZnVuY3Rpb24ocm93LCBpKXtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCB0aGlzLnBhc3Nlc0ZpbHRlcnMocm93KSApICsrdG90YWw7XG4gICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCB0b3RhbCA8PSBvZmZzZXQgKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdG90YWwgPiAob2Zmc2V0ICsgbGltaXQpICkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByb3dzX3RvX3JlbmRlci5wdXNoKHJvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgcHJldl90b3RhbCA9IHRoaXMuZ2V0KCd0b3RhbF9yb3dzJykqMTtcbiAgICAgICAgaWYgKHRvdGFsICE9PSBwcmV2X3RvdGFsKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgndG90YWxfcm93cycsIHRvdGFsKVxuICAgICAgICAgICAgdmFyIG5ld09mZnNldCA9IE1hdGgubWluKHRvdGFsIC0gbGltaXQsIG9mZnNldCk7XG4gICAgICAgICAgICBpZiAobmV3T2Zmc2V0ID09PSBvZmZzZXQpIHRoaXMudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICBlbHNlIHRoaXMuc2V0KCdvZmZzZXQnLCBuZXdPZmZzZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByb3dzX3RvX3JlbmRlcjtcbiAgICB9LFxuICAgIHBhc3Nlc0ZpbHRlcnM6IGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbHVtbnMuZXZlcnkoZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIGlmIChjb2x1bW4uZ2V0KCdmaWx0ZXJfdmFsdWUnKSA9PSBcIlwiIHx8IHR5cGVvZiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhc3Nlc0ZpbHRlcihyb3csIGNvbHVtbik7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgcGFzc2VzRmlsdGVyOiBmdW5jdGlvbihyb3csIGNvbHVtbil7XG4gICAgICAgIHJldHVybiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSggY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJyksIHJvdy5nZXQoY29sdW1uLmdldCgna2V5JykpLCBjb2x1bW4uZ2V0Rm9ybWF0dGVkKHJvdyksIHJvdyApO1xuICAgIH0sXG4gICAgXG59KTtcblxudmFyIFRhYmxlZCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuXG4gICAgICAgIC8vIEVuc3VyZSB0aGF0IHRoaXMuY29sbGVjdGlvbiAodGhlIGRhdGEpIGlzIGEgYmFja2JvbmUgY29sbGVjdGlvblxuICAgICAgICBpZiAoICEodGhpcy5jb2xsZWN0aW9uIGluc3RhbmNlb2YgQmFja2JvbmUuQ29sbGVjdGlvbikgKSB0aHJvdyBcIlRhYmxlZCBtdXN0IGJlIHByb3ZpZGVkIHdpdGggYSBiYWNrYm9uZSBjb2xsZWN0aW9uIGFzIGl0cyBkYXRhXCI7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWcgb2JqZWN0XG4gICAgICAgIHRoaXMuY29uZmlnID0gbmV3IENvbmZpZ01vZGVsKHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgLy8gQ29sdW1uc1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBuZXcgQ29sdW1ucyh0aGlzLmNvbmZpZy5nZXQoXCJjb2x1bW5zXCIpLHtjb25maWc6IHRoaXMuY29uZmlnfSk7XG4gICAgICAgIHRoaXMuY29uZmlnLmNvbHVtbnMgPSB0aGlzLmNvbHVtbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJ2aWV3c1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0aGVhZFwiLCBuZXcgVGhlYWQoe1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zLFxuICAgICAgICAgICAgY29uZmlnOiB0aGlzLmNvbmZpZ1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuc3VidmlldyhcInRib2R5XCIsIG5ldyBUYm9keSh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoJ3Njcm9sbGVyJywgbmV3IFNjcm9sbGVyKHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgIHRib2R5OiB0aGlzLnN1YnZpZXcoJ3Rib2R5JylcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGVcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHtcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZVByZXZpb3VzU3RhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuZXJzXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTp3aWR0aFwiLCB0aGlzLm9uV2lkdGhDaGFuZ2UgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmZpbHRlcl92YWx1ZVwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KFwib2Zmc2V0XCIsIDApO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJCb2R5KCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTptYXhfcm93c1wiLCB0aGlzLm9uTWF4Um93Q2hhbmdlKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgdGhpcy51cGRhdGVDb21wYXJhdG9yKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwic29ydFwiLCB0aGlzLm9uQ29sdW1uU29ydCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIQUNLOiBzZXQgdXAgZGF0YSBjb21wYXJhdG9yXG4gICAgICAgIHRoaXMuY29sdW1ucy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogW1xuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZC1jdG5yXCI+PGRpdiBjbGFzcz1cInRhYmxlZC1pbm5lclwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFibGVkXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0aGVhZFwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGJvZHktb3V0ZXJcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRib2R5XCI+PC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJzY3JvbGxlclwiPjwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS10YWJsZVwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj48L2Rpdj4nXG4gICAgXS5qb2luKFwiXCIpLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsIG1hcmt1cFxuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAvLyBTZXQgdGhlIHdpZHRocyBvZiB0aGUgY29sdW1uc1xuICAgICAgICB0aGlzLnNldFdpZHRocygpO1xuICAgICAgICAvLyAoUmUpcmVuZGVyIHN1YnZpZXdzXG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnLFxuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keScsXG4gICAgICAgICAgICAnLnNjcm9sbGVyJzogJ3Njcm9sbGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyQm9keTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keScsXG4gICAgICAgICAgICAnLnNjcm9sbGVyJzogJ3Njcm9sbGVyJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgb25XaWR0aENoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hZGp1c3RJbm5lckRpdigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0aGUgd2lkdGhzXG4gICAgICAgIGlmICghdGhpcy5jb25maWcuZ2V0KFwic2F2ZV9zdGF0ZVwiKSkgcmV0dXJuO1xuICAgICAgICB2YXIgd2lkdGhzID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGtleSl7XG4gICAgICAgICAgICBtZW1vW2NvbHVtbi5nZXQoJ2lkJyldID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LCB7fSwgdGhpcyk7XG4gICAgICAgIHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnLCB3aWR0aHMpO1xuICAgIH0sXG4gICAgXG4gICAgb25NYXhSb3dDaGFuZ2U6IGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSkge1xuICAgICAgICB0aGlzLnJlbmRlckJvZHkoKTtcbiAgICAgICAgdGhpcy5zdGF0ZSgnbWF4X3Jvd3MnLCB2YWx1ZSk7XG4gICAgfSxcbiAgICBcbiAgICBvbkNvbHVtblNvcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzb3J0XG4gICAgICAgIGlmICghdGhpcy5jb25maWcuZ2V0KFwic2F2ZV9zdGF0ZVwiKSkgcmV0dXJuO1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbHVtbnMuY29sX3NvcnRzO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnLCBzb3J0cyk7XG4gICAgfSxcbiAgICBcbiAgICBzZXRXaWR0aHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gVGFibGUncyB3aWR0aFxuICAgICAgICB2YXIgdG90YWxXaWR0aCA9IHRoaXMuY29uZmlnLmdldChcInRhYmxlX3dpZHRoXCIpID09PSAnYXV0bycgPyB0aGlzLiRlbC53aWR0aCgpIDogdGhpcy5jb25maWcuZ2V0KFwidGFibGVfd2lkdGhcIik7XG4gICAgICAgIHZhciBtYWtlRGVmYXVsdCA9IFtdO1xuICAgICAgICB2YXIgYWRqdXN0ZWRXaWR0aCA9IDA7XG4gICAgICAgIHRoaXMuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciBjb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIG1pbl9jb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJylcbiAgICAgICAgICAgIGlmICggY29sX3dpZHRoICkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gY29sX3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWluX2NvbF93aWR0aCkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gbWluX2NvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgbWFrZURlZmF1bHQucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBhdmdfd2lkdGggPSBtYWtlRGVmYXVsdC5sZW5ndGggPyB0b3RhbFdpZHRoL21ha2VEZWZhdWx0Lmxlbmd0aCA6IDAgO1xuICAgICAgICB2YXIgZGVmYXVsdFdpZHRoID0gTWF0aC5tYXgoTWF0aC5mbG9vcihhdmdfd2lkdGgpLCB0aGlzLmNvbmZpZy5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpKSA7XG4gICAgICAgIG1ha2VEZWZhdWx0LmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gTWF0aC5tYXgoZGVmYXVsdFdpZHRoLCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJykgfHwgZGVmYXVsdFdpZHRoKTtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoJ3dpZHRoJywgd2lkdGgpO1xuICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSB3aWR0aDtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJCgnLnRhYmxlZC1pbm5lcicpLndpZHRoKGFkanVzdGVkV2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0SW5uZXJEaXY6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpIHx8IGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vKjEgKyB3aWR0aCoxO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgdGhpcy4kKCcudGFibGVkLWlubmVyJykud2lkdGgod2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdtb3VzZWRvd24gLnJlc2l6ZS10YWJsZSc6ICdncmFiVGFibGVSZXNpemVyJyxcbiAgICAgICAgJ2RibGNsaWNrIC5yZXNpemUtdGFibGUnOiAgJ3Jlc2l6ZVRhYmxlVG9DdG5yJ1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgXG4gICAgZ3JhYlRhYmxlUmVzaXplcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciByZXNpemFibGVDb2xDb3VudCA9IDA7XG4gICAgICAgIHZhciBjb2xfc3RhdGUgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwgaW5kZXgpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICBpZiAoIWNvbHVtbi5nZXQoJ2xvY2tfd2lkdGgnKSkgKytyZXNpemFibGVDb2xDb3VudDtcbiAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9LHt9LHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gVmVydGljYWwgXG4gICAgICAgIHZhciBtb3VzZVkgPSBldnQuY2xpZW50WTtcbiAgICAgICAgdmFyIHJvd19oZWlnaHQgPSAkKFwiLnRyXCIsIHRoaXMuJGVsKS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIGluaXRNYXggPSB0aGlzLmNvbmZpZy5nZXQoJ21heF9yb3dzJyk7XG4gICAgICAgIFxuICAgICAgICB2YXIgdGFibGVfcmVzaXplID0gZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgICAgIC8vIEhvcml6b250YWxcbiAgICAgICAgICAgIHZhciBjaGFuZ2VYID0gKGV2dC5jbGllbnRYIC0gbW91c2VYKS9yZXNpemFibGVDb2xDb3VudDtcbiAgICAgICAgICAgIHNlbGYuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOmNvbF9zdGF0ZVtjb2x1bW4uZ2V0KFwiaWRcIildKjErY2hhbmdlWH0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgICAgIHZhciBjaGFuZ2VZID0gKGV2dC5jbGllbnRZIC0gbW91c2VZKTtcbiAgICAgICAgICAgIHZhciBhYkNoYW5nZVkgPSBNYXRoLmFicyhjaGFuZ2VZKTtcbiAgICAgICAgICAgIGlmICggYWJDaGFuZ2VZID4gcm93X2hlaWdodCkge1xuICAgICAgICAgICAgICAgIGFiQ2hhbmdlWSA9IE1hdGguZmxvb3IoYWJDaGFuZ2VZL3Jvd19oZWlnaHQpICogKGNoYW5nZVkgPiAwID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNvbmZpZy5zZXQoeydtYXhfcm93cyc6aW5pdE1heCArIGFiQ2hhbmdlWX0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCB0YWJsZV9yZXNpemUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgcmVzaXplVGFibGVUb0N0bnI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbmV3V2lkdGggPSB0aGlzLiRlbC5wYXJlbnQoKS53aWR0aCgpO1xuICAgICAgICB2YXIgY3VyV2lkdGggPSB0aGlzLiQoJy50YWJsZWQnKS53aWR0aCgpO1xuICAgICAgICB2YXIgZGVsdGEgPSBuZXdXaWR0aCAtIGN1cldpZHRoO1xuICAgICAgICB2YXIgcmVzaXphYmxlQ29sQ291bnQgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbikge1xuICAgICAgICAgICAgcmV0dXJuIGNvbHVtbi5nZXQoJ2xvY2tfd2lkdGgnKSA/IG1lbW8gOiArK21lbW8gO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgdmFyIGNoYW5nZSA9IGRlbHRhIC8gcmVzaXphYmxlQ29sQ291bnQ7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY2hhbmdlXCIsY2hhbmdlKTtcbiAgICAgICAgdGhpcy5jb2x1bW5zLmVhY2goZnVuY3Rpb24oY29sKXtcbiAgICAgICAgICAgIHZhciBjdXJXaWR0aCA9IGNvbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgICAgIGNvbC5zZXQoe1wid2lkdGhcIjogY2hhbmdlKjEgKyBjdXJXaWR0aCoxfSwge3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZSoxICsgY3VyV2lkdGgqMVwiLCBjaGFuZ2UqMSArIGN1cldpZHRoKjEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5jb21wYXJhdG9yID0gZm47XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9LFxuICAgIFxuICAgIHJlc3RvcmVQcmV2aW91c1N0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgd2lkdGhzXG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJyk7XG4gICAgICAgIGlmICh3aWR0aHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5lYWNoKHdpZHRocywgZnVuY3Rpb24odmFsLCBrZXkpe1xuICAgICAgICAgICAgICAgIHRoaXMuY29sdW1ucy5nZXQoa2V5KS5zZXQoJ3dpZHRoJywgdmFsKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgY29sdW1uIHNvcnQgb3JkZXJcbiAgICAgICAgdmFyIGNvbHNvcnRzID0gdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJyk7XG4gICAgICAgIGlmIChjb2xzb3J0cyAhPT0gdW5kZWZpbmVkICYmIGNvbHNvcnRzLmxlbmd0aCA9PT0gdGhpcy5jb2x1bW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmNvbF9zb3J0cyA9IGNvbHNvcnRzO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLnNvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1heF9yb3dzXG4gICAgICAgIHZhciBtYXhfcm93cyA9IHRoaXMuc3RhdGUoJ21heF9yb3dzJyk7XG4gICAgICAgIGlmIChtYXhfcm93cykge1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KHsnbWF4X3Jvd3MnOm1heF9yb3dzfSx7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzdGF0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZV9rZXkgPSAndGFibGVkLicrdGhpcy5jb25maWcuZ2V0KFwiaWRcIik7XG4gICAgICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmUgfHwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZV9rZXkpIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdG9yZSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IEpTT04ucGFyc2Uoc3RvcmUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgc3RvcmUgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHN0b3JlKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9yZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGFibGVkIiwidmFyIEJhc2VWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgIC8vIEFzc2lnbnMgYSBzdWJ2aWV3IHRvIGEganF1ZXJ5IHNlbGVjdG9yIGluIHRoaXMgdmlldydzIGVsXG4gICAgYXNzaWduIDogZnVuY3Rpb24gKHNlbGVjdG9yLCB2aWV3KSB7XG4gICAgICAgIHZhciBzZWxlY3RvcnM7XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgc2VsZWN0b3JzID0gc2VsZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSB7fTtcbiAgICAgICAgICAgIHNlbGVjdG9yc1tzZWxlY3Rvcl0gPSB2aWV3O1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2VsZWN0b3JzKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChzZWxlY3RvcnMsIGZ1bmN0aW9uICh2aWV3LCBzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2aWV3ID09PSBcInN0cmluZ1wiKSB2aWV3ID0gdGhpcy5fX3N1YnZpZXdzX19bdmlld107XG4gICAgICAgICAgICB2aWV3LnNldEVsZW1lbnQodGhpcy4kKHNlbGVjdG9yKSkucmVuZGVyKCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNsZWFuX3VwXCIpO1xuICAgICAgICB0aGlzLnVuYmluZCgpO1xuICAgICAgICBCYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzKTtcbiAgICB9LFxuICAgIFxuICAgIHN1YnZpZXc6IGZ1bmN0aW9uKGtleSwgdmlldyl7XG4gICAgICAgIC8vIFNldCB1cCBzdWJ2aWV3IG9iamVjdFxuICAgICAgICB2YXIgc3YgPSB0aGlzLl9fc3Vidmlld3NfXyA9IHRoaXMuX19zdWJ2aWV3c19fIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZ2V0dGluZ1xuICAgICAgICBpZiAodmlldyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gc3Zba2V5XTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0ZW5lciBmb3IgcmVtb3ZhbCBldmVudFxuICAgICAgICB2aWV3Lmxpc3RlblRvKHRoaXMsIFwiY2xlYW5fdXBcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBrZXlcbiAgICAgICAgc3Zba2V5XSA9IHZpZXc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbGxvdyBjaGFpbmluZ1xuICAgICAgICByZXR1cm4gdmlld1xuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldyIsInZhciBGaWx0ZXJzID0gcmVxdWlyZShcIi4vRmlsdGVyc1wiKTtcbnZhciBTb3J0cyA9IHJlcXVpcmUoXCIuL1NvcnRzXCIpO1xudmFyIEZvcm1hdHMgPSByZXF1aXJlKFwiLi9Gb3JtYXRzXCIpO1xudmFyIENvbHVtbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGtleTogXCJcIixcbiAgICAgICAgbGFiZWw6IFwiXCIsXG4gICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgZmlsdGVyOiB1bmRlZmluZWQsXG4gICAgICAgIGZvcm1hdDogdW5kZWZpbmVkLFxuICAgICAgICBzZWxlY3Q6IGZhbHNlLFxuICAgICAgICBmaWx0ZXJfdmFsdWU6IFwiXCIsXG4gICAgICAgIHNvcnRfdmFsdWU6IFwiXCIsXG4gICAgICAgIGxvY2tfd2lkdGg6IGZhbHNlXG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbHRlclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhpcy5nZXQoXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInN0cmluZ1wiICYmIEZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmaWx0ZXJcIiwgRmlsdGVyc1tmaWx0ZXJdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNvcnRcbiAgICAgICAgdmFyIHNvcnQgPSB0aGlzLmdldChcInNvcnRcIik7XG4gICAgICAgIGlmICh0eXBlb2Ygc29ydCA9PT0gXCJzdHJpbmdcIiAmJiBTb3J0cy5oYXNPd25Qcm9wZXJ0eShzb3J0KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzb3J0XCIsIFNvcnRzW3NvcnRdKHRoaXMuZ2V0KFwia2V5XCIpKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBmb3JtYXRcbiAgICAgICAgdmFyIHNlbGVjdCA9IHRoaXMuZ2V0KCdzZWxlY3QnKTtcbiAgICAgICAgdmFyIGZvcm1hdCA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgaWYgKHNlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0cy5zZWxlY3QgKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic2VsZWN0X2tleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZvcm1hdCA9PT0gXCJzdHJpbmdcIiAmJiB0eXBlb2YgRm9ybWF0c1tmb3JtYXRdICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICB0aGlzLnNldChcImZvcm1hdFwiLCBGb3JtYXRzW2Zvcm1hdF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTT04oKTtcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLndpZHRoIDwgYXR0cnMubWluX2NvbHVtbl93aWR0aCkgcmV0dXJuIFwiQSBjb2x1bW4gd2lkdGggY2Fubm90IGJlID0+IDBcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy5sb2NrX3dpZHRoID09PSB0cnVlICYmIGF0dHJzLndpZHRoID4gMCkgcmV0dXJuIFwiVGhpcyBjb2x1bW4gaGFzIGEgbG9ja2VkIHdpZHRoXCI7XG4gICAgICAgIFxuICAgIH0sXG4gICAgXG4gICAgZ2V0S2V5OiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHRoaXMuZ2V0KCdrZXknKSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRGb3JtYXR0ZWQ6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgID8gZm4odGhpcy5nZXRLZXkobW9kZWwpLCBtb2RlbClcbiAgICAgICAgICAgIDogdGhpcy5nZXRLZXkobW9kZWwpO1xuICAgIH0sXG4gICAgXG4gICAgc29ydEluZGV4OiBmdW5jdGlvbihuZXdJbmRleCkge1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbGxlY3Rpb24uY29sX3NvcnRzO1xuICAgICAgICBpZiAodHlwZW9mIG5ld0luZGV4ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gc29ydHMuaW5kZXhPZih0aGlzLmdldChcImlkXCIpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJJZHggPSB0aGlzLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgaWQgPSBzb3J0cy5zcGxpY2UoY3VySWR4LCAxKVswXTtcbiAgICAgICAgc29ydHMuc3BsaWNlKG5ld0luZGV4LCAwLCBpZCk7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5zb3J0KCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBDb2x1bW5zID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIFxuICAgIG1vZGVsOiBDb2x1bW4sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICAgIF8uZWFjaChtb2RlbHMsIHRoaXMuc2V0TWluV2lkdGgsIHRoaXMpO1xuICAgICAgICB0aGlzLnJvd19zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbFJvd1NvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMuY29sX3NvcnRzID0gdGhpcy5nZXRJbml0aWFsQ29sU29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5vbihcImNoYW5nZTpzb3J0X3ZhbHVlXCIsIHRoaXMub25Tb3J0Q2hhbmdlKTtcbiAgICB9LFxuICAgIFxuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGNvbDEsIGNvbDIpIHtcbiAgICAgICAgdmFyIGlkeDEgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDEuZ2V0KFwiaWRcIikpO1xuICAgICAgICB2YXIgaWR4MiA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMi5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHJldHVybiBpZHgxIC0gaWR4MjtcbiAgICB9LFxuICAgIFxuICAgIHNldE1pbldpZHRoOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICBpZiAobW9kZWwuaGFzT3duUHJvcGVydHkoJ21pbl9jb2x1bW5fd2lkdGgnKSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgbW9kZWxbJ21pbl9jb2x1bW5fd2lkdGgnXSA9IHRoaXMuY29uZmlnLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIik7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsUm93U29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5jb25maWcuZ2V0KFwicm93X3NvcnRzXCIpKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMuY29uZmlnLmdldChcInJvd19zb3J0c1wiKTtcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAncm93X3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IF8ucmVkdWNlKG1vZGVscyxmdW5jdGlvbihtZW1vLCBjb2x1bW4peyBcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uWydzb3J0X3ZhbHVlJ10pIFxuICAgICAgICAgICAgICAgICAgICBtZW1vLnB1c2goY29sdW1uW1wiaWRcIl0pOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgICAgIH0sW10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxDb2xTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJjb2xfc29ydHNcIikpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5jb25maWcuZ2V0KFwiY29sX3NvcnRzXCIpO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdjb2xfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gZGVmYXVsdFNvcnRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIG9uU29ydENoYW5nZTogZnVuY3Rpb24obW9kZWwsIHZhbHVlKSB7XG4gICAgICAgIHZhciBpZCA9IG1vZGVsLmdldChcImlkXCIpO1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnJvd19zb3J0cy5pbmRleE9mKGlkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDb21wYXJhdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMucm93X3NvcnRzLmxlbmd0aCAhPT0gMCl7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZ1bmN0aW9uKHJvdzEsIHJvdzIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzZWxmLnJvd19zb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBzZWxmLnJvd19zb3J0c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYuZ2V0KGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gY29sdW1uLmdldChcInNvcnRcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbHVtbi5nZXQoXCJzb3J0X3ZhbHVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydF9yZXN1bHQgPSB2YWx1ZSA9PSBcImFcIiA/IGZuKHJvdzEsIHJvdzIpIDogZm4ocm93Miwgcm93MSkgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydF9yZXN1bHQgIT0gMCkgcmV0dXJuIHNvcnRfcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgY29tcGFyYXRvcik7XG4gICAgICAgIFxuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzLm1vZGVsID0gQ29sdW1uO1xuZXhwb3J0cy5jb2xsZWN0aW9uID0gQ29sdW1uczsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG5cbnZhciBUaENlbGwgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGNsYXNzTmFtZTogJ3RoJyxcbiAgICBcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZSgnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIiB0aXRsZT1cIjwlPSBsYWJlbCAlPlwiPjxzcGFuIGNsYXNzPVwidGgtaGVhZGVyXCI+PCU9IGxhYmVsICU+PC9zcGFuPjwvZGl2PjwlIGlmKGxvY2tfd2lkdGggIT09IHRydWUpIHslPjxzcGFuIGNsYXNzPVwicmVzaXplXCI+PC9zcGFuPjwlfSU+JyksXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6c29ydF92YWx1ZVwiLCB0aGlzLnJlbmRlciApO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOndpZHRoXCIsIGZ1bmN0aW9uKG1vZGVsLCB3aWR0aCkge1xuICAgICAgICAgICAgdGhpcy4kZWwud2lkdGgod2lkdGgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBqc29uID0gdGhpcy5tb2RlbC5zZXJpYWxpemUoKTtcbiAgICAgICAgdmFyIHNvcnRfY2xhc3MgPSBqc29uLnNvcnRfdmFsdWUgPyAoanNvbi5zb3J0X3ZhbHVlID09IFwiZFwiID8gXCJkZXNjXCIgOiBcImFzY1wiICkgOiBcIlwiIDtcbiAgICAgICAgdGhpcy4kZWxcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYXNjIGRlc2MnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjb2wtJytqc29uLmlkK1wiIFwiK3NvcnRfY2xhc3MpXG4gICAgICAgICAgICAud2lkdGgoanNvbi53aWR0aClcbiAgICAgICAgICAgIC5odG1sKHRoaXMudGVtcGxhdGUoanNvbikpO1xuICAgICAgICBpZiAoc29ydF9jbGFzcyAhPT0gXCJcIikge1xuICAgICAgICAgICAgdGhpcy4kKFwiLnRoLWhlYWRlclwiKS5wcmVwZW5kKCc8aSBjbGFzcz1cIicrc29ydF9jbGFzcysnLWljb25cIj48L2k+ICcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwibW91c2Vkb3duIC5yZXNpemVcIjogXCJncmFiUmVzaXplclwiLFxuICAgICAgICBcImRibGNsaWNrIC5yZXNpemVcIjogXCJmaXRUb0NvbnRlbnRcIixcbiAgICAgICAgXCJtb3VzZXVwIC50aC1oZWFkZXJcIjogXCJjaGFuZ2VDb2x1bW5Tb3J0XCIsXG4gICAgICAgIFwibW91c2Vkb3duXCI6IFwiZ3JhYkNvbHVtblwiXG4gICAgfSxcbiAgICBcbiAgICBncmFiUmVzaXplcjogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgY29sdW1uV2lkdGggPSB0aGlzLm1vZGVsLmdldChcIndpZHRoXCIpO1xuICAgICAgICAvLyBIYW5kbGVyIGZvciB3aGVuIG1vdXNlIGlzIG1vdmluZ1xuICAgICAgICB2YXIgY29sX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYubW9kZWw7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gZXZ0LmNsaWVudFggLSBtb3VzZVg7XG4gICAgICAgICAgICB2YXIgbmV3V2lkdGggPSBjb2x1bW5XaWR0aCArIGNoYW5nZTtcbiAgICAgICAgICAgIGlmICggbmV3V2lkdGggPCBjb2x1bW4uZ2V0KFwibWluX2NvbHVtbl93aWR0aFwiKSkgcmV0dXJuO1xuICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOiBuZXdXaWR0aH0sIHt2YWxpZGF0ZTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIGNvbF9yZXNpemUpO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCBjbGVhbnVwX3Jlc2l6ZSk7XG4gICAgfSxcbiAgICBcbiAgICBmaXRUb0NvbnRlbnQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgbmV3X3dpZHRoID0gMDtcbiAgICAgICAgdmFyIG1pbl93aWR0aCA9IHRoaXMubW9kZWwuZ2V0KCdtaW5fY29sdW1uX3dpZHRoJyk7XG4gICAgICAgIHZhciBpZCA9IHRoaXMubW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgICB2YXIgJGN0eCA9IHRoaXMuJGVsLnBhcmVudHMoJy50YWJsZWQnKS5maW5kKCcudGJvZHknKTtcbiAgICAgICAgJChcIi50ZC5jb2wtXCIraWQrXCIgLmNlbGwtaW5uZXJcIiwgJGN0eCkuZWFjaChmdW5jdGlvbihpLCBlbCl7XG4gICAgICAgICAgICBuZXdfd2lkdGggPSBNYXRoLm1heChuZXdfd2lkdGgsJCh0aGlzKS5vdXRlcldpZHRoKHRydWUpLCBtaW5fd2lkdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeyd3aWR0aCc6bmV3X3dpZHRofSx7dmFsaWRhdGU6IHRydWV9KTtcbiAgICB9LFxuICAgIFxuICAgIGNoYW5nZUNvbHVtblNvcnQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcy5tb2RlbDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgbW9kZWwuZ2V0KFwic29ydFwiKSAhPT0gXCJmdW5jdGlvblwiIHx8IG1vZGVsLmdldChcIm1vdmluZ1wiKSA9PT0gdHJ1ZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cl9zb3J0ID0gbW9kZWwuZ2V0KFwic29ydF92YWx1ZVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghZXZ0LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIGFsbCBzb3J0c1xuICAgICAgICAgICAgbW9kZWwuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbCl7XG4gICAgICAgICAgICAgICAgaWYgKGNvbCAhPT0gbW9kZWwpIGNvbC5zZXQoe1wic29ydF92YWx1ZVwiOiBcIlwifSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2goY3VyX3NvcnQpIHtcbiAgICAgICAgICAgIGNhc2UgXCJcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiYVwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJhXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZFwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIGdyYWJDb2x1bW46IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0Lm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIG9mZnNldFggPSBldnQub2Zmc2V0WDtcbiAgICAgICAgdmFyIHRocmVzaG9sZHMgPSBbXTtcbiAgICAgICAgdmFyIGN1cnJlbnRJZHggPSB0aGlzLm1vZGVsLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgJHRyID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICR0ci5maW5kKCcudGgnKS5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSAkdGhpcy5vZmZzZXQoKS5sZWZ0O1xuICAgICAgICAgICAgdmFyIGhhbGYgPSAkdGhpcy53aWR0aCgpIC8gMjtcbiAgICAgICAgICAgIGlmIChpICE9IGN1cnJlbnRJZHgpIHRocmVzaG9sZHMucHVzaChvZmZzZXQraGFsZik7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJldmVudF9tb3VzZXVwID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2V0TmV3SW5kZXggPSBmdW5jdGlvbihwb3MpIHtcbiAgICAgICAgICAgIHZhciBuZXdJZHggPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgdGhyZXNob2xkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSB0aHJlc2hvbGRzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwb3MgPiB2YWwpIG5ld0lkeCsrO1xuICAgICAgICAgICAgICAgIGVsc2UgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gbmV3SWR4O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZHJhd0hlbHBlciA9IGZ1bmN0aW9uKG5ld0lkeCkge1xuICAgICAgICAgICAgJHRyLmZpbmQoJy5jb2xzb3J0LWhlbHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgaWYgKG5ld0lkeCA9PSBjdXJyZW50SWR4KSByZXR1cm47XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gbmV3SWR4IDwgY3VycmVudElkeCA/ICdiZWZvcmUnIDogJ2FmdGVyJztcbiAgICAgICAgICAgICR0ci5maW5kKCcudGg6ZXEoJytuZXdJZHgrJyknKVttZXRob2RdKCc8ZGl2IGNsYXNzPVwiY29sc29ydC1oZWxwZXJcIj48L2Rpdj4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIG1vdmVfY29sdW1uID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICB2YXIgY3VyTW91c2UgPSBldnQuY2xpZW50WDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBjdXJNb3VzZSAtIG1vdXNlWDtcbiAgICAgICAgICAgIHNlbGYuJGVsLmNzcyh7J2xlZnQnOmNoYW5nZSwgJ29wYWNpdHknOjAuNSwgJ3pJbmRleCc6IDEwfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBuZXdJZHggPSBnZXROZXdJbmRleChjdXJNb3VzZSwgdGhyZXNob2xkcyk7XG4gICAgICAgICAgICBkcmF3SGVscGVyKG5ld0lkeCk7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCgnbW92aW5nJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBjbGVhbnVwX21vdmUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHNlbGYuJGVsLmNzcyh7J2xlZnQnOiAwLCAnb3BhY2l0eSc6MX0pO1xuICAgICAgICAgICAgJHRyLmZpbmQoJy5jb2xzb3J0LWhlbHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNvcnRJbmRleChnZXROZXdJbmRleChjdXJNb3VzZSwgdGhyZXNob2xkcykpO1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBtb3ZlX2NvbHVtbik7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCgnbW92aW5nJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCBjbGVhbnVwX21vdmUpXG4gICAgfVxufSk7XG5cbnZhciBUaFJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gY2xlYXIgaXRcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBlYWNoIHRoIGNlbGxcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IFRoQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKVxuICAgICAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcImNsZWFuX3VwXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IGNsYXNzPVwiZmlsdGVyXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiZmlsdGVyXCIgLz48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXInKTtcbiAgICAgICAgdmFyIG1hcmt1cCA9IHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy50ZW1wbGF0ZSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygndGQgY29sLScrdGhpcy5tb2RlbC5nZXQoJ2lkJykpLndpZHRoKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbChtYXJrdXApO1xuICAgICAgICB0aGlzLiQoXCJpbnB1dFwiKS52YWwodGhpcy5tb2RlbC5nZXQoJ2ZpbHRlcl92YWx1ZScpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJjbGljayAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyXCIsXG4gICAgICAgIFwia2V5dXAgLmZpbHRlclwiOiBcInVwZGF0ZUZpbHRlckRlbGF5ZWRcIlxuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ2ZpbHRlcl92YWx1ZScsICQudHJpbSh0aGlzLiQoJy5maWx0ZXInKS52YWwoKSkgKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUZpbHRlckRlbGF5ZWQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAodGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0KSBjbGVhclRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0KVxuICAgICAgICB0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMudXBkYXRlRmlsdGVyLmJpbmQodGhpcywgZXZ0KSwgMjAwKTtcbiAgICB9XG4gICAgXG59KTtcblxudmFyIEZpbHRlclJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gY2xlYXIgaXRcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2xlYW5fdXBcIilcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBlYWNoIHRoIGNlbGxcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IEZpbHRlckNlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsICk7XG4gICAgICAgICAgICB2aWV3Lmxpc3RlblRvKHRoaXMsIFwiY2xlYW5fdXBcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBUaGVhZCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAvLyBTZXQgY29uZmlnXG4gICAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBzdWJ2aWV3c1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0aF9yb3dcIiwgbmV3IFRoUm93KHsgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uIH0pKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm5lZWRzRmlsdGVyUm93KCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3VidmlldyhcImZpbHRlcl9yb3dcIiwgbmV3IEZpbHRlclJvdyh7IGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbiB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3Igd2hlbiBvZmZzZXQgaXMgbm90IHplcm9cbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJjaGFuZ2U6b2Zmc2V0XCIsIGZ1bmN0aW9uKG1vZGVsLCBvZmZzZXQpe1xuICAgICAgICAgICAgdmFyIHRvZ2dsZUNsYXNzID0gb2Zmc2V0ID09PSAwID8gJ3JlbW92ZUNsYXNzJyA6ICdhZGRDbGFzcycgO1xuICAgICAgICAgICAgdGhpcy4kZWxbdG9nZ2xlQ2xhc3NdKCdvdmVyaGFuZycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInRyIHRoLXJvd1wiPjwvZGl2PjxkaXYgY2xhc3M9XCJ0ciBmaWx0ZXItcm93XCI+PC9kaXY+JyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLmFzc2lnbih7ICcudGgtcm93JyA6ICd0aF9yb3cnIH0pO1xuICAgICAgICBpZiAodGhpcy5zdWJ2aWV3KCdmaWx0ZXJfcm93JykpIHtcbiAgICAgICAgICAgIHRoaXMuYXNzaWduKHsgJy5maWx0ZXItcm93JyA6ICdmaWx0ZXJfcm93JyB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHRoaXMuJCgnLmZpbHRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBuZWVkc0ZpbHRlclJvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uc29tZShmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09ICd1bmRlZmluZWQnKVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbn0pO1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGhlYWQ7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVHJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgY2xhc3NOYW1lOiAndHInLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMucmVuZGVyKTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNsZWFuX3VwXCIpO1xuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciBpZCA9IGNvbHVtbi5nZXQoJ2lkJyk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IGNvbHVtbi5nZXRGb3JtYXR0ZWQodGhpcy5tb2RlbCk7XG4gICAgICAgICAgICB2YXIgJHZpZXcgPSAkKCc8ZGl2IGNsYXNzPVwidGQgY29sLScraWQrJ1wiIHN0eWxlPVwid2lkdGg6Jyt3aWR0aCsncHhcIj48ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjwvZGl2PjwvZGl2PicpO1xuICAgICAgICAgICAgJHZpZXcuZmluZCgnLmNlbGwtaW5uZXInKS5hcHBlbmQoZm9ybWF0dGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCgkdmlldyk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSk7XG5cblxuXG52YXIgVGJvZHkgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gb3B0aW9ucy5jb2x1bW5zO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IHRoaXMuY29sdW1ucy5jb25maWc7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwic29ydFwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInVwZGF0ZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb25maWcsIFwidXBkYXRlXCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOndpZHRoXCIsIHRoaXMuYWRqdXN0Q29sdW1uV2lkdGggKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJjaGFuZ2U6b2Zmc2V0XCIsIHRoaXMucmVuZGVyKTtcbiAgICB9LFxuICAgIFxuICAgIGFkanVzdENvbHVtbldpZHRoOiBmdW5jdGlvbihtb2RlbCwgbmV3V2lkdGgsIG9wdGlvbnMpe1xuICAgICAgICB0aGlzLiQoJy50ZC5jb2wtJyttb2RlbC5nZXQoXCJpZFwiKSkud2lkdGgobmV3V2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gUmVuZGVycyB0aGUgdmlzaWJsZSByb3dzIGdpdmVuIHRoZSBjdXJyZW50IG9mZnNldCBhbmQgbWF4X3Jvd3NcbiAgICAvLyBwcm9wZXJ0aWVzIG9uIHRoZSBjb25maWcgb2JqZWN0LlxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcImNsZWFuX3VwXCIpO1xuICAgICAgICB2YXIgcm93c190b19yZW5kZXIgPSB0aGlzLmNvbmZpZy5nZXRWaXNpYmxlUm93cygpO1xuICAgICAgICBpZiAocm93c190b19yZW5kZXIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICByb3dzX3RvX3JlbmRlci5mb3JFYWNoKGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgICAgICB2YXIgcm93VmlldyA9IG5ldyBUcm93KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogcm93LFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHJvd1ZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHJvd1ZpZXcubGlzdGVuVG8odGhpcywgXCJjbGVhbl91cFwiLCByb3dWaWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3JlbmRlcmVkJyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwid2hlZWxcIjogXCJvbk1vdXNlV2hlZWxcIixcbiAgICAgICAgXCJtb3VzZXdoZWVsXCI6IFwib25Nb3VzZVdoZWVsXCJcbiAgICB9LFxuICAgIFxuICAgIG9uTW91c2VXaGVlbDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIC8vIEJpZ0ludGVnZXJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gbm9ybWFsaXplIHdlYmtpdC9maXJlZm94IHNjcm9sbCB2YWx1ZXNcbiAgICAgICAgdmFyIGRlbHRhWSA9IC1ldnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhWSB8fCBldnQub3JpZ2luYWxFdmVudC5kZWx0YVkgKiAxMDA7XG4gICAgICAgIHZhciBtb3ZlbWVudCA9IE1hdGgucm91bmQoZGVsdGFZIC8gMTAwKTtcbiAgICAgICAgaWYgKGlzTmFOKG1vdmVtZW50KSkgcmV0dXJuO1xuICAgICAgICB2YXIgb3JpZ09mZnNldCA9IHRoaXMuY29uZmlnLmdldChcIm9mZnNldFwiKTtcbiAgICAgICAgdmFyIGxpbWl0ID0gdGhpcy5jb25maWcuZ2V0KFwibWF4X3Jvd3NcIik7XG4gICAgICAgIHZhciBvZmZzZXQgPSBNYXRoLm1pbiggdGhpcy5jb2xsZWN0aW9uLmxlbmd0aCAtIGxpbWl0LCBNYXRoLm1heCggMCwgb3JpZ09mZnNldCArIG1vdmVtZW50KSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmNvbmZpZy5zZXQoe1wib2Zmc2V0XCI6IG9mZnNldH0sIHt2YWxpZGF0ZTogdHJ1ZX0gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByZXZlbnQgZGVmYXVsdCBvbmx5IHdoZW4gbmVjZXNzYXJ5XG4gICAgICAgIGlmIChvZmZzZXQgPiAwICYmIG9mZnNldCA8IHRoaXMuY29sbGVjdGlvbi5sZW5ndGggLSBsaW1pdCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldnQub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYm9keTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG52YXIgU2Nyb2xsZXIgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpvZmZzZXRcIiwgdGhpcy51cGRhdGVQb3NpdGlvbik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8ob3B0aW9ucy50Ym9keSwgXCJyZW5kZXJlZFwiLCB0aGlzLnJlbmRlcik7XG4gICAgfSwgICAgXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwiaW5uZXJcIj48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLm1vZGVsLmdldCgnb2Zmc2V0Jyk7XG4gICAgICAgIHZhciBsaW1pdCA9IHRoaXMubW9kZWwuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICB2YXIgdG90YWwgPSB0aGlzLm1vZGVsLmdldCgndG90YWxfcm93cycpO1xuICAgICAgICB2YXIgYWN0dWFsX2ggPSB0aGlzLiRlbC5wYXJlbnQoKS5oZWlnaHQoKTtcbiAgICAgICAgdmFyIGFjdHVhbF9yID0gYWN0dWFsX2ggLyB0b3RhbDtcbiAgICAgICAgdmFyIHNjcm9sbF9oZWlnaHQgPSBsaW1pdCAqIGFjdHVhbF9yO1xuICAgICAgICBpZiAoc2Nyb2xsX2hlaWdodCA8IDEwKSB7XG4gICAgICAgICAgICB2YXIgY29ycmVjdGlvbiA9IDEwIC0gc2Nyb2xsX2hlaWdodDtcbiAgICAgICAgICAgIGFjdHVhbF9oIC09IGNvcnJlY3Rpb247XG4gICAgICAgICAgICBhY3R1YWxfciA9IGFjdHVhbF9oIC8gdG90YWw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNjcm9sbF90b3AgPSBvZmZzZXQgKiBhY3R1YWxfcjtcbiAgICAgICAgXG4gICAgICAgIGlmIChzY3JvbGxfaGVpZ2h0IDwgYWN0dWFsX2ggJiYgdG90YWwgPiBsaW1pdCkge1xuICAgICAgICAgICAgdGhpcy4kKFwiLmlubmVyXCIpLmNzcyh7XG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBzY3JvbGxfaGVpZ2h0LFxuICAgICAgICAgICAgICAgIHRvcDogc2Nyb2xsX3RvcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiQoXCIuaW5uZXJcIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBldmVudHM6IHtcbiAgICAgICAgXCJtb3VzZWRvd24gLmlubmVyXCI6IFwiZ3JhYlNjcm9sbGVyXCJcbiAgICB9LFxuICAgIFxuICAgIGdyYWJTY3JvbGxlcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWSA9IGV2dC5jbGllbnRZO1xuICAgICAgICB2YXIgb2Zmc2V0WSA9IGV2dC5vZmZzZXRZO1xuICAgICAgICB2YXIgcmF0aW8gPSB0aGlzLm1vZGVsLmdldCgndG90YWxfcm93cycpIC8gdGhpcy4kZWwucGFyZW50KCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBpbml0T2Zmc2V0ID0gc2VsZi5tb2RlbC5nZXQoJ29mZnNldCcpO1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gbW92ZVNjcm9sbGVyKGV2dCl7XG4gICAgICAgICAgICB2YXIgY3VyTW91c2UgPSBldnQuY2xpZW50WTtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBjdXJNb3VzZSAtIG1vdXNlWTtcbiAgICAgICAgICAgIHZhciBuZXdPZmZzZXQgPSBNYXRoLm1heChNYXRoLnJvdW5kKHJhdGlvICogY2hhbmdlKSArIGluaXRPZmZzZXQsIDApO1xuICAgICAgICAgICAgbmV3T2Zmc2V0ID0gTWF0aC5taW4obmV3T2Zmc2V0LCBzZWxmLm1vZGVsLmdldCgndG90YWxfcm93cycpIC0gc2VsZi5tb2RlbC5nZXQoJ21heF9yb3dzJykpXG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCh7J29mZnNldCc6bmV3T2Zmc2V0fSwge3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIHJlbGVhc2VTY3JvbGxlcihldnQpe1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBtb3ZlU2Nyb2xsZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgbW92ZVNjcm9sbGVyKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgcmVsZWFzZVNjcm9sbGVyKTtcbiAgICB9XG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gU2Nyb2xsZXIiLCJleHBvcnRzLmxpa2UgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YodGVybSkgPiAtMTtcbn1cbmV4cG9ydHMuaXMgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHRlcm0gPT0gdmFsdWU7XG59XG5leHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlKSB7XG4gICAgdmFsdWUgKj0gMTtcbiAgICB2YXIgZmlyc3RfdHdvID0gdGVybS5zdWJzdHIoMCwyKTtcbiAgICB2YXIgZmlyc3RfY2hhciA9IHRlcm1bMF07XG4gICAgdmFyIGFnYWluc3RfMSA9IHRlcm0uc3Vic3RyKDEpKjE7XG4gICAgdmFyIGFnYWluc3RfMiA9IHRlcm0uc3Vic3RyKDIpKjE7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI8PVwiICkgcmV0dXJuIHZhbHVlIDw9IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI+PVwiICkgcmV0dXJuIHZhbHVlID49IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPFwiICkgcmV0dXJuIHZhbHVlIDwgYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI+XCIgKSByZXR1cm4gdmFsdWUgPiBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIn5cIiApIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKSA9PSBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj1cIiApIHJldHVybiBhZ2FpbnN0XzEgPT0gdmFsdWUgO1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpLmluZGV4T2YodGVybS50b1N0cmluZygpKSA+IC0xIDtcbn0iLCJleHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpKjEgLSByb3cyLmdldChmaWVsZCkqMTtcbiAgICB9XG59XG5leHBvcnRzLnN0cmluZyA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICBpZiAoIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT0gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSApIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA+IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPyAxIDogLTEgO1xuICAgIH1cbn0iLCJ2YXIgQm9ybWF0cyA9IHJlcXVpcmUoJ2Jvcm1hdCcpO1xuZXhwb3J0cy5zZWxlY3QgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZWwpIHtcbiAgICB2YXIgc2VsZWN0X2tleSA9ICdzZWxlY3RlZCc7XG4gICAgdmFyIGNoZWNrZWQgPSBtb2RlbFtzZWxlY3Rfa2V5XSA9PT0gdHJ1ZTtcbiAgICB2YXIgJHJldCA9ICQoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwic2VsZWN0Ym94XCI+PC9kaXY+Jyk7XG4gICAgXG4gICAgLy8gU2V0IGNoZWNrZWRcbiAgICB2YXIgJGNiID0gJHJldC5maW5kKCdpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCBjaGVja2VkKTtcbiAgICBcbiAgICAvLyBTZXQgY2xpY2sgYmVoYXZpb3JcbiAgICAkY2JcbiAgICAub24oJ2NsaWNrIG1vdXNlZG93bicsIGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0pXG4gICAgLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICEhIG1vZGVsW3NlbGVjdF9rZXldO1xuICAgICAgICB2YXIgaXNfc2VsZWN0ZWRfbm93ID0gbW9kZWxbc2VsZWN0X2tleV0gPSAhc2VsZWN0ZWQ7XG4gICAgICAgICRjYi5wcm9wKCdjaGVja2VkJywgaXNfc2VsZWN0ZWRfbm93KTtcbiAgICAgICAgbW9kZWwudHJpZ2dlcignY2hhbmdlX3NlbGVjdGVkJywgbW9kZWwsIHNlbGVjdGVkKTtcbiAgICB9KVxuICAgIFxuICAgIHJldHVybiAkcmV0O1xufVxuXG52YXIgdGltZVNpbmNlID0gQm9ybWF0cy50aW1lU2luY2U7XG5cbmV4cG9ydHMudGltZVNpbmNlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoL15cXGQrJC8udGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgdmFyIG5ld1ZhbCA9IHRpbWVTaW5jZSh2YWx1ZSkgfHwgXCJhIG1vbWVudFwiO1xuICAgICAgICByZXR1cm4gbmV3VmFsICsgXCIgYWdvXCI7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0cy5jb21tYUludCA9IEJvcm1hdHMuY29tbWFHcm91cHM7IiwiZnVuY3Rpb24gdGltZVNpbmNlKHRpbWVzdGFtcCwgY29tcGFyZURhdGUsIHRpbWVDaHVuaykge1xuICAgIHZhciBub3cgPSBjb21wYXJlRGF0ZSA9PT0gdW5kZWZpbmVkID8gK25ldyBEYXRlKCkgOiBjb21wYXJlRGF0ZTtcbiAgICB2YXIgcmVtYWluaW5nID0gKHRpbWVDaHVuayAhPT0gdW5kZWZpbmVkKSA/IHRpbWVDaHVuayA6IG5vdyAtIHRpbWVzdGFtcDtcbiAgICB2YXIgc3RyaW5nID0gXCJcIjtcbiAgICB2YXIgc2VwYXJhdG9yID0gXCIsIFwiO1xuICAgIHZhciBsZXZlbCA9IDA7XG4gICAgdmFyIG1heF9sZXZlbHMgPSAzO1xuICAgIHZhciBtaWxsaV9wZXJfc2Vjb25kID0gMTAwMDtcbiAgICB2YXIgbWlsbGlfcGVyX21pbnV0ZSA9IG1pbGxpX3Blcl9zZWNvbmQgKiA2MDtcbiAgICB2YXIgbWlsbGlfcGVyX2hvdXIgPSBtaWxsaV9wZXJfbWludXRlICogNjA7XG4gICAgdmFyIG1pbGxpX3Blcl9kYXkgPSBtaWxsaV9wZXJfaG91ciAqIDI0O1xuICAgIHZhciBtaWxsaV9wZXJfd2VlayA9IG1pbGxpX3Blcl9kYXkgKiA3O1xuICAgIHZhciBtaWxsaV9wZXJfbW9udGggPSBtaWxsaV9wZXJfd2VlayAqIDQ7XG4gICAgdmFyIG1pbGxpX3Blcl95ZWFyID0gbWlsbGlfcGVyX2RheSAqIDM2NTtcbiAgICBcbiAgICB2YXIgbGV2ZWxzID0gW1xuICAgIFxuICAgICAgICB7IHBsdXJhbDogXCJ5ZWFyc1wiLCBzaW5ndWxhcjogXCJ5ZWFyXCIsIG1zOiBtaWxsaV9wZXJfeWVhciB9LFxuICAgICAgICB7IHBsdXJhbDogXCJtb250aHNcIiwgc2luZ3VsYXI6IFwibW9udGhcIiwgbXM6IG1pbGxpX3Blcl9tb250aCB9LFxuICAgICAgICB7IHBsdXJhbDogXCJ3ZWVrc1wiLCBzaW5ndWxhcjogXCJ3ZWVrXCIsIG1zOiBtaWxsaV9wZXJfd2VlayB9LFxuICAgICAgICB7IHBsdXJhbDogXCJkYXlzXCIsIHNpbmd1bGFyOiBcImRheVwiLCBtczogbWlsbGlfcGVyX2RheSB9LFxuICAgICAgICB7IHBsdXJhbDogXCJob3Vyc1wiLCBzaW5ndWxhcjogXCJob3VyXCIsIG1zOiBtaWxsaV9wZXJfaG91ciB9LFxuICAgICAgICB7IHBsdXJhbDogXCJtaW51dGVzXCIsIHNpbmd1bGFyOiBcIm1pbnV0ZVwiLCBtczogbWlsbGlfcGVyX21pbnV0ZSB9LFxuICAgICAgICB7IHBsdXJhbDogXCJzZWNvbmRzXCIsIHNpbmd1bGFyOiBcInNlY29uZFwiLCBtczogbWlsbGlfcGVyX3NlY29uZCB9XG4gICAgXTtcbiAgICBcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCByZW1haW5pbmcgPCBsZXZlbHNbaV0ubXMgKSBjb250aW51ZTtcbiAgICAgICAgbGV2ZWwrKztcbiAgICAgICAgdmFyIG51bSA9IE1hdGguZmxvb3IoIHJlbWFpbmluZyAvIGxldmVsc1tpXS5tcyApO1xuICAgICAgICB2YXIgbGFiZWwgPSBudW0gPT0gMSA/IGxldmVsc1tpXS5zaW5ndWxhciA6IGxldmVsc1tpXS5wbHVyYWwgO1xuICAgICAgICBzdHJpbmcgKz0gbnVtICsgXCIgXCIgKyBsYWJlbCArIHNlcGFyYXRvcjtcbiAgICAgICAgcmVtYWluaW5nICU9IGxldmVsc1tpXS5tcztcbiAgICAgICAgaWYgKCBsZXZlbCA+PSBtYXhfbGV2ZWxzICkgYnJlYWs7XG4gICAgfTtcbiAgICBcbiAgICBzdHJpbmcgPSBzdHJpbmcuc3Vic3RyaW5nKDAsIHN0cmluZy5sZW5ndGggLSBzZXBhcmF0b3IubGVuZ3RoKTtcbiAgICByZXR1cm4gc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBjb21tYUdyb3Vwcyh2YWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IHgudG9TdHJpbmcoKS5zcGxpdChcIi5cIik7XG4gICAgcGFydHNbMF0gPSBwYXJ0c1swXS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCBcIixcIik7XG4gICAgcmV0dXJuIHBhcnRzLmpvaW4oXCIuXCIpO1xufVxuXG5leHBvcnRzLnRpbWVTaW5jZSA9IHRpbWVTaW5jZTtcbmV4cG9ydHMuY29tbWFHcm91cHMgPSBjb21tYUdyb3VwczsiXX0=
;