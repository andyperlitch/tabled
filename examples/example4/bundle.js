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
            collection: this.columns
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
        this.listenTo(this.config, "change:max_rows", this.renderBody);
        this.listenTo(this.columns, "change:comparator", this.updateComparator);
        this.listenTo(this.columns, "sort", this.onColumnSort);
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
        if (colsorts !== undefined) {
            this.columns.col_sorts = colsorts;
            this.columns.sort();
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
        // Setup subviews
        this.subview("th_row", new ThRow({ collection: this.collection }));
        
        if (this.needsFilterRow()) {
            this.subview("filter_row", new FilterRow({ collection: this.collection }));
        }
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
        evt.preventDefault();
        evt.originalEvent.preventDefault();
        // normalize webkit/firefox scroll values
        var deltaY = -evt.originalEvent.wheelDeltaY || evt.originalEvent.deltaY * 100;
        var movement = Math.round(deltaY / 100);
        if (isNaN(movement)) return;
        var origOffset = this.config.get("offset");
        var limit = this.config.get("max_rows");
        var offset = Math.min( this.collection.length - limit, Math.max( 0, origOffset + movement));
        
        this.config.set({"offset": offset}, {validate: true} );
    }
    
});
exports = module.exports = Tbody;
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
    var $ret = $('<div class="cell-inner"><input type="checkbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        var selected = !! $cb.is(":checked");
        model[select_key] = selected;
        model.trigger('change_selected', model, selected);
        if (model.collection) model.collection.trigger('change_selected');
    })
    
    return $ret;
}
},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1RoZWFkLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9TY3JvbGxlci5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvVGJvZHkuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0ZpbHRlcnMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1NvcnRzLmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Gb3JtYXRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFRhYmxlZCA9IHJlcXVpcmUoJy4uLy4uLycpO1xuXG5mdW5jdGlvbiBpbmNoZXMyZmVldChpbmNoZXMsIG1vZGVsKXtcbiAgICB2YXIgZmVldCA9IE1hdGguZmxvb3IoaW5jaGVzLzEyKTtcbiAgICB2YXIgaW5jaGVzID0gaW5jaGVzICUgMTI7XG4gICAgcmV0dXJuIGZlZXQgKyBcIidcIiArIGluY2hlcyArICdcIic7XG59XG5cbmZ1bmN0aW9uIGZlZXRfZmlsdGVyKHRlcm0sIHZhbHVlLCBmb3JtYXR0ZWQsIG1vZGVsKSB7XG4gICAgaWYgKHRlcm0gPT0gXCJ0YWxsXCIpIHJldHVybiB2YWx1ZSA+IDcwO1xuICAgIGlmICh0ZXJtID09IFwic2hvcnRcIikgcmV0dXJuIHZhbHVlIDwgNjk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjb2x1bW5zID0gW1xuICAgIHsgaWQ6IFwic2VsZWN0b3JcIiwga2V5OiBcInNlbGVjdGVkXCIsIGxhYmVsOiBcIlwiLCBzZWxlY3Q6IHRydWUsIHdpZHRoOiAzMCwgbG9ja193aWR0aDogdHJ1ZSB9LFxuICAgIHsgaWQ6IFwiSURcIiwga2V5OiBcImlkXCIsIGxhYmVsOiBcIklEXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiZmlyc3RfbmFtZVwiLCBrZXk6IFwiZmlyc3RfbmFtZVwiLCBsYWJlbDogXCJGaXJzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwibGFzdF9uYW1lXCIsIGtleTogXCJsYXN0X25hbWVcIiwgbGFiZWw6IFwiTGFzdCBOYW1lXCIsIHNvcnQ6IFwic3RyaW5nXCIsIGZpbHRlcjogXCJsaWtlXCIsICB9LFxuICAgIHsgaWQ6IFwiYWdlXCIsIGtleTogXCJhZ2VcIiwgbGFiZWw6IFwiQWdlXCIsIHNvcnQ6IFwibnVtYmVyXCIsIGZpbHRlcjogXCJudW1iZXJcIiB9LFxuICAgIHsgaWQ6IFwiaGVpZ2h0XCIsIGtleTogXCJoZWlnaHRcIiwgbGFiZWw6IFwiSGVpZ2h0XCIsIGZvcm1hdDogaW5jaGVzMmZlZXQsIGZpbHRlcjogZmVldF9maWx0ZXIsIHNvcnQ6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcIndlaWdodFwiLCBrZXk6IFwid2VpZ2h0XCIsIGxhYmVsOiBcIldlaWdodFwiLCBmaWx0ZXI6IFwibnVtYmVyXCIsIHNvcnQ6IFwibnVtYmVyXCIgfVxuXTtcbnZhciBjb2xsZWN0aW9uID0gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oW10pO1xudmFyIHRhYmxlZCA9IG5ldyBUYWJsZWQoe1xuICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb24sXG4gICAgY29sdW1uczogY29sdW1ucyxcbiAgICB0YWJsZV93aWR0aDogODAwICAgIFxufSk7XG52YXIgJHBnID0gJChcIiNwbGF5Z3JvdW5kXCIpO1xudGFibGVkLnJlbmRlcigpLiRlbC5hcHBlbmRUbygkcGcpO1xuXG5mdW5jdGlvbiBnZW5Sb3coaWQpe1xuICAgIFxuICAgIHZhciBmbmFtZXMgPSBbXG4gICAgICAgIFwiam9lXCIsXG4gICAgICAgIFwiZnJlZFwiLFxuICAgICAgICBcImZyYW5rXCIsXG4gICAgICAgIFwiamltXCIsXG4gICAgICAgIFwibWlrZVwiLFxuICAgICAgICBcImdhcnlcIixcbiAgICAgICAgXCJheml6XCJcbiAgICBdO1xuXG4gICAgdmFyIGxuYW1lcyA9IFtcbiAgICAgICAgXCJzdGVybGluZ1wiLFxuICAgICAgICBcInNtaXRoXCIsXG4gICAgICAgIFwiZXJpY2tzb25cIixcbiAgICAgICAgXCJidXJrZVwiXG4gICAgXTtcbiAgICBcbiAgICB2YXIgc2VlZCA9IE1hdGgucmFuZG9tKCk7XG4gICAgdmFyIHNlZWQyID0gTWF0aC5yYW5kb20oKTtcbiAgICBcbiAgICB2YXIgZmlyc3RfbmFtZSA9IGZuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChmbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgdmFyIGxhc3RfbmFtZSA9IGxuYW1lc1sgTWF0aC5yb3VuZCggc2VlZCAqIChsbmFtZXMubGVuZ3RoIC0xKSApIF07XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IGlkLFxuICAgICAgICBzZWxlY3RlZDogZmFsc2UsXG4gICAgICAgIGZpcnN0X25hbWU6IGZpcnN0X25hbWUsXG4gICAgICAgIGxhc3RfbmFtZTogbGFzdF9uYW1lLFxuICAgICAgICBhZ2U6IE1hdGguY2VpbChzZWVkICogNzUpICsgMTUsXG4gICAgICAgIGhlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAzNiApICsgNDgsXG4gICAgICAgIHdlaWdodDogTWF0aC5yb3VuZCggc2VlZDIgKiAxMzAgKSArIDkwXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZW5Sb3dzKG51bSl7XG4gICAgdmFyIHJldFZhbCA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaSA8IG51bTsgaSsrKSB7XG4gICAgICAgIHJldFZhbC5wdXNoKGdlblJvdyhpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0VmFsO1xufVxuXG53aW5kb3cuc3RvcCA9IGZhbHNlO1xudmFyIGludHZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgaWYgKHdpbmRvdy5zdG9wKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50dmFsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbmV3Um93cyA9IGdlblJvd3MoMzAwKTtcbiAgICB2YXIgbWV0aG9kID0gY29sbGVjdGlvbi5sZW5ndGggPyAnc2V0JyA6ICdyZXNldCcgO1xuICAgIC8vIHZhciBzdGFydFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICBjb2xsZWN0aW9uW21ldGhvZF0obmV3Um93cyk7XG4gICAgLy8gdmFyIGVuZFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAvLyBjb25zb2xlLmxvZygoZW5kVGltZSAtIHN0YXJ0VGltZSkvMTAwMCk7XG4gICAgaWYgKG1ldGhvZCA9PT0gJ3NldCcpIGNvbGxlY3Rpb24udHJpZ2dlcigndXBkYXRlJyk7XG59LCAzMDAwKTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2xpYi9CYXNlVmlldycpO1xudmFyIENvbHVtbiA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLm1vZGVsO1xudmFyIENvbHVtbnMgPSByZXF1aXJlKCcuL2xpYi9Db2x1bW4nKS5jb2xsZWN0aW9uO1xudmFyIFRoZWFkID0gcmVxdWlyZSgnLi9saWIvVGhlYWQnKTtcbnZhciBUYm9keSA9IHJlcXVpcmUoJy4vbGliL1Rib2R5Jyk7XG52YXIgU2Nyb2xsZXIgPSByZXF1aXJlKCcuL2xpYi9TY3JvbGxlcicpO1xuXG52YXIgQ29uZmlnTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIC8vIE1ha2VzIHRhYmxlIHdpZHRoIGFuZCBjb2x1bW4gd2lkdGhzIGFkanVzdGFibGVcbiAgICAgICAgYWRqdXN0YWJsZV93aWR0aDogdHJ1ZSxcbiAgICAgICAgLy8gU2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHRhYmxlIHdpZHRoc1xuICAgICAgICBzYXZlX3N0YXRlOiBmYWxzZSxcbiAgICAgICAgLy8gRGVmYXVsdCBtaW5pbXVtIGNvbHVtbiB3aWR0aCwgaW4gcGl4ZWxzXG4gICAgICAgIG1pbl9jb2x1bW5fd2lkdGg6IDMwLFxuICAgICAgICAvLyBEZWZhdWx0IHdpZHRoIGZvciB0aGUgdGFibGUgaXRzZWxmLiBFaXRoZXIgcGl4ZWxzIG9yICdhdXRvJ1xuICAgICAgICB0YWJsZV93aWR0aDogJ2F1dG8nLFxuICAgICAgICAvLyBEZWZhdWx0IG1heCBudW1iZXIgb2Ygcm93cyB0byByZW5kZXIgYmVmb3JlIHNjcm9sbCBvbiB0Ym9keVxuICAgICAgICBtYXhfcm93czogMzAsXG4gICAgICAgIC8vIERlZmF1bHQgb2Zmc2V0IGZvciB0aGUgdGJvZHlcbiAgICAgICAgb2Zmc2V0OiAwLFxuICAgICAgICAvLyBTZXQgaW4gdGhlIHJlbmRlcmluZyBwaGFzZSBvZiB0aGUgdGJvZHkgKGNvZGUgc21lbGwuLi4pXG4gICAgICAgIHRvdGFsX3Jvd3M6IDBcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBpZiAoIGF0dHJzLm9mZnNldCA+IE1hdGgubWF4KGF0dHJzLm1heF9yb3dzLCBhdHRycy50b3RhbF9yb3dzKSAtIGF0dHJzLm1heF9yb3dzICkge1xuICAgICAgICAgICAgcmV0dXJuIFwiT2Zmc2V0IGNhbm5vdCBiZSB0aGF0IGhpZ2guXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm9mZnNldCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIk9mZnNldCBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dHJzLm1heF9yb3dzIDwgMSkge1xuICAgICAgICAgICAgcmV0dXJuIFwibWF4X3Jvd3MgbXVzdCBhdGxlYXN0IDFcIjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgZ2V0VmlzaWJsZVJvd3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWwgPSAwO1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5nZXQoJ29mZnNldCcpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLmdldCgnbWF4X3Jvd3MnKTtcbiAgICAgICAgdmFyIHJvd3NfdG9fcmVuZGVyID0gW107XG4gICAgICAgIHRoaXMuZ2V0KFwiY29sbGVjdGlvblwiKS5lYWNoKGZ1bmN0aW9uKHJvdywgaSl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdGhpcy5wYXNzZXNGaWx0ZXJzKHJvdykgKSArK3RvdGFsO1xuICAgICAgICAgICAgZWxzZSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICggdG90YWwgPD0gb2Zmc2V0ICkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIHRvdGFsID4gKG9mZnNldCArIGxpbWl0KSApIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcm93c190b19yZW5kZXIucHVzaChyb3cpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHByZXZfdG90YWwgPSB0aGlzLmdldCgndG90YWxfcm93cycpKjE7XG4gICAgICAgIGlmICh0b3RhbCAhPT0gcHJldl90b3RhbCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX3Jvd3MnLCB0b3RhbClcbiAgICAgICAgICAgIHZhciBuZXdPZmZzZXQgPSBNYXRoLm1pbih0b3RhbCAtIGxpbWl0LCBvZmZzZXQpO1xuICAgICAgICAgICAgaWYgKG5ld09mZnNldCA9PT0gb2Zmc2V0KSB0aGlzLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnNldCgnb2Zmc2V0JywgbmV3T2Zmc2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm93c190b19yZW5kZXI7XG4gICAgfSxcbiAgICBwYXNzZXNGaWx0ZXJzOiBmdW5jdGlvbihyb3cpe1xuICAgICAgICByZXR1cm4gdGhpcy5jb2x1bW5zLmV2ZXJ5KGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICBpZiAoY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJykgPT0gXCJcIiB8fCB0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXNzZXNGaWx0ZXIocm93LCBjb2x1bW4pO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9LFxuICAgIFxuICAgIHBhc3Nlc0ZpbHRlcjogZnVuY3Rpb24ocm93LCBjb2x1bW4pe1xuICAgICAgICByZXR1cm4gY29sdW1uLmdldCgnZmlsdGVyJykoIGNvbHVtbi5nZXQoJ2ZpbHRlcl92YWx1ZScpLCByb3cuZ2V0KGNvbHVtbi5nZXQoJ2tleScpKSwgY29sdW1uLmdldEZvcm1hdHRlZChyb3cpLCByb3cgKTtcbiAgICB9LFxufSk7XG5cbnZhciBUYWJsZWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuICAgICAgICAvLyBFbnN1cmUgdGhhdCB0aGlzLmNvbGxlY3Rpb24gKHRoZSBkYXRhKSBpcyBhIGJhY2tib25lIGNvbGxlY3Rpb25cbiAgICAgICAgaWYgKCAhKHRoaXMuY29sbGVjdGlvbiBpbnN0YW5jZW9mIEJhY2tib25lLkNvbGxlY3Rpb24pICkgdGhyb3cgXCJUYWJsZWQgbXVzdCBiZSBwcm92aWRlZCB3aXRoIGEgYmFja2JvbmUgY29sbGVjdGlvbiBhcyBpdHMgZGF0YVwiO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlnIG9iamVjdFxuICAgICAgICB0aGlzLmNvbmZpZyA9IG5ldyBDb25maWdNb2RlbCh0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIC8vIENvbHVtbnNcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gbmV3IENvbHVtbnModGhpcy5jb25maWcuZ2V0KFwiY29sdW1uc1wiKSx7Y29uZmlnOiB0aGlzLmNvbmZpZ30pO1xuICAgICAgICB0aGlzLmNvbmZpZy5jb2x1bW5zID0gdGhpcy5jb2x1bW5zO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhlYWRcIiwgbmV3IFRoZWFkKHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuc3VidmlldyhcInRib2R5XCIsIG5ldyBUYm9keSh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoJ3Njcm9sbGVyJywgbmV3IFNjcm9sbGVyKHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgIHRib2R5OiB0aGlzLnN1YnZpZXcoJ3Rib2R5JylcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGVcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldChcInNhdmVfc3RhdGVcIikpIHtcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZVByZXZpb3VzU3RhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuZXJzXG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTp3aWR0aFwiLCB0aGlzLm9uV2lkdGhDaGFuZ2UgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmZpbHRlcl92YWx1ZVwiLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc2V0KFwib2Zmc2V0XCIsIDApO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJCb2R5KCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29uZmlnLCBcImNoYW5nZTptYXhfcm93c1wiLCB0aGlzLnJlbmRlckJvZHkpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6Y29tcGFyYXRvclwiLCB0aGlzLnVwZGF0ZUNvbXBhcmF0b3IpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJzb3J0XCIsIHRoaXMub25Db2x1bW5Tb3J0KTtcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiBbXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFibGVkLWN0bnJcIj48ZGl2IGNsYXNzPVwidGFibGVkLWlubmVyXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0YWJsZWRcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRoZWFkXCI+PC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0Ym9keS1vdXRlclwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGJvZHlcIj48L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInNjcm9sbGVyXCI+PC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicmVzaXplLXRhYmxlXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PjxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PjxkaXYgY2xhc3M9XCJyZXNpemUtZ3JpcFwiPjwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PjwvZGl2PidcbiAgICBdLmpvaW4oXCJcIiksXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgbWFya3VwXG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIC8vIFNldCB0aGUgd2lkdGhzIG9mIHRoZSBjb2x1bW5zXG4gICAgICAgIHRoaXMuc2V0V2lkdGhzKCk7XG4gICAgICAgIC8vIChSZSlyZW5kZXIgc3Vidmlld3NcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50aGVhZCc6ICd0aGVhZCcsXG4gICAgICAgICAgICAnLnRib2R5JzogJ3Rib2R5JyxcbiAgICAgICAgICAgICcuc2Nyb2xsZXInOiAnc2Nyb2xsZXInXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXJCb2R5OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRib2R5JzogJ3Rib2R5JyxcbiAgICAgICAgICAgICcuc2Nyb2xsZXInOiAnc2Nyb2xsZXInXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVySGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50aGVhZCc6ICd0aGVhZCdcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICBvbldpZHRoQ2hhbmdlOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFkanVzdElubmVyRGl2KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHRoZSB3aWR0aHNcbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5nZXQoXCJzYXZlX3N0YXRlXCIpKSByZXR1cm47XG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIG1lbW9bY29sdW1uLmdldCgnaWQnKV0gPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH0sIHt9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSgnY29sdW1uX3dpZHRocycsIHdpZHRocyk7XG4gICAgfSxcbiAgICBcbiAgICBvbkNvbHVtblNvcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzb3J0XG4gICAgICAgIGlmICghdGhpcy5jb25maWcuZ2V0KFwic2F2ZV9zdGF0ZVwiKSkgcmV0dXJuO1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbHVtbnMuY29sX3NvcnRzO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnLCBzb3J0cyk7XG4gICAgfSxcbiAgICBcbiAgICBzZXRXaWR0aHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gVGFibGUncyB3aWR0aFxuICAgICAgICB2YXIgdG90YWxXaWR0aCA9IHRoaXMuY29uZmlnLmdldChcInRhYmxlX3dpZHRoXCIpID09PSAnYXV0bycgPyB0aGlzLiRlbC53aWR0aCgpIDogdGhpcy5jb25maWcuZ2V0KFwidGFibGVfd2lkdGhcIik7XG4gICAgICAgIHZhciBtYWtlRGVmYXVsdCA9IFtdO1xuICAgICAgICB2YXIgYWRqdXN0ZWRXaWR0aCA9IDA7XG4gICAgICAgIHRoaXMuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciBjb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIG1pbl9jb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJylcbiAgICAgICAgICAgIGlmICggY29sX3dpZHRoICkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gY29sX3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWluX2NvbF93aWR0aCkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gbWluX2NvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgbWFrZURlZmF1bHQucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBhdmdfd2lkdGggPSBtYWtlRGVmYXVsdC5sZW5ndGggPyB0b3RhbFdpZHRoL21ha2VEZWZhdWx0Lmxlbmd0aCA6IDAgO1xuICAgICAgICB2YXIgZGVmYXVsdFdpZHRoID0gTWF0aC5tYXgoTWF0aC5mbG9vcihhdmdfd2lkdGgpLCB0aGlzLmNvbmZpZy5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpKSA7XG4gICAgICAgIG1ha2VEZWZhdWx0LmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gTWF0aC5tYXgoZGVmYXVsdFdpZHRoLCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJykgfHwgZGVmYXVsdFdpZHRoKTtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoJ3dpZHRoJywgd2lkdGgpO1xuICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSB3aWR0aDtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIHRoaXMuJGVsLndpZHRoKGFkanVzdGVkV2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0SW5uZXJEaXY6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpIHx8IGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vKjEgKyB3aWR0aCoxO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgdGhpcy4kKCcudGFibGVkLWlubmVyJykud2lkdGgod2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdtb3VzZWRvd24gLnJlc2l6ZS10YWJsZSc6ICdncmFiVGFibGVSZXNpemVyJ1xuICAgIH0sXG4gICAgXG4gICAgZ3JhYlRhYmxlUmVzaXplcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9yaXpvbnRhbFxuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBjb2xfc3RhdGUgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwgaW5kZXgpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSx7fSx0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZlcnRpY2FsIFxuICAgICAgICB2YXIgbW91c2VZID0gZXZ0LmNsaWVudFk7XG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gJChcIi50clwiLCB0aGlzLiRlbCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBpbml0TWF4ID0gdGhpcy5jb25maWcuZ2V0KCdtYXhfcm93cycpO1xuICAgICAgICBcbiAgICAgICAgdmFyIHRhYmxlX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgICAgICAvLyBIb3Jpem9udGFsXG4gICAgICAgICAgICB2YXIgY2hhbmdlWCA9IChldnQuY2xpZW50WCAtIG1vdXNlWCkvc2VsZi5jb2x1bW5zLmxlbmd0aDtcbiAgICAgICAgICAgIHNlbGYuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOmNvbF9zdGF0ZVtjb2x1bW4uZ2V0KFwiaWRcIildKjErY2hhbmdlWH0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmVydGljYWxcbiAgICAgICAgICAgIHZhciBjaGFuZ2VZID0gKGV2dC5jbGllbnRZIC0gbW91c2VZKTtcbiAgICAgICAgICAgIHZhciBhYkNoYW5nZVkgPSBNYXRoLmFicyhjaGFuZ2VZKTtcbiAgICAgICAgICAgIGlmICggYWJDaGFuZ2VZID4gcm93X2hlaWdodCkge1xuICAgICAgICAgICAgICAgIGFiQ2hhbmdlWSA9IE1hdGguZmxvb3IoYWJDaGFuZ2VZL3Jvd19oZWlnaHQpICogKGNoYW5nZVkgPiAwID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICBzZWxmLmNvbmZpZy5zZXQoeydtYXhfcm93cyc6aW5pdE1heCArIGFiQ2hhbmdlWX0sIHt2YWxpZGF0ZTp0cnVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCB0YWJsZV9yZXNpemUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ29tcGFyYXRvcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSBmbjtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB0aGlzLmNvbGxlY3Rpb24uc29ydCgpO1xuICAgIH0sXG4gICAgXG4gICAgcmVzdG9yZVByZXZpb3VzU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBDaGVjayB3aWR0aHNcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnKTtcbiAgICAgICAgaWYgKHdpZHRocyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBfLmVhY2god2lkdGhzLCBmdW5jdGlvbih2YWwsIGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmdldChrZXkpLnNldCgnd2lkdGgnLCB2YWwpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBjb2x1bW4gc29ydCBvcmRlclxuICAgICAgICB2YXIgY29sc29ydHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnKTtcbiAgICAgICAgaWYgKGNvbHNvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29sdW1ucy5jb2xfc29ydHMgPSBjb2xzb3J0cztcbiAgICAgICAgICAgIHRoaXMuY29sdW1ucy5zb3J0KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHN0YXRlOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlX2tleSA9ICd0YWJsZWQuJyt0aGlzLmNvbmZpZy5nZXQoXCJpZFwiKTtcbiAgICAgICAgdmFyIHN0b3JlID0gdGhpcy5zdG9yZSB8fCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShzdG9yYWdlX2tleSkgfHwge307XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHN0b3JlICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0b3JlID0gSlNPTi5wYXJzZShzdG9yZSk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzdG9yZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkoc3RvcmUpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHN0b3JlW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYWJsZWQiLCJ2YXIgQmFzZVZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgLy8gQXNzaWducyBhIHN1YnZpZXcgdG8gYSBqcXVlcnkgc2VsZWN0b3IgaW4gdGhpcyB2aWV3J3MgZWxcbiAgICBhc3NpZ24gOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHZpZXcpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9ycztcbiAgICAgICAgaWYgKF8uaXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSBzZWxlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdG9ycyA9IHt9O1xuICAgICAgICAgICAgc2VsZWN0b3JzW3NlbGVjdG9yXSA9IHZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZWxlY3RvcnMpIHJldHVybjtcbiAgICAgICAgXy5lYWNoKHNlbGVjdG9ycywgZnVuY3Rpb24gKHZpZXcsIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZpZXcgPT09IFwic3RyaW5nXCIpIHZpZXcgPSB0aGlzLl9fc3Vidmlld3NfX1t2aWV3XTtcbiAgICAgICAgICAgIHZpZXcuc2V0RWxlbWVudCh0aGlzLiQoc2VsZWN0b3IpKS5yZW5kZXIoKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwicmVtb3ZhbFwiKTtcbiAgICAgICAgdGhpcy51bmJpbmQoKTtcbiAgICAgICAgQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVtb3ZlLmNhbGwodGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICBzdWJ2aWV3OiBmdW5jdGlvbihrZXksIHZpZXcpe1xuICAgICAgICAvLyBTZXQgdXAgc3VidmlldyBvYmplY3RcbiAgICAgICAgdmFyIHN2ID0gdGhpcy5fX3N1YnZpZXdzX18gPSB0aGlzLl9fc3Vidmlld3NfXyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGdldHRpbmdcbiAgICAgICAgaWYgKHZpZXcgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHN2W2tleV07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbGlzdGVuZXIgZm9yIHJlbW92YWwgZXZlbnRcbiAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBrZXlcbiAgICAgICAgc3Zba2V5XSA9IHZpZXc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbGxvdyBjaGFpbmluZ1xuICAgICAgICByZXR1cm4gdmlld1xuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldyIsInZhciBGaWx0ZXJzID0gcmVxdWlyZShcIi4vRmlsdGVyc1wiKTtcbnZhciBTb3J0cyA9IHJlcXVpcmUoXCIuL1NvcnRzXCIpO1xudmFyIEZvcm1hdHMgPSByZXF1aXJlKFwiLi9Gb3JtYXRzXCIpO1xudmFyIENvbHVtbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGtleTogXCJcIixcbiAgICAgICAgbGFiZWw6IFwiXCIsXG4gICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgZmlsdGVyOiB1bmRlZmluZWQsXG4gICAgICAgIGZvcm1hdDogdW5kZWZpbmVkLFxuICAgICAgICBzZWxlY3Q6IGZhbHNlLFxuICAgICAgICBmaWx0ZXJfdmFsdWU6IFwiXCIsXG4gICAgICAgIHNvcnRfdmFsdWU6IFwiXCIsXG4gICAgICAgIGxvY2tfd2lkdGg6IGZhbHNlXG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbHRlclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhpcy5nZXQoXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInN0cmluZ1wiICYmIEZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmaWx0ZXJcIiwgRmlsdGVyc1tmaWx0ZXJdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNvcnRcbiAgICAgICAgdmFyIHNvcnQgPSB0aGlzLmdldChcInNvcnRcIik7XG4gICAgICAgIGlmICh0eXBlb2Ygc29ydCA9PT0gXCJzdHJpbmdcIiAmJiBTb3J0cy5oYXNPd25Qcm9wZXJ0eShzb3J0KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzb3J0XCIsIFNvcnRzW3NvcnRdKHRoaXMuZ2V0KFwia2V5XCIpKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBmb3JtYXRcbiAgICAgICAgdmFyIHNlbGVjdCA9IHRoaXMuZ2V0KCdzZWxlY3QnKTtcbiAgICAgICAgaWYgKHNlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0cy5zZWxlY3QgKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic2VsZWN0X2tleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSlNPTigpO1xuICAgIH0sXG4gICAgXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAoYXR0cnMud2lkdGggPCBhdHRycy5taW5fY29sdW1uX3dpZHRoKSByZXR1cm4gXCJBIGNvbHVtbiB3aWR0aCBjYW5ub3QgYmUgPT4gMFwiO1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLmxvY2tfd2lkdGggPT09IHRydWUgJiYgYXR0cnMud2lkdGggPiAwKSByZXR1cm4gXCJUaGlzIGNvbHVtbiBoYXMgYSBsb2NrZWQgd2lkdGhcIjtcbiAgICAgICAgXG4gICAgfSxcbiAgICBcbiAgICBnZXRLZXk6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC5nZXQodGhpcy5nZXQoJ2tleScpKTtcbiAgICB9LFxuICAgIFxuICAgIGdldEZvcm1hdHRlZDogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgdmFyIGZuID0gdGhpcy5nZXQoJ2Zvcm1hdCcpO1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgICAgPyBmbih0aGlzLmdldEtleShtb2RlbCksIG1vZGVsKVxuICAgICAgICAgICAgOiB0aGlzLmdldEtleShtb2RlbCk7XG4gICAgfSxcbiAgICBcbiAgICBzb3J0SW5kZXg6IGZ1bmN0aW9uKG5ld0luZGV4KSB7XG4gICAgICAgIHZhciBzb3J0cyA9IHRoaXMuY29sbGVjdGlvbi5jb2xfc29ydHM7XG4gICAgICAgIGlmICh0eXBlb2YgbmV3SW5kZXggPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBzb3J0cy5pbmRleE9mKHRoaXMuZ2V0KFwiaWRcIikpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cklkeCA9IHRoaXMuc29ydEluZGV4KCk7XG4gICAgICAgIHZhciBpZCA9IHNvcnRzLnNwbGljZShjdXJJZHgsIDEpWzBdO1xuICAgICAgICBzb3J0cy5zcGxpY2UobmV3SW5kZXgsIDAsIGlkKTtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9XG4gICAgXG59KTtcblxudmFyIENvbHVtbnMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgXG4gICAgbW9kZWw6IENvbHVtbixcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICAgICAgXy5lYWNoKG1vZGVscywgdGhpcy5zZXRNaW5XaWR0aCwgdGhpcyk7XG4gICAgICAgIHRoaXMucm93X3NvcnRzID0gdGhpcy5nZXRJbml0aWFsUm93U29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5jb2xfc29ydHMgPSB0aGlzLmdldEluaXRpYWxDb2xTb3J0cyhtb2RlbHMpO1xuICAgICAgICB0aGlzLm9uKFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5vblNvcnRDaGFuZ2UpO1xuICAgIH0sXG4gICAgXG4gICAgY29tcGFyYXRvcjogZnVuY3Rpb24oY29sMSwgY29sMikge1xuICAgICAgICB2YXIgaWR4MSA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMS5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHZhciBpZHgyID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wyLmdldChcImlkXCIpKTtcbiAgICAgICAgcmV0dXJuIGlkeDEgLSBpZHgyO1xuICAgIH0sXG4gICAgXG4gICAgc2V0TWluV2lkdGg6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIGlmIChtb2RlbC5oYXNPd25Qcm9wZXJ0eSgnbWluX2NvbHVtbl93aWR0aCcpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBtb2RlbFsnbWluX2NvbHVtbl93aWR0aCddID0gdGhpcy5jb25maWcuZ2V0KFwibWluX2NvbHVtbl93aWR0aFwiKTtcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxSb3dTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5nZXQoXCJyb3dfc29ydHNcIikpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5jb25maWcuZ2V0KFwicm93X3NvcnRzXCIpO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdyb3dfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gXy5yZWR1Y2UobW9kZWxzLGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7IFxuICAgICAgICAgICAgICAgIGlmIChjb2x1bW5bJ3NvcnRfdmFsdWUnXSkgXG4gICAgICAgICAgICAgICAgICAgIG1lbW8ucHVzaChjb2x1bW5bXCJpZFwiXSk7IFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICAgICAgfSxbXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvcnRzO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SW5pdGlhbENvbFNvcnRzOiBmdW5jdGlvbihtb2RlbHMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmYXVsdFNvcnRzID0gXy5wbHVjayhtb2RlbHMsIFwiaWRcIik7XG4gICAgICAgIHZhciBzb3J0cztcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmdldChcImNvbF9zb3J0c1wiKSkge1xuICAgICAgICAgICAgc29ydHMgPSB0aGlzLmNvbmZpZy5nZXQoXCJjb2xfc29ydHNcIik7XG4gICAgICAgICAgICBpZiAoICEgKF8uZXZlcnkoc29ydHMsIGZ1bmN0aW9uKHNvcnQpIHsgcmV0dXJuIGRlZmF1bHRTb3J0cy5pbmRleE9mKHNvcnQpID4gLTEgfSkpICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9uZSBvciBtb3JlIHZhbHVlcyBpbiB0aGUgJ2NvbF9zb3J0cycgb3B0aW9uIGRvZXMgbm90IG1hdGNoIGEgY29sdW1uIGlkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ydHMgPSBkZWZhdWx0U29ydHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvcnRzO1xuICAgIH0sXG4gICAgXG4gICAgb25Tb3J0Q2hhbmdlOiBmdW5jdGlvbihtb2RlbCwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGlkID0gbW9kZWwuZ2V0KFwiaWRcIik7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMucm93X3NvcnRzLmluZGV4T2YoaWQpO1xuICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHRoaXMucm93X3NvcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZUNvbXBhcmF0b3IoKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5yb3dfc29ydHMubGVuZ3RoICE9PSAwKXtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBjb21wYXJhdG9yID0gZnVuY3Rpb24ocm93MSwgcm93Mikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNlbGYucm93X3NvcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpZCA9IHNlbGYucm93X3NvcnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uID0gc2VsZi5nZXQoaWQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBjb2x1bW4uZ2V0KFwic29ydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gY29sdW1uLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0X3Jlc3VsdCA9IHZhbHVlID09IFwiYVwiID8gZm4ocm93MSwgcm93MikgOiBmbihyb3cyLCByb3cxKSA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0X3Jlc3VsdCAhPSAwKSByZXR1cm4gc29ydF9yZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2U6Y29tcGFyYXRvclwiLCBjb21wYXJhdG9yKTtcbiAgICB9XG4gICAgXG59KTtcblxuZXhwb3J0cy5tb2RlbCA9IENvbHVtbjtcbmV4cG9ydHMuY29sbGVjdGlvbiA9IENvbHVtbnM7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGhDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0aCcsXG4gICAgXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCIgdGl0bGU9XCI8JT0gbGFiZWwgJT5cIj48c3BhbiBjbGFzcz1cInRoLWhlYWRlclwiPjwlPSBsYWJlbCAlPjwvc3Bhbj48L2Rpdj48JSBpZihsb2NrX3dpZHRoICE9PSB0cnVlKSB7JT48c3BhbiBjbGFzcz1cInJlc2l6ZVwiPjwvc3Bhbj48JX0lPicpLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5yZW5kZXIgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihtb2RlbCwgd2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIganNvbiA9IHRoaXMubW9kZWwuc2VyaWFsaXplKCk7XG4gICAgICAgIHZhciBzb3J0X2NsYXNzID0ganNvbi5zb3J0X3ZhbHVlID8gKGpzb24uc29ydF92YWx1ZSA9PSBcImRcIiA/IFwiZGVzY1wiIDogXCJhc2NcIiApIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FzYyBkZXNjJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY29sLScranNvbi5pZCtcIiBcIitzb3J0X2NsYXNzKVxuICAgICAgICAgICAgLndpZHRoKGpzb24ud2lkdGgpXG4gICAgICAgICAgICAuaHRtbCh0aGlzLnRlbXBsYXRlKGpzb24pKTtcbiAgICAgICAgaWYgKHNvcnRfY2xhc3MgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi50aC1oZWFkZXJcIikucHJlcGVuZCgnPGkgY2xhc3M9XCInK3NvcnRfY2xhc3MrJy1pY29uXCI+PC9pPiAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAucmVzaXplXCI6IFwiZ3JhYlJlc2l6ZXJcIixcbiAgICAgICAgXCJkYmxjbGljayAucmVzaXplXCI6IFwiZml0VG9Db250ZW50XCIsXG4gICAgICAgIFwibW91c2V1cCAudGgtaGVhZGVyXCI6IFwiY2hhbmdlQ29sdW1uU29ydFwiLFxuICAgICAgICBcIm1vdXNlZG93blwiOiBcImdyYWJDb2x1bW5cIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbHVtbldpZHRoID0gdGhpcy5tb2RlbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgLy8gSGFuZGxlciBmb3Igd2hlbiBtb3VzZSBpcyBtb3ZpbmdcbiAgICAgICAgdmFyIGNvbF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLm1vZGVsO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGV2dC5jbGllbnRYIC0gbW91c2VYO1xuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gY29sdW1uV2lkdGggKyBjaGFuZ2U7XG4gICAgICAgICAgICBpZiAoIG5ld1dpZHRoIDwgY29sdW1uLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIikpIHJldHVybjtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjogbmV3V2lkdGh9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgZml0VG9Db250ZW50OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IDA7XG4gICAgICAgIHZhciBtaW5fd2lkdGggPSB0aGlzLm1vZGVsLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKTtcbiAgICAgICAgdmFyICRjdHggPSB0aGlzLiRlbC5wYXJlbnRzKCcudGFibGVkJykuZmluZCgnLnRib2R5Jyk7XG4gICAgICAgICQoXCIudGQuY29sLVwiK2lkK1wiIC5jZWxsLWlubmVyXCIsICRjdHgpLmVhY2goZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgbmV3X3dpZHRoID0gTWF0aC5tYXgobmV3X3dpZHRoLCQodGhpcykub3V0ZXJXaWR0aCh0cnVlKSwgbWluX3dpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnd2lkdGgnOm5ld193aWR0aH0se3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgfSxcbiAgICBcbiAgICBjaGFuZ2VDb2x1bW5Tb3J0OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG1vZGVsLmdldChcInNvcnRcIikgIT09IFwiZnVuY3Rpb25cIiB8fCBtb2RlbC5nZXQoXCJtb3ZpbmdcIikgPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJfc29ydCA9IG1vZGVsLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2dC5zaGlmdEtleSkge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBhbGwgc29ydHNcbiAgICAgICAgICAgIG1vZGVsLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2wpe1xuICAgICAgICAgICAgICAgIGlmIChjb2wgIT09IG1vZGVsKSBjb2wuc2V0KHtcInNvcnRfdmFsdWVcIjogXCJcIn0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoKGN1cl9zb3J0KSB7XG4gICAgICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImFcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYVwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBncmFiQ29sdW1uOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBvZmZzZXRYID0gZXZ0Lm9mZnNldFg7XG4gICAgICAgIHZhciB0aHJlc2hvbGRzID0gW107XG4gICAgICAgIHZhciBjdXJyZW50SWR4ID0gdGhpcy5tb2RlbC5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyICR0ciA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAkdHIuZmluZCgnLnRoJykuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJHRoaXMub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgIHZhciBoYWxmID0gJHRoaXMud2lkdGgoKSAvIDI7XG4gICAgICAgICAgICBpZiAoaSAhPSBjdXJyZW50SWR4KSB0aHJlc2hvbGRzLnB1c2gob2Zmc2V0K2hhbGYpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByZXZlbnRfbW91c2V1cCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGdldE5ld0luZGV4ID0gZnVuY3Rpb24ocG9zKSB7XG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHRocmVzaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdGhyZXNob2xkc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocG9zID4gdmFsKSBuZXdJZHgrKztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBuZXdJZHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGRyYXdIZWxwZXIgPSBmdW5jdGlvbihuZXdJZHgpIHtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGlmIChuZXdJZHggPT0gY3VycmVudElkeCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG5ld0lkeCA8IGN1cnJlbnRJZHggPyAnYmVmb3JlJyA6ICdhZnRlcic7XG4gICAgICAgICAgICAkdHIuZmluZCgnLnRoOmVxKCcrbmV3SWR4KycpJylbbWV0aG9kXSgnPGRpdiBjbGFzcz1cImNvbHNvcnQtaGVscGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlX2NvbHVtbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzpjaGFuZ2UsICdvcGFjaXR5JzowLjUsICd6SW5kZXgnOiAxMH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpO1xuICAgICAgICAgICAgZHJhd0hlbHBlcihuZXdJZHgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xlYW51cF9tb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzogMCwgJ29wYWNpdHknOjF9KTtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zb3J0SW5kZXgoZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpKTtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9tb3ZlKVxuICAgIH1cbn0pO1xuXG52YXIgVGhSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBUaENlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsIClcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IGNsYXNzPVwiZmlsdGVyXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiZmlsdGVyXCIgLz48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXInKTtcbiAgICAgICAgdmFyIG1hcmt1cCA9IHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy50ZW1wbGF0ZSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygndGQgY29sLScrdGhpcy5tb2RlbC5nZXQoJ2lkJykpLndpZHRoKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbChtYXJrdXApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcImNsaWNrIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJcIixcbiAgICAgICAgXCJrZXl1cCAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyRGVsYXllZFwiXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgnZmlsdGVyX3ZhbHVlJywgJC50cmltKHRoaXMuJCgnLmZpbHRlcicpLnZhbCgpKSApO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyRGVsYXllZDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpXG4gICAgICAgIHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXIuYmluZCh0aGlzLCBldnQpLCAyMDApO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyUm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjbGVhciBpdFxuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJyZW1vdmFsXCIpXG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBGaWx0ZXJDZWxsKHsgbW9kZWw6IGNvbHVtbiB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggdmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBUaGVhZCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAvLyBTZXR1cCBzdWJ2aWV3c1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0aF9yb3dcIiwgbmV3IFRoUm93KHsgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uIH0pKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm5lZWRzRmlsdGVyUm93KCkpIHtcbiAgICAgICAgICAgIHRoaXMuc3VidmlldyhcImZpbHRlcl9yb3dcIiwgbmV3IEZpbHRlclJvdyh7IGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbiB9KSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInRyIHRoLXJvd1wiPjwvZGl2PjxkaXYgY2xhc3M9XCJ0ciBmaWx0ZXItcm93XCI+PC9kaXY+JyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLmFzc2lnbih7ICcudGgtcm93JyA6ICd0aF9yb3cnIH0pO1xuICAgICAgICBpZiAodGhpcy5zdWJ2aWV3KCdmaWx0ZXJfcm93JykpIHtcbiAgICAgICAgICAgIHRoaXMuYXNzaWduKHsgJy5maWx0ZXItcm93JyA6ICdmaWx0ZXJfcm93JyB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHRoaXMuJCgnLmZpbHRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBuZWVkc0ZpbHRlclJvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uc29tZShmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09ICd1bmRlZmluZWQnKVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbn0pO1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGhlYWQ7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xudmFyIFNjcm9sbGVyID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6b2Zmc2V0XCIsIHRoaXMudXBkYXRlUG9zaXRpb24pO1xuICAgICAgICB0aGlzLmxpc3RlblRvKG9wdGlvbnMudGJvZHksIFwicmVuZGVyZWRcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sICAgIFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImlubmVyXCI+PC9kaXY+JyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5tb2RlbC5nZXQoJ29mZnNldCcpO1xuICAgICAgICB2YXIgbGltaXQgPSB0aGlzLm1vZGVsLmdldCgnbWF4X3Jvd3MnKTtcbiAgICAgICAgdmFyIHRvdGFsID0gdGhpcy5tb2RlbC5nZXQoJ3RvdGFsX3Jvd3MnKTtcbiAgICAgICAgdmFyIGFjdHVhbF9oID0gdGhpcy4kZWwucGFyZW50KCkuaGVpZ2h0KCk7XG4gICAgICAgIHZhciBhY3R1YWxfciA9IGFjdHVhbF9oIC8gdG90YWw7XG4gICAgICAgIHZhciBzY3JvbGxfaGVpZ2h0ID0gbGltaXQgKiBhY3R1YWxfcjtcbiAgICAgICAgaWYgKHNjcm9sbF9oZWlnaHQgPCAxMCkge1xuICAgICAgICAgICAgdmFyIGNvcnJlY3Rpb24gPSAxMCAtIHNjcm9sbF9oZWlnaHQ7XG4gICAgICAgICAgICBhY3R1YWxfaCAtPSBjb3JyZWN0aW9uO1xuICAgICAgICAgICAgYWN0dWFsX3IgPSBhY3R1YWxfaCAvIHRvdGFsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzY3JvbGxfdG9wID0gb2Zmc2V0ICogYWN0dWFsX3I7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2Nyb2xsX2hlaWdodCA8IGFjdHVhbF9oICYmIHRvdGFsID4gbGltaXQpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi5pbm5lclwiKS5jc3Moe1xuICAgICAgICAgICAgICAgIGhlaWdodDogc2Nyb2xsX2hlaWdodCxcbiAgICAgICAgICAgICAgICB0b3A6IHNjcm9sbF90b3BcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kKFwiLmlubmVyXCIpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwibW91c2Vkb3duIC5pbm5lclwiOiBcImdyYWJTY3JvbGxlclwiXG4gICAgfSxcbiAgICBcbiAgICBncmFiU2Nyb2xsZXI6IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVkgPSBldnQuY2xpZW50WTtcbiAgICAgICAgdmFyIG9mZnNldFkgPSBldnQub2Zmc2V0WTtcbiAgICAgICAgdmFyIHJhdGlvID0gdGhpcy5tb2RlbC5nZXQoJ3RvdGFsX3Jvd3MnKSAvIHRoaXMuJGVsLnBhcmVudCgpLmhlaWdodCgpO1xuICAgICAgICB2YXIgaW5pdE9mZnNldCA9IHNlbGYubW9kZWwuZ2V0KCdvZmZzZXQnKTtcbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIG1vdmVTY3JvbGxlcihldnQpe1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFk7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVk7XG4gICAgICAgICAgICB2YXIgbmV3T2Zmc2V0ID0gTWF0aC5tYXgoTWF0aC5yb3VuZChyYXRpbyAqIGNoYW5nZSkgKyBpbml0T2Zmc2V0LCAwKTtcbiAgICAgICAgICAgIG5ld09mZnNldCA9IE1hdGgubWluKG5ld09mZnNldCwgc2VsZi5tb2RlbC5nZXQoJ3RvdGFsX3Jvd3MnKSAtIHNlbGYubW9kZWwuZ2V0KCdtYXhfcm93cycpKVxuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoeydvZmZzZXQnOm5ld09mZnNldH0sIHt2YWxpZGF0ZTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiByZWxlYXNlU2Nyb2xsZXIoZXZ0KXtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZVNjcm9sbGVyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVTY3JvbGxlcik7XG4gICAgICAgICQod2luZG93KS5vbmUoXCJtb3VzZXVwXCIsIHJlbGVhc2VTY3JvbGxlcik7XG4gICAgfVxufSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFNjcm9sbGVyIiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG4vLyB2YXIgVGRhdGEgPSBCYXNlVmlldy5leHRlbmQoe1xuLy8gICAgIFxuLy8gICAgIGNsYXNzTmFtZTogJ3RkJyxcbi8vICAgICBcbi8vICAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKXtcbi8vICAgICAgICAgdGhpcy5jb2x1bW4gPSBvcHRpb25zLmNvbHVtbjtcbi8vICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbiwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4vLyAgICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOlwiK3RoaXMuY29sdW1uLmdldChcImtleVwiKSwgdGhpcy5yZW5kZXIgKTtcbi8vICAgICB9LFxuLy8gICAgIFxuLy8gICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48L2Rpdj4nLFxuLy8gICAgIFxuLy8gICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdjb2wtJyt0aGlzLmNvbHVtbi5pZCkud2lkdGgodGhpcy5jb2x1bW4uZ2V0KCd3aWR0aCcpKTtcbi8vICAgICAgICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlO1xuLy8gICAgICAgICAvLyB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuLy8gICAgICAgICB0aGlzLiQoXCIuY2VsbC1pbm5lclwiKS5hcHBlbmQoIHRoaXMuY29sdW1uLmdldEZvcm1hdHRlZCh0aGlzLm1vZGVsKSApO1xuLy8gICAgICAgICByZXR1cm4gdGhpcztcbi8vICAgICB9XG4vLyAgICAgXG4vLyB9KTtcblxudmFyIFRyb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGNsYXNzTmFtZTogJ3RyJyxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJyZW1vdmFsXCIpO1xuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciBpZCA9IGNvbHVtbi5nZXQoJ2lkJyk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IGNvbHVtbi5nZXRGb3JtYXR0ZWQodGhpcy5tb2RlbCk7XG4gICAgICAgICAgICB2YXIgJHZpZXcgPSAkKCc8ZGl2IGNsYXNzPVwidGQgY29sLScraWQrJ1wiIHN0eWxlPVwid2lkdGg6Jyt3aWR0aCsncHhcIj48ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjwvZGl2PjwvZGl2PicpO1xuICAgICAgICAgICAgJHZpZXcuZmluZCgnLmNlbGwtaW5uZXInKS5hcHBlbmQoZm9ybWF0dGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCgkdmlldyk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSk7XG5cblxuXG52YXIgVGJvZHkgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gb3B0aW9ucy5jb2x1bW5zO1xuICAgICAgICB0aGlzLmNvbmZpZyA9IHRoaXMuY29sdW1ucy5jb25maWc7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwic29ydFwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInVwZGF0ZVwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb25maWcsIFwidXBkYXRlXCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOndpZHRoXCIsIHRoaXMuYWRqdXN0Q29sdW1uV2lkdGggKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbmZpZywgXCJjaGFuZ2U6b2Zmc2V0XCIsIHRoaXMucmVuZGVyKTtcbiAgICB9LFxuICAgIFxuICAgIGFkanVzdENvbHVtbldpZHRoOiBmdW5jdGlvbihtb2RlbCwgbmV3V2lkdGgsIG9wdGlvbnMpe1xuICAgICAgICB0aGlzLiQoJy50ZC5jb2wtJyttb2RlbC5nZXQoXCJpZFwiKSkud2lkdGgobmV3V2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gUmVuZGVycyB0aGUgdmlzaWJsZSByb3dzIGdpdmVuIHRoZSBjdXJyZW50IG9mZnNldCBhbmQgbWF4X3Jvd3NcbiAgICAvLyBwcm9wZXJ0aWVzIG9uIHRoZSBjb25maWcgb2JqZWN0LlxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInJlbW92YWxcIik7XG4gICAgICAgIHZhciByb3dzX3RvX3JlbmRlciA9IHRoaXMuY29uZmlnLmdldFZpc2libGVSb3dzKCk7XG4gICAgICAgIGlmIChyb3dzX3RvX3JlbmRlciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHJvd3NfdG9fcmVuZGVyLmZvckVhY2goZnVuY3Rpb24ocm93KXtcbiAgICAgICAgICAgIHZhciByb3dWaWV3ID0gbmV3IFRyb3coe1xuICAgICAgICAgICAgICAgIG1vZGVsOiByb3csXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZCggcm93Vmlldy5yZW5kZXIoKS5lbCApO1xuICAgICAgICAgICAgcm93Vmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgcm93Vmlldy5yZW1vdmUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZCcpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIndoZWVsXCI6IFwib25Nb3VzZVdoZWVsXCIsXG4gICAgICAgIFwibW91c2V3aGVlbFwiOiBcIm9uTW91c2VXaGVlbFwiXG4gICAgfSxcbiAgICBcbiAgICBvbk1vdXNlV2hlZWw6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAvLyBCaWdJbnRlZ2VyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIC8vIG5vcm1hbGl6ZSB3ZWJraXQvZmlyZWZveCBzY3JvbGwgdmFsdWVzXG4gICAgICAgIHZhciBkZWx0YVkgPSAtZXZ0Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YVkgfHwgZXZ0Lm9yaWdpbmFsRXZlbnQuZGVsdGFZICogMTAwO1xuICAgICAgICB2YXIgbW92ZW1lbnQgPSBNYXRoLnJvdW5kKGRlbHRhWSAvIDEwMCk7XG4gICAgICAgIGlmIChpc05hTihtb3ZlbWVudCkpIHJldHVybjtcbiAgICAgICAgdmFyIG9yaWdPZmZzZXQgPSB0aGlzLmNvbmZpZy5nZXQoXCJvZmZzZXRcIik7XG4gICAgICAgIHZhciBsaW1pdCA9IHRoaXMuY29uZmlnLmdldChcIm1heF9yb3dzXCIpO1xuICAgICAgICB2YXIgb2Zmc2V0ID0gTWF0aC5taW4oIHRoaXMuY29sbGVjdGlvbi5sZW5ndGggLSBsaW1pdCwgTWF0aC5tYXgoIDAsIG9yaWdPZmZzZXQgKyBtb3ZlbWVudCkpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jb25maWcuc2V0KHtcIm9mZnNldFwiOiBvZmZzZXR9LCB7dmFsaWRhdGU6IHRydWV9ICk7XG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYm9keTsiLCJleHBvcnRzLmxpa2UgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YodGVybSkgPiAtMTtcbn1cbmV4cG9ydHMuaXMgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHRlcm0gPT0gdmFsdWU7XG59XG5leHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlKSB7XG4gICAgdmFsdWUgKj0gMTtcbiAgICB2YXIgZmlyc3RfdHdvID0gdGVybS5zdWJzdHIoMCwyKTtcbiAgICB2YXIgZmlyc3RfY2hhciA9IHRlcm1bMF07XG4gICAgdmFyIGFnYWluc3RfMSA9IHRlcm0uc3Vic3RyKDEpKjE7XG4gICAgdmFyIGFnYWluc3RfMiA9IHRlcm0uc3Vic3RyKDIpKjE7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI8PVwiICkgcmV0dXJuIHZhbHVlIDw9IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI+PVwiICkgcmV0dXJuIHZhbHVlID49IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPFwiICkgcmV0dXJuIHZhbHVlIDwgYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI+XCIgKSByZXR1cm4gdmFsdWUgPiBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIn5cIiApIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKSA9PSBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj1cIiApIHJldHVybiBhZ2FpbnN0XzEgPT0gdmFsdWUgO1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpLmluZGV4T2YodGVybS50b1N0cmluZygpKSA+IC0xIDtcbn0iLCJleHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpKjEgLSByb3cyLmdldChmaWVsZCkqMTtcbiAgICB9XG59XG5leHBvcnRzLnN0cmluZyA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICBpZiAoIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT0gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSApIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA+IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPyAxIDogLTEgO1xuICAgIH1cbn0iLCJleHBvcnRzLnNlbGVjdCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlbCkge1xuICAgIHZhciBzZWxlY3Rfa2V5ID0gJ3NlbGVjdGVkJztcbiAgICB2YXIgY2hlY2tlZCA9IG1vZGVsW3NlbGVjdF9rZXldID09PSB0cnVlO1xuICAgIHZhciAkcmV0ID0gJCgnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PC9kaXY+Jyk7XG4gICAgXG4gICAgLy8gU2V0IGNoZWNrZWRcbiAgICB2YXIgJGNiID0gJHJldC5maW5kKCdpbnB1dCcpLnByb3AoJ2NoZWNrZWQnLCBjaGVja2VkKTtcbiAgICBcbiAgICAvLyBTZXQgY2xpY2sgYmVoYXZpb3JcbiAgICAkY2Iub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciBzZWxlY3RlZCA9ICEhICRjYi5pcyhcIjpjaGVja2VkXCIpO1xuICAgICAgICBtb2RlbFtzZWxlY3Rfa2V5XSA9IHNlbGVjdGVkO1xuICAgICAgICBtb2RlbC50cmlnZ2VyKCdjaGFuZ2Vfc2VsZWN0ZWQnLCBtb2RlbCwgc2VsZWN0ZWQpO1xuICAgICAgICBpZiAobW9kZWwuY29sbGVjdGlvbikgbW9kZWwuY29sbGVjdGlvbi50cmlnZ2VyKCdjaGFuZ2Vfc2VsZWN0ZWQnKTtcbiAgICB9KVxuICAgIFxuICAgIHJldHVybiAkcmV0O1xufSJdfQ==
;