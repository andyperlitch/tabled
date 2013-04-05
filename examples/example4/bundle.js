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
    table_width: 500    
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
        this.columns = new Columns(this.options.columns,this.options);
        
        // Subviews
        this.subview("thead", new Thead({
            collection: this.columns
        }));
        this.subview("tbody", new Tbody({
            collection: this.collection,
            columns: this.columns
        }));
        
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
            '.thead': 'thead',
            '.tbody': 'tbody'
        })
        return this;
    },
    
    renderBody: function(){
        this.assign({
            '.tbody': 'tbody'
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
},{"./Filters":7,"./Sorts":8,"./Formats":9}],6:[function(require,module,exports){
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
        this.trigger("removal");
        this.$el.empty();
        
        this.collection.each(function(column){
            var tdView = new Tdata({
                model: this.model,
                column: column
            });
            // this.$el.append( tdView.render().el );
            this.el.appendChild( tdView.render().el );
            tdView.listenTo(this, "removal", tdView.remove);
        }, this);
        
        return this;
    }
});

var Tbody = BaseView.extend({
    
    initialize: function(options) {
        this.columns = options.columns;
        this.listenTo(this.collection, "reset", this.render);
        this.listenTo(this.collection, "sort", this.render);
    },
    
    render: function() {
        this.$el.empty();
        this.trigger("removal");
        var startTime = +new Date();
        this.collection.each(function(row){
            var rowView = new Trow({
                model: row,
                collection: this.columns
            });
            if ( this.passesFilters(row) ) this.$el.append( rowView.render().el );
            rowView.listenTo(this, "removal", rowView.remove);
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
        if (this.filter_row) this.assign({ '.filter-row' : 'filter_row' });
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
},{}],8:[function(require,module,exports){
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1Rib2R5LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UaGVhZC5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvRmlsdGVycy5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU29ydHMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Zvcm1hdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBUYWJsZWQgPSByZXF1aXJlKCcuLi8uLi8nKTtcblxuZnVuY3Rpb24gaW5jaGVzMmZlZXQoaW5jaGVzLCBtb2RlbCl7XG4gICAgdmFyIGZlZXQgPSBNYXRoLmZsb29yKGluY2hlcy8xMik7XG4gICAgdmFyIGluY2hlcyA9IGluY2hlcyAlIDEyO1xuICAgIHJldHVybiBmZWV0ICsgXCInXCIgKyBpbmNoZXMgKyAnXCInO1xufVxuXG5mdW5jdGlvbiBmZWV0X2ZpbHRlcih0ZXJtLCB2YWx1ZSwgZm9ybWF0dGVkLCBtb2RlbCkge1xuICAgIGlmICh0ZXJtID09IFwidGFsbFwiKSByZXR1cm4gdmFsdWUgPiA3MDtcbiAgICBpZiAodGVybSA9PSBcInNob3J0XCIpIHJldHVybiB2YWx1ZSA8IDY5O1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY29sdW1ucyA9IFtcbiAgICB7IGlkOiBcInNlbGVjdG9yXCIsIGtleTogXCJzZWxlY3RlZFwiLCBsYWJlbDogXCJcIiwgc2VsZWN0OiB0cnVlLCB3aWR0aDogMzAsIGxvY2tfd2lkdGg6IHRydWUgfSxcbiAgICB7IGlkOiBcImZpcnN0X25hbWVcIiwga2V5OiBcImZpcnN0X25hbWVcIiwgbGFiZWw6IFwiRmlyc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImxhc3RfbmFtZVwiLCBrZXk6IFwibGFzdF9uYW1lXCIsIGxhYmVsOiBcIkxhc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImFnZVwiLCBrZXk6IFwiYWdlXCIsIGxhYmVsOiBcIkFnZVwiLCBzb3J0OiBcIm51bWJlclwiLCBmaWx0ZXI6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcImhlaWdodFwiLCBrZXk6IFwiaGVpZ2h0XCIsIGxhYmVsOiBcIkhlaWdodFwiLCBmb3JtYXQ6IGluY2hlczJmZWV0LCBmaWx0ZXI6IGZlZXRfZmlsdGVyLCBzb3J0OiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJ3ZWlnaHRcIiwga2V5OiBcIndlaWdodFwiLCBsYWJlbDogXCJXZWlnaHRcIiwgZmlsdGVyOiBcIm51bWJlclwiLCBzb3J0OiBcIm51bWJlclwiIH1cbl07XG52YXIgY29sbGVjdGlvbiA9IG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKFtdKTtcbnZhciB0YWJsZWQgPSBuZXcgVGFibGVkKHtcbiAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLFxuICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgdGFibGVfd2lkdGg6IDUwMCAgICBcbn0pO1xudmFyICRwZyA9ICQoXCIjcGxheWdyb3VuZFwiKTtcbnRhYmxlZC5yZW5kZXIoKS4kZWwuYXBwZW5kVG8oJHBnKTtcblxuZnVuY3Rpb24gZ2VuUm93KGlkKXtcbiAgICBcbiAgICB2YXIgZm5hbWVzID0gW1xuICAgICAgICBcImpvZVwiLFxuICAgICAgICBcImZyZWRcIixcbiAgICAgICAgXCJmcmFua1wiLFxuICAgICAgICBcImppbVwiLFxuICAgICAgICBcIm1pa2VcIixcbiAgICAgICAgXCJnYXJ5XCIsXG4gICAgICAgIFwiYXppelwiXG4gICAgXTtcblxuICAgIHZhciBsbmFtZXMgPSBbXG4gICAgICAgIFwic3RlcmxpbmdcIixcbiAgICAgICAgXCJzbWl0aFwiLFxuICAgICAgICBcImVyaWNrc29uXCIsXG4gICAgICAgIFwiYnVya2VcIlxuICAgIF07XG4gICAgXG4gICAgdmFyIHNlZWQgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciBzZWVkMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgXG4gICAgdmFyIGZpcnN0X25hbWUgPSBmbmFtZXNbIE1hdGgucm91bmQoIHNlZWQgKiAoZm5hbWVzLmxlbmd0aCAtMSkgKSBdO1xuICAgIHZhciBsYXN0X25hbWUgPSBsbmFtZXNbIE1hdGgucm91bmQoIHNlZWQgKiAobG5hbWVzLmxlbmd0aCAtMSkgKSBdO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlLFxuICAgICAgICBmaXJzdF9uYW1lOiBmaXJzdF9uYW1lLFxuICAgICAgICBsYXN0X25hbWU6IGxhc3RfbmFtZSxcbiAgICAgICAgYWdlOiBNYXRoLmNlaWwoc2VlZCAqIDc1KSArIDE1LFxuICAgICAgICBoZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMzYgKSArIDQ4LFxuICAgICAgICB3ZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMTMwICkgKyA5MFxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2VuUm93cyhudW0pe1xuICAgIHZhciByZXRWYWwgPSBbXTtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBudW07IGkrKykge1xuICAgICAgICByZXRWYWwucHVzaChnZW5Sb3coaSkpO1xuICAgIH07XG4gICAgcmV0dXJuIHJldFZhbDtcbn1cblxud2luZG93LnN0b3AgPSBmYWxzZTtcbnZhciBpbnR2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgIGlmICh3aW5kb3cuc3RvcCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludHZhbCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG5ld1Jvd3MgPSBnZW5Sb3dzKDMwMCk7XG4gICAgY29sbGVjdGlvbi5yZXNldChuZXdSb3dzKTtcbn0sIDMwMDApOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vbGliL0Jhc2VWaWV3Jyk7XG52YXIgQ29sdW1uID0gcmVxdWlyZSgnLi9saWIvQ29sdW1uJykubW9kZWw7XG52YXIgQ29sdW1ucyA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLmNvbGxlY3Rpb247XG52YXIgVGhlYWQgPSByZXF1aXJlKCcuL2xpYi9UaGVhZCcpO1xudmFyIFRib2R5ID0gcmVxdWlyZSgnLi9saWIvVGJvZHknKTtcbnZhciBUYWJsZWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgLy8gU2V0IG9wdGlvbnNcbiAgICAgICAgdGhpcy5vcHRpb25zID0gXy5leHRlbmQoXG4gICAgICAgICAgICB7fSwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gTWFrZXMgdGFibGUgd2lkdGggYW5kIGNvbHVtbiB3aWR0aHMgYWRqdXN0YWJsZVxuICAgICAgICAgICAgICAgIGFkanVzdGFibGVfd2lkdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgc3RhdGUgb2YgdGhlIHRhYmxlIHdpZHRoc1xuICAgICAgICAgICAgICAgIHNhdmVfc3RhdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgbWluaW11bSBjb2x1bW4gd2lkdGgsIGluIHBpeGVsc1xuICAgICAgICAgICAgICAgIG1pbl9jb2x1bW5fd2lkdGg6IDMwLFxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgd2lkdGggZm9yIHRoZSB0YWJsZSBpdHNlbGYuIEVpdGhlciBwaXhlbHMgb3IgJ2F1dG8nXG4gICAgICAgICAgICAgICAgdGFibGVfd2lkdGg6ICdhdXRvJ1xuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQ29sdW1uc1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBuZXcgQ29sdW1ucyh0aGlzLm9wdGlvbnMuY29sdW1ucyx0aGlzLm9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhlYWRcIiwgbmV3IFRoZWFkKHtcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICB9KSk7XG4gICAgICAgIHRoaXMuc3VidmlldyhcInRib2R5XCIsIG5ldyBUYm9keSh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGVcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlX3N0YXRlKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3RvcmVQcmV2aW91c1N0YXRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbmVyc1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5vbldpZHRoQ2hhbmdlICk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpmaWx0ZXJfdmFsdWVcIiwgdGhpcy5yZW5kZXJCb2R5KTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgdGhpcy51cGRhdGVDb21wYXJhdG9yKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwic29ydFwiLCB0aGlzLm9uQ29sdW1uU29ydCk7XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogW1xuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZC1jdG5yXCI+PGRpdiBjbGFzcz1cInRhYmxlZC1pbm5lclwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFibGVkXCI+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0aGVhZFwiPjwvZGl2PicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGJvZHlcIj48L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS10YWJsZVwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj48ZGl2IGNsYXNzPVwicmVzaXplLWdyaXBcIj48L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj48L2Rpdj4nXG4gICAgXS5qb2luKFwiXCIpLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsIG1hcmt1cFxuICAgICAgICB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICAvLyBTZXQgdGhlIHdpZHRocyBvZiB0aGUgY29sdW1uc1xuICAgICAgICB0aGlzLnNldFdpZHRocygpO1xuICAgICAgICAvLyAoUmUpcmVuZGVyIHN1YnZpZXdzXG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnLFxuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keSdcbiAgICAgICAgfSlcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXJCb2R5OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRib2R5JzogJ3Rib2R5J1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlckhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYXNzaWduKHtcbiAgICAgICAgICAgICcudGhlYWQnOiAndGhlYWQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgb25XaWR0aENoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hZGp1c3RJbm5lckRpdigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0aGUgd2lkdGhzXG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnNhdmVfc3RhdGUpIHJldHVybjtcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuY29sdW1ucy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSwge30sIHRoaXMpO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fd2lkdGhzJywgd2lkdGhzKTtcbiAgICB9LFxuICAgIFxuICAgIG9uQ29sdW1uU29ydDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHNvcnRcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc2F2ZV9zdGF0ZSkgcmV0dXJuO1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbHVtbnMuY29sX3NvcnRzO1xuICAgICAgICB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnLCBzb3J0cyk7XG4gICAgfSxcbiAgICBcbiAgICBzZXRXaWR0aHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gVGFibGUncyB3aWR0aFxuICAgICAgICB2YXIgdG90YWxXaWR0aCA9IHRoaXMub3B0aW9ucy50YWJsZV93aWR0aCA9PT0gJ2F1dG8nID8gdGhpcy4kZWwud2lkdGgoKSA6IHRoaXMub3B0aW9ucy50YWJsZV93aWR0aDtcbiAgICAgICAgdmFyIG1ha2VEZWZhdWx0ID0gW107XG4gICAgICAgIHZhciBhZGp1c3RlZFdpZHRoID0gMDtcbiAgICAgICAgdGhpcy5jb2x1bW5zLmVhY2goZnVuY3Rpb24oY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgdmFyIGNvbF93aWR0aCA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICB2YXIgbWluX2NvbF93aWR0aCA9IGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKVxuICAgICAgICAgICAgaWYgKCBjb2xfd2lkdGggKSB7XG4gICAgICAgICAgICAgICAgdG90YWxXaWR0aCAtPSBjb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSBjb2xfd2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChtaW5fY29sX3dpZHRoKSB7XG4gICAgICAgICAgICAgICAgdG90YWxXaWR0aCAtPSBtaW5fY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gbWluX2NvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBtYWtlRGVmYXVsdC5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFrZURlZmF1bHQucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGF2Z193aWR0aCA9IG1ha2VEZWZhdWx0Lmxlbmd0aCA/IHRvdGFsV2lkdGgvbWFrZURlZmF1bHQubGVuZ3RoIDogMCA7XG4gICAgICAgIHZhciBkZWZhdWx0V2lkdGggPSBNYXRoLm1heChNYXRoLmZsb29yKGF2Z193aWR0aCksIHRoaXMub3B0aW9ucy5taW5fY29sdW1uX3dpZHRoKSA7XG4gICAgICAgIG1ha2VEZWZhdWx0LmZvckVhY2goZnVuY3Rpb24oY29sdW1uLCBrZXkpe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gTWF0aC5tYXgoZGVmYXVsdFdpZHRoLCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJykgfHwgZGVmYXVsdFdpZHRoKTtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoJ3dpZHRoJywgd2lkdGgpO1xuICAgICAgICAgICAgYWRqdXN0ZWRXaWR0aCArPSB3aWR0aDtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIHRoaXMuJGVsLndpZHRoKGFkanVzdGVkV2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgYWRqdXN0SW5uZXJEaXY6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpIHx8IGNvbHVtbi5nZXQoJ21pbl9jb2x1bW5fd2lkdGgnKTtcbiAgICAgICAgICAgIHJldHVybiBtZW1vKjEgKyB3aWR0aCoxO1xuICAgICAgICB9LCAwKTtcbiAgICAgICAgdGhpcy4kKCcudGFibGVkLWlubmVyJykud2lkdGgod2lkdGgpO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdtb3VzZWRvd24gLnJlc2l6ZS10YWJsZSc6ICdncmFiVGFibGVSZXNpemVyJ1xuICAgIH0sXG4gICAgXG4gICAgZ3JhYlRhYmxlUmVzaXplcjogZnVuY3Rpb24oZXZ0KXtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBjb2xfc3RhdGUgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwgaW5kZXgpe1xuICAgICAgICAgICAgbWVtb1tjb2x1bW4uZ2V0KCdpZCcpXSA9IGNvbHVtbi5nZXQoJ3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfSx7fSx0aGlzKTtcbiAgICAgICAgdmFyIHRhYmxlX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gKGV2dC5jbGllbnRYIC0gbW91c2VYKS9zZWxmLmNvbHVtbnMubGVuZ3RoO1xuICAgICAgICAgICAgc2VsZi5jb2x1bW5zLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgICAgICBjb2x1bW4uc2V0KHtcIndpZHRoXCI6Y29sX3N0YXRlW2NvbHVtbi5nZXQoXCJpZFwiKV0qMStjaGFuZ2V9LCB7dmFsaWRhdGU6dHJ1ZX0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBcbiAgICAgICAgdmFyIGNsZWFudXBfcmVzaXplID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICAkKHdpbmRvdykub2ZmKFwibW91c2Vtb3ZlXCIsIHRhYmxlX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCB0YWJsZV9yZXNpemUpO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCBjbGVhbnVwX3Jlc2l6ZSk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDb21wYXJhdG9yOiBmdW5jdGlvbihmbikge1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uY29tcGFyYXRvciA9IGZuO1xuICAgICAgICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHRoaXMuY29sbGVjdGlvbi5zb3J0KCk7XG4gICAgfSxcbiAgICBcbiAgICByZXN0b3JlUHJldmlvdXNTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENoZWNrIHdpZHRoc1xuICAgICAgICB2YXIgd2lkdGhzID0gdGhpcy5zdGF0ZSgnY29sdW1uX3dpZHRocycpO1xuICAgICAgICBpZiAod2lkdGhzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIF8uZWFjaCh3aWR0aHMsIGZ1bmN0aW9uKHZhbCwga2V5KXtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbHVtbnMuZ2V0KGtleSkuc2V0KCd3aWR0aCcsIHZhbCk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbHVtbiBzb3J0IG9yZGVyXG4gICAgICAgIHZhciBjb2xzb3J0cyA9IHRoaXMuc3RhdGUoJ2NvbHVtbl9zb3J0cycpO1xuICAgICAgICBpZiAoY29sc29ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmNvbF9zb3J0cyA9IGNvbHNvcnRzO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW5zLnNvcnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgc3RhdGU6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIHN0b3JhZ2Vfa2V5ID0gJ3RhYmxlZC4nK3RoaXMub3B0aW9ucy5pZDtcbiAgICAgICAgdmFyIHN0b3JlID0gdGhpcy5zdG9yZSB8fCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShzdG9yYWdlX2tleSkgfHwge307XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHN0b3JlICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0b3JlID0gSlNPTi5wYXJzZShzdG9yZSk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzdG9yZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlX2tleSwgSlNPTi5zdHJpbmdpZnkoc3RvcmUpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHN0b3JlW2tleV07XG4gICAgICAgIH1cbiAgICB9XG5cbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYWJsZWQiLCJ2YXIgQmFzZVZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgLy8gQXNzaWducyBhIHN1YnZpZXcgdG8gYSBqcXVlcnkgc2VsZWN0b3IgaW4gdGhpcyB2aWV3J3MgZWxcbiAgICBhc3NpZ24gOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHZpZXcpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9ycztcbiAgICAgICAgaWYgKF8uaXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSBzZWxlY3RvcjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGVjdG9ycyA9IHt9O1xuICAgICAgICAgICAgc2VsZWN0b3JzW3NlbGVjdG9yXSA9IHZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZWxlY3RvcnMpIHJldHVybjtcbiAgICAgICAgXy5lYWNoKHNlbGVjdG9ycywgZnVuY3Rpb24gKHZpZXcsIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZpZXcgPT09IFwic3RyaW5nXCIpIHZpZXcgPSB0aGlzLl9fc3Vidmlld3NfX1t2aWV3XTtcbiAgICAgICAgICAgIHZpZXcuc2V0RWxlbWVudCh0aGlzLiQoc2VsZWN0b3IpKS5yZW5kZXIoKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwicmVtb3ZhbFwiKTtcbiAgICAgICAgdGhpcy51bmJpbmQoKTtcbiAgICAgICAgQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVtb3ZlLmNhbGwodGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICBzdWJ2aWV3OiBmdW5jdGlvbihrZXksIHZpZXcpe1xuICAgICAgICAvLyBTZXQgdXAgc3VidmlldyBvYmplY3RcbiAgICAgICAgdmFyIHN2ID0gdGhpcy5fX3N1YnZpZXdzX18gPSB0aGlzLl9fc3Vidmlld3NfXyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGdldHRpbmdcbiAgICAgICAgaWYgKHZpZXcgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHN2W2tleV07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbGlzdGVuZXIgZm9yIHJlbW92YWwgZXZlbnRcbiAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBrZXlcbiAgICAgICAgc3Zba2V5XSA9IHZpZXc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbGxvdyBjaGFpbmluZ1xuICAgICAgICByZXR1cm4gdmlld1xuICAgIH1cbiAgICBcbn0pO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldyIsInZhciBGaWx0ZXJzID0gcmVxdWlyZShcIi4vRmlsdGVyc1wiKTtcbnZhciBTb3J0cyA9IHJlcXVpcmUoXCIuL1NvcnRzXCIpO1xudmFyIEZvcm1hdHMgPSByZXF1aXJlKFwiLi9Gb3JtYXRzXCIpO1xudmFyIENvbHVtbiA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgaWQ6IFwiXCIsXG4gICAgICAgIGtleTogXCJcIixcbiAgICAgICAgbGFiZWw6IFwiXCIsXG4gICAgICAgIHNvcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgZmlsdGVyOiB1bmRlZmluZWQsXG4gICAgICAgIGZvcm1hdDogdW5kZWZpbmVkLFxuICAgICAgICBzZWxlY3Q6IGZhbHNlLFxuICAgICAgICBmaWx0ZXJfdmFsdWU6IFwiXCIsXG4gICAgICAgIHNvcnRfdmFsdWU6IFwiXCIsXG4gICAgICAgIGxvY2tfd2lkdGg6IGZhbHNlXG4gICAgfSxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbHRlclxuICAgICAgICB2YXIgZmlsdGVyID0gdGhpcy5nZXQoXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInN0cmluZ1wiICYmIEZpbHRlcnMuaGFzT3duUHJvcGVydHkoZmlsdGVyKSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmaWx0ZXJcIiwgRmlsdGVyc1tmaWx0ZXJdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNvcnRcbiAgICAgICAgdmFyIHNvcnQgPSB0aGlzLmdldChcInNvcnRcIik7XG4gICAgICAgIGlmICh0eXBlb2Ygc29ydCA9PT0gXCJzdHJpbmdcIiAmJiBTb3J0cy5oYXNPd25Qcm9wZXJ0eShzb3J0KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJzb3J0XCIsIFNvcnRzW3NvcnRdKHRoaXMuZ2V0KFwia2V5XCIpKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBmb3JtYXRcbiAgICAgICAgdmFyIHNlbGVjdCA9IHRoaXMuZ2V0KCdzZWxlY3QnKTtcbiAgICAgICAgaWYgKHNlbGVjdCkge1xuICAgICAgICAgICAgdGhpcy5zZXQoXCJmb3JtYXRcIiwgRm9ybWF0cy5zZWxlY3QgKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic2VsZWN0X2tleVwiLCB0aGlzLmdldChcImtleVwiKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvSlNPTigpO1xuICAgIH0sXG4gICAgXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAoYXR0cnMud2lkdGggPCBhdHRycy5taW5fY29sdW1uX3dpZHRoKSByZXR1cm4gXCJBIGNvbHVtbiB3aWR0aCBjYW5ub3QgYmUgPT4gMFwiO1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLmxvY2tfd2lkdGggPT09IHRydWUgJiYgYXR0cnMud2lkdGggPiAwKSByZXR1cm4gXCJUaGlzIGNvbHVtbiBoYXMgYSBsb2NrZWQgd2lkdGhcIjtcbiAgICAgICAgXG4gICAgfSxcbiAgICBcbiAgICBnZXRLZXk6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC5nZXQodGhpcy5nZXQoJ2tleScpKTtcbiAgICB9LFxuICAgIFxuICAgIGdldEZvcm1hdHRlZDogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgdmFyIGZuID0gdGhpcy5nZXQoJ2Zvcm1hdCcpO1xuICAgICAgICByZXR1cm4gKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgICAgICAgPyBmbih0aGlzLmdldEtleShtb2RlbCksIG1vZGVsKVxuICAgICAgICAgICAgOiB0aGlzLmdldEtleShtb2RlbCk7XG4gICAgfSxcbiAgICBcbiAgICBzb3J0SW5kZXg6IGZ1bmN0aW9uKG5ld0luZGV4KSB7XG4gICAgICAgIHZhciBzb3J0cyA9IHRoaXMuY29sbGVjdGlvbi5jb2xfc29ydHM7XG4gICAgICAgIGlmICh0eXBlb2YgbmV3SW5kZXggPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBzb3J0cy5pbmRleE9mKHRoaXMuZ2V0KFwiaWRcIikpO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cklkeCA9IHRoaXMuc29ydEluZGV4KCk7XG4gICAgICAgIHZhciBpZCA9IHNvcnRzLnNwbGljZShjdXJJZHgsIDEpWzBdO1xuICAgICAgICBzb3J0cy5zcGxpY2UobmV3SW5kZXgsIDAsIGlkKTtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLnNvcnQoKTtcbiAgICB9XG4gICAgXG59KTtcblxudmFyIENvbHVtbnMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgXG4gICAgbW9kZWw6IENvbHVtbixcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihtb2RlbHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgXy5lYWNoKG1vZGVscywgdGhpcy5zZXRNaW5XaWR0aCwgdGhpcyk7XG4gICAgICAgIHRoaXMucm93X3NvcnRzID0gdGhpcy5nZXRJbml0aWFsUm93U29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5jb2xfc29ydHMgPSB0aGlzLmdldEluaXRpYWxDb2xTb3J0cyhtb2RlbHMpO1xuICAgICAgICB0aGlzLm9uKFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5vblNvcnRDaGFuZ2UpO1xuICAgIH0sXG4gICAgXG4gICAgY29tcGFyYXRvcjogZnVuY3Rpb24oY29sMSwgY29sMikge1xuICAgICAgICB2YXIgaWR4MSA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMS5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHZhciBpZHgyID0gdGhpcy5jb2xfc29ydHMuaW5kZXhPZihjb2wyLmdldChcImlkXCIpKTtcbiAgICAgICAgcmV0dXJuIGlkeDEgLSBpZHgyO1xuICAgIH0sXG4gICAgXG4gICAgLy8gcmVzZXRDb21wYXJhdG9yOiBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgdGhpcy5jb21wYXJhdG9yID0gZnVuY3Rpb24oY29sMSwgY29sMikge1xuICAgIC8vICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLmNvbF9zb3J0c1wiLCB0aGlzLmNvbF9zb3J0cyk7XG4gICAgLy8gICAgICAgICB2YXIgaWR4MSA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMS5nZXQoXCJpZFwiKSk7XG4gICAgLy8gICAgICAgICB2YXIgaWR4MiA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMi5nZXQoXCJpZFwiKSk7XG4gICAgLy8gICAgICAgICByZXR1cm4gaWR4MSAtIGlkeDI7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgdGhpcy5zb3J0KCk7XG4gICAgLy8gfVxuICAgIFxuICAgIHNldE1pbldpZHRoOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICBpZiAobW9kZWwuaGFzT3duUHJvcGVydHkoJ21pbl9jb2x1bW5fd2lkdGgnKSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgbW9kZWxbJ21pbl9jb2x1bW5fd2lkdGgnXSA9IHRoaXMub3B0aW9ucy5taW5fY29sdW1uX3dpZHRoO1xuICAgIH0sXG4gICAgXG4gICAgZ2V0SW5pdGlhbFJvd1NvcnRzOiBmdW5jdGlvbihtb2RlbHMpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZGVmYXVsdFNvcnRzID0gXy5wbHVjayhtb2RlbHMsIFwiaWRcIik7XG4gICAgICAgIHZhciBzb3J0cztcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yb3dfc29ydHMpIHtcbiAgICAgICAgICAgIHNvcnRzID0gdGhpcy5vcHRpb25zLnJvd19zb3J0cztcbiAgICAgICAgICAgIGlmICggISAoXy5ldmVyeShzb3J0cywgZnVuY3Rpb24oc29ydCkgeyByZXR1cm4gZGVmYXVsdFNvcnRzLmluZGV4T2Yoc29ydCkgPiAtMSB9KSkgKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25lIG9yIG1vcmUgdmFsdWVzIGluIHRoZSAncm93X3NvcnRzJyBvcHRpb24gZG9lcyBub3QgbWF0Y2ggYSBjb2x1bW4gaWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3J0cyA9IF8ucmVkdWNlKG1vZGVscyxmdW5jdGlvbihtZW1vLCBjb2x1bW4peyBcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uWydzb3J0X3ZhbHVlJ10pIFxuICAgICAgICAgICAgICAgICAgICBtZW1vLnB1c2goY29sdW1uW1wiaWRcIl0pOyBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgICAgIH0sW10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxDb2xTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY29sX3NvcnRzKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMub3B0aW9ucy5jb2xfc29ydHM7XG4gICAgICAgICAgICBpZiAoICEgKF8uZXZlcnkoc29ydHMsIGZ1bmN0aW9uKHNvcnQpIHsgcmV0dXJuIGRlZmF1bHRTb3J0cy5pbmRleE9mKHNvcnQpID4gLTEgfSkpICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9uZSBvciBtb3JlIHZhbHVlcyBpbiB0aGUgJ2NvbF9zb3J0cycgb3B0aW9uIGRvZXMgbm90IG1hdGNoIGEgY29sdW1uIGlkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ydHMgPSBkZWZhdWx0U29ydHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvcnRzO1xuICAgIH0sXG4gICAgXG4gICAgb25Tb3J0Q2hhbmdlOiBmdW5jdGlvbihtb2RlbCwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGlkID0gbW9kZWwuZ2V0KFwiaWRcIik7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMucm93X3NvcnRzLmluZGV4T2YoaWQpO1xuICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIHRoaXMucm93X3NvcnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVwZGF0ZUNvbXBhcmF0b3IoKTtcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUNvbXBhcmF0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5yb3dfc29ydHMubGVuZ3RoICE9PSAwKXtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBjb21wYXJhdG9yID0gZnVuY3Rpb24ocm93MSwgcm93Mikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNlbGYucm93X3NvcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpZCA9IHNlbGYucm93X3NvcnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sdW1uID0gc2VsZi5nZXQoaWQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBjb2x1bW4uZ2V0KFwic29ydFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gY29sdW1uLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0X3Jlc3VsdCA9IHZhbHVlID09IFwiYVwiID8gZm4ocm93MSwgcm93MikgOiBmbihyb3cyLCByb3cxKSA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0X3Jlc3VsdCAhPSAwKSByZXR1cm4gc29ydF9yZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXIoXCJjaGFuZ2U6Y29tcGFyYXRvclwiLCBjb21wYXJhdG9yKTtcbiAgICB9XG4gICAgXG59KTtcblxuZXhwb3J0cy5tb2RlbCA9IENvbHVtbjtcbmV4cG9ydHMuY29sbGVjdGlvbiA9IENvbHVtbnM7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGRhdGEgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGNsYXNzTmFtZTogJ3RkJyxcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSBvcHRpb25zLmNvbHVtbjtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbiwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOlwiK3RoaXMuY29sdW1uLmdldChcImtleVwiKSwgdGhpcy5yZW5kZXIgKTtcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdjb2wtJyt0aGlzLmNvbHVtbi5pZCkud2lkdGgodGhpcy5jb2x1bW4uZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy5lbC5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlO1xuICAgICAgICAvLyB0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUpO1xuICAgICAgICB0aGlzLiQoXCIuY2VsbC1pbm5lclwiKS5hcHBlbmQoIHRoaXMuY29sdW1uLmdldEZvcm1hdHRlZCh0aGlzLm1vZGVsKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG59KTtcblxudmFyIFRyb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGNsYXNzTmFtZTogJ3RyJyxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJyZW1vdmFsXCIpO1xuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB0ZFZpZXcgPSBuZXcgVGRhdGEoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogY29sdW1uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIHRoaXMuJGVsLmFwcGVuZCggdGRWaWV3LnJlbmRlcigpLmVsICk7XG4gICAgICAgICAgICB0aGlzLmVsLmFwcGVuZENoaWxkKCB0ZFZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHRkVmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgdGRWaWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSk7XG5cbnZhciBUYm9keSA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBvcHRpb25zLmNvbHVtbnM7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInJlc2V0XCIsIHRoaXMucmVuZGVyKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sIFwic29ydFwiLCB0aGlzLnJlbmRlcik7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJyZW1vdmFsXCIpO1xuICAgICAgICB2YXIgc3RhcnRUaW1lID0gK25ldyBEYXRlKCk7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgICAgICB2YXIgcm93VmlldyA9IG5ldyBUcm93KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogcm93LFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sdW1uc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIHRoaXMucGFzc2VzRmlsdGVycyhyb3cpICkgdGhpcy4kZWwuYXBwZW5kKCByb3dWaWV3LnJlbmRlcigpLmVsICk7XG4gICAgICAgICAgICByb3dWaWV3Lmxpc3RlblRvKHRoaXMsIFwicmVtb3ZhbFwiLCByb3dWaWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB2YXIgZWxhcHNlZFRpbWUgPSArbmV3IERhdGUoKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgY29uc29sZS5sb2coXCJlbGFwc2VkVGltZVwiLGVsYXBzZWRUaW1lLzEwMDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIHBhc3Nlc0ZpbHRlcnM6IGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbHVtbnMuZXZlcnkoZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIGlmIChjb2x1bW4uZ2V0KCdmaWx0ZXJfdmFsdWUnKSA9PSBcIlwiIHx8IHR5cGVvZiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhc3Nlc0ZpbHRlcihyb3csIGNvbHVtbik7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgcGFzc2VzRmlsdGVyOiBmdW5jdGlvbihyb3csIGNvbHVtbil7XG4gICAgICAgIHJldHVybiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSggY29sdW1uLmdldCgnZmlsdGVyX3ZhbHVlJyksIHJvdy5nZXQoY29sdW1uLmdldCgna2V5JykpLCBjb2x1bW4uZ2V0Rm9ybWF0dGVkKHJvdyksIHJvdyApO1xuICAgIH1cbiAgICBcbn0pO1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGJvZHk7IiwidmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9CYXNlVmlldycpO1xuXG52YXIgVGhDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0aCcsXG4gICAgXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCIgdGl0bGU9XCI8JT0gbGFiZWwgJT5cIj48c3BhbiBjbGFzcz1cInRoLWhlYWRlclwiPjwlPSBsYWJlbCAlPjwvc3Bhbj48L2Rpdj48JSBpZihsb2NrX3dpZHRoICE9PSB0cnVlKSB7JT48c3BhbiBjbGFzcz1cInJlc2l6ZVwiPjwvc3Bhbj48JX0lPicpLFxuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOnNvcnRfdmFsdWVcIiwgdGhpcy5yZW5kZXIgKTtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihtb2RlbCwgd2lkdGgpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIganNvbiA9IHRoaXMubW9kZWwuc2VyaWFsaXplKCk7XG4gICAgICAgIHZhciBzb3J0X2NsYXNzID0ganNvbi5zb3J0X3ZhbHVlID8gKGpzb24uc29ydF92YWx1ZSA9PSBcImRcIiA/IFwiZGVzY1wiIDogXCJhc2NcIiApIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FzYyBkZXNjJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY29sLScranNvbi5pZCtcIiBcIitzb3J0X2NsYXNzKVxuICAgICAgICAgICAgLndpZHRoKGpzb24ud2lkdGgpXG4gICAgICAgICAgICAuaHRtbCh0aGlzLnRlbXBsYXRlKGpzb24pKTtcbiAgICAgICAgaWYgKHNvcnRfY2xhc3MgIT09IFwiXCIpIHtcbiAgICAgICAgICAgIHRoaXMuJChcIi50aC1oZWFkZXJcIikucHJlcGVuZCgnPGkgY2xhc3M9XCInK3NvcnRfY2xhc3MrJy1pY29uXCI+PC9pPiAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcIm1vdXNlZG93biAucmVzaXplXCI6IFwiZ3JhYlJlc2l6ZXJcIixcbiAgICAgICAgXCJkYmxjbGljayAucmVzaXplXCI6IFwiZml0VG9Db250ZW50XCIsXG4gICAgICAgIFwibW91c2V1cCAudGgtaGVhZGVyXCI6IFwiY2hhbmdlQ29sdW1uU29ydFwiLFxuICAgICAgICBcIm1vdXNlZG93blwiOiBcImdyYWJDb2x1bW5cIlxuICAgIH0sXG4gICAgXG4gICAgZ3JhYlJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIGNvbHVtbldpZHRoID0gdGhpcy5tb2RlbC5nZXQoXCJ3aWR0aFwiKTtcbiAgICAgICAgLy8gSGFuZGxlciBmb3Igd2hlbiBtb3VzZSBpcyBtb3ZpbmdcbiAgICAgICAgdmFyIGNvbF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBzZWxmLm1vZGVsO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGV2dC5jbGllbnRYIC0gbW91c2VYO1xuICAgICAgICAgICAgdmFyIG5ld1dpZHRoID0gY29sdW1uV2lkdGggKyBjaGFuZ2U7XG4gICAgICAgICAgICBpZiAoIG5ld1dpZHRoIDwgKGNvbHVtbi5nZXQoXCJtaW5fY29sdW1uX3dpZHRoXCIpIHx8IHNlbGYub3B0aW9ucy5taW5fY29sdW1uX3dpZHRoKSApIHJldHVybjtcbiAgICAgICAgICAgIGNvbHVtbi5zZXQoe1wid2lkdGhcIjogbmV3V2lkdGh9LCB7dmFsaWRhdGU6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2xlYW51cF9yZXNpemUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgY29sX3Jlc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgZml0VG9Db250ZW50OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IDA7XG4gICAgICAgIHZhciBtaW5fd2lkdGggPSB0aGlzLm1vZGVsLmdldCgnbWluX2NvbHVtbl93aWR0aCcpO1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKTtcbiAgICAgICAgdmFyICRjdHggPSB0aGlzLiRlbC5wYXJlbnRzKCcudGFibGVkJykuZmluZCgnLnRib2R5Jyk7XG4gICAgICAgICQoXCIudGQuY29sLVwiK2lkK1wiIC5jZWxsLWlubmVyXCIsICRjdHgpLmVhY2goZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgbmV3X3dpZHRoID0gTWF0aC5tYXgobmV3X3dpZHRoLCQodGhpcykub3V0ZXJXaWR0aCh0cnVlKSwgbWluX3dpZHRoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnd2lkdGgnOm5ld193aWR0aH0se3ZhbGlkYXRlOiB0cnVlfSk7XG4gICAgfSxcbiAgICBcbiAgICBjaGFuZ2VDb2x1bW5Tb3J0OiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG1vZGVsLmdldChcInNvcnRcIikgIT09IFwiZnVuY3Rpb25cIiB8fCBtb2RlbC5nZXQoXCJtb3ZpbmdcIikgPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJfc29ydCA9IG1vZGVsLmdldChcInNvcnRfdmFsdWVcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2dC5zaGlmdEtleSkge1xuICAgICAgICAgICAgLy8gZGlzYWJsZSBhbGwgc29ydHNcbiAgICAgICAgICAgIG1vZGVsLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2wpe1xuICAgICAgICAgICAgICAgIGlmIChjb2wgIT09IG1vZGVsKSBjb2wuc2V0KHtcInNvcnRfdmFsdWVcIjogXCJcIn0pXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoKGN1cl9zb3J0KSB7XG4gICAgICAgICAgICBjYXNlIFwiXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImFcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiYVwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBncmFiQ29sdW1uOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2dC5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgbW91c2VYID0gZXZ0LmNsaWVudFg7XG4gICAgICAgIHZhciBvZmZzZXRYID0gZXZ0Lm9mZnNldFg7XG4gICAgICAgIHZhciB0aHJlc2hvbGRzID0gW107XG4gICAgICAgIHZhciBjdXJyZW50SWR4ID0gdGhpcy5tb2RlbC5zb3J0SW5kZXgoKTtcbiAgICAgICAgdmFyICR0ciA9IHRoaXMuJGVsLnBhcmVudCgpO1xuICAgICAgICAkdHIuZmluZCgnLnRoJykuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gJHRoaXMub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgIHZhciBoYWxmID0gJHRoaXMud2lkdGgoKSAvIDI7XG4gICAgICAgICAgICBpZiAoaSAhPSBjdXJyZW50SWR4KSB0aHJlc2hvbGRzLnB1c2gob2Zmc2V0K2hhbGYpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIHByZXZlbnRfbW91c2V1cCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgdmFyIGdldE5ld0luZGV4ID0gZnVuY3Rpb24ocG9zKSB7XG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHRocmVzaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gdGhyZXNob2xkc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocG9zID4gdmFsKSBuZXdJZHgrKztcbiAgICAgICAgICAgICAgICBlbHNlIHJldHVybiBuZXdJZHg7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIGRyYXdIZWxwZXIgPSBmdW5jdGlvbihuZXdJZHgpIHtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGlmIChuZXdJZHggPT0gY3VycmVudElkeCkgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG5ld0lkeCA8IGN1cnJlbnRJZHggPyAnYmVmb3JlJyA6ICdhZnRlcic7XG4gICAgICAgICAgICAkdHIuZmluZCgnLnRoOmVxKCcrbmV3SWR4KycpJylbbWV0aG9kXSgnPGRpdiBjbGFzcz1cImNvbHNvcnQtaGVscGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBtb3ZlX2NvbHVtbiA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzpjaGFuZ2UsICdvcGFjaXR5JzowLjUsICd6SW5kZXgnOiAxMH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbmV3SWR4ID0gZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpO1xuICAgICAgICAgICAgZHJhd0hlbHBlcihuZXdJZHgpO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgY2xlYW51cF9tb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICBzZWxmLiRlbC5jc3MoeydsZWZ0JzogMCwgJ29wYWNpdHknOjF9KTtcbiAgICAgICAgICAgICR0ci5maW5kKCcuY29sc29ydC1oZWxwZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHZhciBjdXJNb3VzZSA9IGV2dC5jbGllbnRYO1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IGN1ck1vdXNlIC0gbW91c2VYO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zb3J0SW5kZXgoZ2V0TmV3SW5kZXgoY3VyTW91c2UsIHRocmVzaG9sZHMpKTtcbiAgICAgICAgICAgICQod2luZG93KS5vZmYoXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAgICAgc2VsZi5tb2RlbC5zZXQoJ21vdmluZycsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIG1vdmVfY29sdW1uKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9tb3ZlKVxuICAgIH1cbn0pO1xuXG52YXIgVGhSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgZWFjaCB0aCBjZWxsXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBUaENlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsIClcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyQ2VsbCA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6d2lkdGhcIiwgZnVuY3Rpb24oY29sdW1uLCB3aWR0aCl7XG4gICAgICAgICAgICB0aGlzLiRlbC53aWR0aCh3aWR0aCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IGNsYXNzPVwiZmlsdGVyXCIgdHlwZT1cInNlYXJjaFwiIHBsYWNlaG9sZGVyPVwiZmlsdGVyXCIgLz48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMubW9kZWwuZ2V0KCdmaWx0ZXInKTtcbiAgICAgICAgdmFyIG1hcmt1cCA9IHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy50ZW1wbGF0ZSA6IFwiXCIgO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygndGQgY29sLScrdGhpcy5tb2RlbC5nZXQoJ2lkJykpLndpZHRoKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbChtYXJrdXApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICBcImNsaWNrIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJcIixcbiAgICAgICAgXCJrZXl1cCAuZmlsdGVyXCI6IFwidXBkYXRlRmlsdGVyRGVsYXllZFwiXG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXI6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgnZmlsdGVyX3ZhbHVlJywgJC50cmltKHRoaXMuJCgnLmZpbHRlcicpLnZhbCgpKSApO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlRmlsdGVyRGVsYXllZDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpIGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlclRpbWVvdXQpXG4gICAgICAgIHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCA9IHNldFRpbWVvdXQodGhpcy51cGRhdGVGaWx0ZXIuYmluZCh0aGlzLCBldnQpLCAyMDApO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgRmlsdGVyUm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjbGVhciBpdFxuICAgICAgICB0aGlzLiRlbC5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVuZGVyIGVhY2ggdGggY2VsbFxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRmlsdGVyQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBcbn0pO1xuXG52YXIgVGhlYWQgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgLy8gU2V0dXAgc3Vidmlld3NcbiAgICAgICAgdGhpcy5zdWJ2aWV3KFwidGhfcm93XCIsIG5ldyBUaFJvdyh7IGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbiB9KSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5uZWVkc0ZpbHRlclJvdygpKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnZpZXcoXCJmaWx0ZXJfcm93XCIsIG5ldyBGaWx0ZXJSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0ciB0aC1yb3dcIj48L2Rpdj48ZGl2IGNsYXNzPVwidHIgZmlsdGVyLXJvd1wiPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgdGhpcy5hc3NpZ24oeyAnLnRoLXJvdycgOiAndGhfcm93JyB9KTtcbiAgICAgICAgaWYgKHRoaXMuZmlsdGVyX3JvdykgdGhpcy5hc3NpZ24oeyAnLmZpbHRlci1yb3cnIDogJ2ZpbHRlcl9yb3cnIH0pO1xuICAgICAgICBlbHNlIHRoaXMuJCgnLmZpbHRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBcbiAgICBuZWVkc0ZpbHRlclJvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uc29tZShmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgY29sdW1uLmdldCgnZmlsdGVyJykgIT09ICd1bmRlZmluZWQnKVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbn0pO1xuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGhlYWQ7IiwiZXhwb3J0cy5saWtlID0gZnVuY3Rpb24odGVybSwgdmFsdWUsIGNvbXB1dGVkVmFsdWUsIHJvdykge1xuICAgIHRlcm0gPSB0ZXJtLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiB2YWx1ZS5pbmRleE9mKHRlcm0pID4gLTE7XG59XG5leHBvcnRzLmlzID0gZnVuY3Rpb24odGVybSwgdmFsdWUsIGNvbXB1dGVkVmFsdWUsIHJvdykge1xuICAgIHRlcm0gPSB0ZXJtLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsdWUgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiB0ZXJtID09IHZhbHVlO1xufVxuZXhwb3J0cy5udW1iZXIgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSkge1xuICAgIHZhbHVlICo9IDE7XG4gICAgdmFyIGZpcnN0X3R3byA9IHRlcm0uc3Vic3RyKDAsMik7XG4gICAgdmFyIGZpcnN0X2NoYXIgPSB0ZXJtWzBdO1xuICAgIHZhciBhZ2FpbnN0XzEgPSB0ZXJtLnN1YnN0cigxKSoxO1xuICAgIHZhciBhZ2FpbnN0XzIgPSB0ZXJtLnN1YnN0cigyKSoxO1xuICAgIGlmICggZmlyc3RfdHdvID09IFwiPD1cIiApIHJldHVybiB2YWx1ZSA8PSBhZ2FpbnN0XzIgO1xuICAgIGlmICggZmlyc3RfdHdvID09IFwiPj1cIiApIHJldHVybiB2YWx1ZSA+PSBhZ2FpbnN0XzIgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIjxcIiApIHJldHVybiB2YWx1ZSA8IGFnYWluc3RfMSA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPlwiICkgcmV0dXJuIHZhbHVlID4gYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCJ+XCIgKSByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSkgPT0gYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI9XCIgKSByZXR1cm4gYWdhaW5zdF8xID09IHZhbHVlIDtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKS5pbmRleE9mKHRlcm0udG9TdHJpbmcoKSkgPiAtMSA7XG59IiwiZXhwb3J0cy5udW1iZXIgPSBmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHJvdzEscm93MikgeyBcbiAgICAgICAgcmV0dXJuIHJvdzEuZ2V0KGZpZWxkKSoxIC0gcm93Mi5nZXQoZmllbGQpKjE7XG4gICAgfVxufVxuZXhwb3J0cy5zdHJpbmcgPSBmdW5jdGlvbihmaWVsZCl7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHJvdzEscm93MikgeyBcbiAgICAgICAgaWYgKCByb3cxLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID09IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgKSByZXR1cm4gMDtcbiAgICAgICAgcmV0dXJuIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPiByb3cyLmdldChmaWVsZCkudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpID8gMSA6IC0xIDtcbiAgICB9XG59IiwiZXhwb3J0cy5zZWxlY3QgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZWwpIHtcbiAgICB2YXIgc2VsZWN0X2tleSA9IG1vZGVsLmdldCgnc2VsZWN0X2tleScpIHx8ICdzZWxlY3RlZCc7XG4gICAgdmFyIGNoZWNrZWQgPSBtb2RlbC5nZXQoc2VsZWN0X2tleSkgPT09IHRydWU7XG4gICAgdmFyICRyZXQgPSAkKCc8ZGl2IGNsYXNzPVwiY2VsbC1pbm5lclwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj48L2Rpdj4nKTtcbiAgICBcbiAgICAvLyBTZXQgY2hlY2tlZFxuICAgIHZhciAkY2IgPSAkcmV0LmZpbmQoJ2lucHV0JykucHJvcCgnY2hlY2tlZCcsIGNoZWNrZWQpO1xuICAgIFxuICAgIC8vIFNldCBjbGljayBiZWhhdmlvclxuICAgICRjYi5vbignY2xpY2snLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKCRjYi5pcyhcIjpjaGVja2VkXCIpKSBtb2RlbC5zZXQoc2VsZWN0X2tleSwgdHJ1ZSk7XG4gICAgICAgIGVsc2UgbW9kZWwuc2V0KHNlbGVjdF9rZXksIGZhbHNlKTtcbiAgICB9KVxuICAgIFxuICAgIHJldHVybiAkcmV0O1xufSJdfQ==
;