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
    var method = collection.length ? 'set' : 'reset' ;
    collection[method](newRows);
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
        this.listenTo(this.collection, "reset", this.render);
        this.listenTo(this.collection, "sort", this.render);
        this.listenTo(this.columns, "change:width", this.adjustColumnWidth )
    },
    
    adjustColumnWidth: function(model, newWidth, options){
        this.$('.td.col-'+model.get("id")).width(newWidth);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvZXhhbXBsZXMvZXhhbXBsZTQvc3RhcnQuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvaW5kZXguanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Jhc2VWaWV3LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9Db2x1bW4uanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL1Rib2R5LmpzIiwiL1VzZXJzL2FuZHlwZXJsaXRjaC9ub2RlX21vZHVsZXMvdGFibGVkL2xpYi9UaGVhZC5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvRmlsdGVycy5qcyIsIi9Vc2Vycy9hbmR5cGVybGl0Y2gvbm9kZV9tb2R1bGVzL3RhYmxlZC9saWIvU29ydHMuanMiLCIvVXNlcnMvYW5keXBlcmxpdGNoL25vZGVfbW9kdWxlcy90YWJsZWQvbGliL0Zvcm1hdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBUYWJsZWQgPSByZXF1aXJlKCcuLi8uLi8nKTtcblxuZnVuY3Rpb24gaW5jaGVzMmZlZXQoaW5jaGVzLCBtb2RlbCl7XG4gICAgdmFyIGZlZXQgPSBNYXRoLmZsb29yKGluY2hlcy8xMik7XG4gICAgdmFyIGluY2hlcyA9IGluY2hlcyAlIDEyO1xuICAgIHJldHVybiBmZWV0ICsgXCInXCIgKyBpbmNoZXMgKyAnXCInO1xufVxuXG5mdW5jdGlvbiBmZWV0X2ZpbHRlcih0ZXJtLCB2YWx1ZSwgZm9ybWF0dGVkLCBtb2RlbCkge1xuICAgIGlmICh0ZXJtID09IFwidGFsbFwiKSByZXR1cm4gdmFsdWUgPiA3MDtcbiAgICBpZiAodGVybSA9PSBcInNob3J0XCIpIHJldHVybiB2YWx1ZSA8IDY5O1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY29sdW1ucyA9IFtcbiAgICB7IGlkOiBcInNlbGVjdG9yXCIsIGtleTogXCJzZWxlY3RlZFwiLCBsYWJlbDogXCJcIiwgc2VsZWN0OiB0cnVlLCB3aWR0aDogMzAsIGxvY2tfd2lkdGg6IHRydWUgfSxcbiAgICB7IGlkOiBcImZpcnN0X25hbWVcIiwga2V5OiBcImZpcnN0X25hbWVcIiwgbGFiZWw6IFwiRmlyc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImxhc3RfbmFtZVwiLCBrZXk6IFwibGFzdF9uYW1lXCIsIGxhYmVsOiBcIkxhc3QgTmFtZVwiLCBzb3J0OiBcInN0cmluZ1wiLCBmaWx0ZXI6IFwibGlrZVwiLCAgfSxcbiAgICB7IGlkOiBcImFnZVwiLCBrZXk6IFwiYWdlXCIsIGxhYmVsOiBcIkFnZVwiLCBzb3J0OiBcIm51bWJlclwiLCBmaWx0ZXI6IFwibnVtYmVyXCIgfSxcbiAgICB7IGlkOiBcImhlaWdodFwiLCBrZXk6IFwiaGVpZ2h0XCIsIGxhYmVsOiBcIkhlaWdodFwiLCBmb3JtYXQ6IGluY2hlczJmZWV0LCBmaWx0ZXI6IGZlZXRfZmlsdGVyLCBzb3J0OiBcIm51bWJlclwiIH0sXG4gICAgeyBpZDogXCJ3ZWlnaHRcIiwga2V5OiBcIndlaWdodFwiLCBsYWJlbDogXCJXZWlnaHRcIiwgZmlsdGVyOiBcIm51bWJlclwiLCBzb3J0OiBcIm51bWJlclwiIH1cbl07XG52YXIgY29sbGVjdGlvbiA9IG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKFtdKTtcbnZhciB0YWJsZWQgPSBuZXcgVGFibGVkKHtcbiAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLFxuICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgdGFibGVfd2lkdGg6IDUwMCAgICBcbn0pO1xudmFyICRwZyA9ICQoXCIjcGxheWdyb3VuZFwiKTtcbnRhYmxlZC5yZW5kZXIoKS4kZWwuYXBwZW5kVG8oJHBnKTtcblxuZnVuY3Rpb24gZ2VuUm93KGlkKXtcbiAgICBcbiAgICB2YXIgZm5hbWVzID0gW1xuICAgICAgICBcImpvZVwiLFxuICAgICAgICBcImZyZWRcIixcbiAgICAgICAgXCJmcmFua1wiLFxuICAgICAgICBcImppbVwiLFxuICAgICAgICBcIm1pa2VcIixcbiAgICAgICAgXCJnYXJ5XCIsXG4gICAgICAgIFwiYXppelwiXG4gICAgXTtcblxuICAgIHZhciBsbmFtZXMgPSBbXG4gICAgICAgIFwic3RlcmxpbmdcIixcbiAgICAgICAgXCJzbWl0aFwiLFxuICAgICAgICBcImVyaWNrc29uXCIsXG4gICAgICAgIFwiYnVya2VcIlxuICAgIF07XG4gICAgXG4gICAgdmFyIHNlZWQgPSBNYXRoLnJhbmRvbSgpO1xuICAgIHZhciBzZWVkMiA9IE1hdGgucmFuZG9tKCk7XG4gICAgXG4gICAgdmFyIGZpcnN0X25hbWUgPSBmbmFtZXNbIE1hdGgucm91bmQoIHNlZWQgKiAoZm5hbWVzLmxlbmd0aCAtMSkgKSBdO1xuICAgIHZhciBsYXN0X25hbWUgPSBsbmFtZXNbIE1hdGgucm91bmQoIHNlZWQgKiAobG5hbWVzLmxlbmd0aCAtMSkgKSBdO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlLFxuICAgICAgICBmaXJzdF9uYW1lOiBmaXJzdF9uYW1lLFxuICAgICAgICBsYXN0X25hbWU6IGxhc3RfbmFtZSxcbiAgICAgICAgYWdlOiBNYXRoLmNlaWwoc2VlZCAqIDc1KSArIDE1LFxuICAgICAgICBoZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMzYgKSArIDQ4LFxuICAgICAgICB3ZWlnaHQ6IE1hdGgucm91bmQoIHNlZWQyICogMTMwICkgKyA5MFxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2VuUm93cyhudW0pe1xuICAgIHZhciByZXRWYWwgPSBbXTtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBudW07IGkrKykge1xuICAgICAgICByZXRWYWwucHVzaChnZW5Sb3coaSkpO1xuICAgIH07XG4gICAgcmV0dXJuIHJldFZhbDtcbn1cblxud2luZG93LnN0b3AgPSBmYWxzZTtcbnZhciBpbnR2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgIGlmICh3aW5kb3cuc3RvcCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludHZhbCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIG5ld1Jvd3MgPSBnZW5Sb3dzKDMwMCk7XG4gICAgdmFyIG1ldGhvZCA9IGNvbGxlY3Rpb24ubGVuZ3RoID8gJ3NldCcgOiAncmVzZXQnIDtcbiAgICBjb2xsZWN0aW9uW21ldGhvZF0obmV3Um93cyk7XG59LCAzMDAwKTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2xpYi9CYXNlVmlldycpO1xudmFyIENvbHVtbiA9IHJlcXVpcmUoJy4vbGliL0NvbHVtbicpLm1vZGVsO1xudmFyIENvbHVtbnMgPSByZXF1aXJlKCcuL2xpYi9Db2x1bW4nKS5jb2xsZWN0aW9uO1xudmFyIFRoZWFkID0gcmVxdWlyZSgnLi9saWIvVGhlYWQnKTtcbnZhciBUYm9keSA9IHJlcXVpcmUoJy4vbGliL1Rib2R5Jyk7XG52YXIgVGFibGVkID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIC8vIFNldCBvcHRpb25zXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IF8uZXh0ZW5kKFxuICAgICAgICAgICAge30sIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIE1ha2VzIHRhYmxlIHdpZHRoIGFuZCBjb2x1bW4gd2lkdGhzIGFkanVzdGFibGVcbiAgICAgICAgICAgICAgICBhZGp1c3RhYmxlX3dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgICAgIC8vIFNhdmUgdGhlIHN0YXRlIG9mIHRoZSB0YWJsZSB3aWR0aHNcbiAgICAgICAgICAgICAgICBzYXZlX3N0YXRlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IG1pbmltdW0gY29sdW1uIHdpZHRoLCBpbiBwaXhlbHNcbiAgICAgICAgICAgICAgICBtaW5fY29sdW1uX3dpZHRoOiAzMCxcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHdpZHRoIGZvciB0aGUgdGFibGUgaXRzZWxmLiBFaXRoZXIgcGl4ZWxzIG9yICdhdXRvJ1xuICAgICAgICAgICAgICAgIHRhYmxlX3dpZHRoOiAnYXV0bydcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICApO1xuXG4gICAgICAgIC8vIENvbHVtbnNcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gbmV3IENvbHVtbnModGhpcy5vcHRpb25zLmNvbHVtbnMsdGhpcy5vcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnZpZXdzXG4gICAgICAgIHRoaXMuc3VidmlldyhcInRoZWFkXCIsIG5ldyBUaGVhZCh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbHVtbnNcbiAgICAgICAgfSkpO1xuICAgICAgICB0aGlzLnN1YnZpZXcoXCJ0Ym9keVwiLCBuZXcgVGJvZHkoe1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogdGhpcy5jb2x1bW5zXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRlXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZV9zdGF0ZSkge1xuICAgICAgICAgICAgdGhpcy5yZXN0b3JlUHJldmlvdXNTdGF0ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW5lcnNcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbHVtbnMsIFwiY2hhbmdlOndpZHRoXCIsIHRoaXMub25XaWR0aENoYW5nZSApO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6ZmlsdGVyX3ZhbHVlXCIsIHRoaXMucmVuZGVyQm9keSk7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcImNoYW5nZTpjb21wYXJhdG9yXCIsIHRoaXMudXBkYXRlQ29tcGFyYXRvcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW5zLCBcInNvcnRcIiwgdGhpcy5vbkNvbHVtblNvcnQpO1xuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6IFtcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJ0YWJsZWQtY3RuclwiPjxkaXYgY2xhc3M9XCJ0YWJsZWQtaW5uZXJcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRhYmxlZFwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGhlYWRcIj48L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInRib2R5XCI+PC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyZXNpemUtdGFibGVcIj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+PGRpdiBjbGFzcz1cInJlc2l6ZS1ncmlwXCI+PC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+PC9kaXY+J1xuICAgIF0uam9pbihcIlwiKSxcbiAgICBcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgaW5pdGlhbCBtYXJrdXBcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbiAgICAgICAgLy8gU2V0IHRoZSB3aWR0aHMgb2YgdGhlIGNvbHVtbnNcbiAgICAgICAgdGhpcy5zZXRXaWR0aHMoKTtcbiAgICAgICAgLy8gKFJlKXJlbmRlciBzdWJ2aWV3c1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJyxcbiAgICAgICAgICAgICcudGJvZHknOiAndGJvZHknXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyQm9keTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5hc3NpZ24oe1xuICAgICAgICAgICAgJy50Ym9keSc6ICd0Ym9keSdcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICByZW5kZXJIZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmFzc2lnbih7XG4gICAgICAgICAgICAnLnRoZWFkJzogJ3RoZWFkJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIG9uV2lkdGhDaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuYWRqdXN0SW5uZXJEaXYoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdGhlIHdpZHRoc1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5zYXZlX3N0YXRlKSByZXR1cm47XG4gICAgICAgIHZhciB3aWR0aHMgPSB0aGlzLmNvbHVtbnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIG1lbW9bY29sdW1uLmdldCgnaWQnKV0gPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH0sIHt9LCB0aGlzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSgnY29sdW1uX3dpZHRocycsIHdpZHRocyk7XG4gICAgfSxcbiAgICBcbiAgICBvbkNvbHVtblNvcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzb3J0XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnNhdmVfc3RhdGUpIHJldHVybjtcbiAgICAgICAgdmFyIHNvcnRzID0gdGhpcy5jb2x1bW5zLmNvbF9zb3J0cztcbiAgICAgICAgdGhpcy5zdGF0ZSgnY29sdW1uX3NvcnRzJywgc29ydHMpO1xuICAgIH0sXG4gICAgXG4gICAgc2V0V2lkdGhzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIFRhYmxlJ3Mgd2lkdGhcbiAgICAgICAgdmFyIHRvdGFsV2lkdGggPSB0aGlzLm9wdGlvbnMudGFibGVfd2lkdGggPT09ICdhdXRvJyA/IHRoaXMuJGVsLndpZHRoKCkgOiB0aGlzLm9wdGlvbnMudGFibGVfd2lkdGg7XG4gICAgICAgIHZhciBtYWtlRGVmYXVsdCA9IFtdO1xuICAgICAgICB2YXIgYWRqdXN0ZWRXaWR0aCA9IDA7XG4gICAgICAgIHRoaXMuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciBjb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgdmFyIG1pbl9jb2xfd2lkdGggPSBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJylcbiAgICAgICAgICAgIGlmICggY29sX3dpZHRoICkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gY29sX3dpZHRoO1xuICAgICAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gY29sX3dpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobWluX2NvbF93aWR0aCkge1xuICAgICAgICAgICAgICAgIHRvdGFsV2lkdGggLT0gbWluX2NvbF93aWR0aDtcbiAgICAgICAgICAgICAgICBhZGp1c3RlZFdpZHRoICs9IG1pbl9jb2xfd2lkdGg7XG4gICAgICAgICAgICAgICAgbWFrZURlZmF1bHQucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1ha2VEZWZhdWx0LnB1c2goY29sdW1uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBhdmdfd2lkdGggPSBtYWtlRGVmYXVsdC5sZW5ndGggPyB0b3RhbFdpZHRoL21ha2VEZWZhdWx0Lmxlbmd0aCA6IDAgO1xuICAgICAgICB2YXIgZGVmYXVsdFdpZHRoID0gTWF0aC5tYXgoTWF0aC5mbG9vcihhdmdfd2lkdGgpLCB0aGlzLm9wdGlvbnMubWluX2NvbHVtbl93aWR0aCkgO1xuICAgICAgICBtYWtlRGVmYXVsdC5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbiwga2V5KXtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IE1hdGgubWF4KGRlZmF1bHRXaWR0aCwgY29sdW1uLmdldCgnbWluX2NvbHVtbl93aWR0aCcpIHx8IGRlZmF1bHRXaWR0aCk7XG4gICAgICAgICAgICBjb2x1bW4uc2V0KCd3aWR0aCcsIHdpZHRoKTtcbiAgICAgICAgICAgIGFkanVzdGVkV2lkdGggKz0gd2lkdGg7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyB0aGlzLiRlbC53aWR0aChhZGp1c3RlZFdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGFkanVzdElubmVyRGl2OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4pe1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKSB8fCBjb2x1bW4uZ2V0KCdtaW5fY29sdW1uX3dpZHRoJyk7XG4gICAgICAgICAgICByZXR1cm4gbWVtbyoxICsgd2lkdGgqMTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIHRoaXMuJCgnLnRhYmxlZC1pbm5lcicpLndpZHRoKHdpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIGV2ZW50czoge1xuICAgICAgICAnbW91c2Vkb3duIC5yZXNpemUtdGFibGUnOiAnZ3JhYlRhYmxlUmVzaXplcidcbiAgICB9LFxuICAgIFxuICAgIGdyYWJUYWJsZVJlc2l6ZXI6IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgY29sX3N0YXRlID0gdGhpcy5jb2x1bW5zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjb2x1bW4sIGluZGV4KXtcbiAgICAgICAgICAgIG1lbW9bY29sdW1uLmdldCgnaWQnKV0gPSBjb2x1bW4uZ2V0KCd3aWR0aCcpO1xuICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH0se30sdGhpcyk7XG4gICAgICAgIHZhciB0YWJsZV9yZXNpemUgPSBmdW5jdGlvbihldnQpe1xuICAgICAgICAgICAgdmFyIGNoYW5nZSA9IChldnQuY2xpZW50WCAtIG1vdXNlWCkvc2VsZi5jb2x1bW5zLmxlbmd0aDtcbiAgICAgICAgICAgIHNlbGYuY29sdW1ucy5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOmNvbF9zdGF0ZVtjb2x1bW4uZ2V0KFwiaWRcIildKjErY2hhbmdlfSwge3ZhbGlkYXRlOnRydWV9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gXG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCB0YWJsZV9yZXNpemUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgdGFibGVfcmVzaXplKTtcbiAgICAgICAgJCh3aW5kb3cpLm9uZShcIm1vdXNldXBcIiwgY2xlYW51cF9yZXNpemUpO1xuICAgIH0sXG4gICAgXG4gICAgdXBkYXRlQ29tcGFyYXRvcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmNvbXBhcmF0b3IgPSBmbjtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB0aGlzLmNvbGxlY3Rpb24uc29ydCgpO1xuICAgIH0sXG4gICAgXG4gICAgcmVzdG9yZVByZXZpb3VzU3RhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBDaGVjayB3aWR0aHNcbiAgICAgICAgdmFyIHdpZHRocyA9IHRoaXMuc3RhdGUoJ2NvbHVtbl93aWR0aHMnKTtcbiAgICAgICAgaWYgKHdpZHRocyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBfLmVhY2god2lkdGhzLCBmdW5jdGlvbih2YWwsIGtleSl7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2x1bW5zLmdldChrZXkpLnNldCgnd2lkdGgnLCB2YWwpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBjb2x1bW4gc29ydCBvcmRlclxuICAgICAgICB2YXIgY29sc29ydHMgPSB0aGlzLnN0YXRlKCdjb2x1bW5fc29ydHMnKTtcbiAgICAgICAgaWYgKGNvbHNvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuY29sdW1ucy5jb2xfc29ydHMgPSBjb2xzb3J0cztcbiAgICAgICAgICAgIHRoaXMuY29sdW1ucy5zb3J0KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIHN0YXRlOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlX2tleSA9ICd0YWJsZWQuJyt0aGlzLm9wdGlvbnMuaWQ7XG4gICAgICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmUgfHwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZV9rZXkpIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdG9yZSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdG9yZSA9IEpTT04ucGFyc2Uoc3RvcmUpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgc3RvcmUgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RvcmVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oc3RvcmFnZV9rZXksIEpTT04uc3RyaW5naWZ5KHN0b3JlKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9yZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxuXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gVGFibGVkIiwidmFyIEJhc2VWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuICAgIFxuICAgIC8vIEFzc2lnbnMgYSBzdWJ2aWV3IHRvIGEganF1ZXJ5IHNlbGVjdG9yIGluIHRoaXMgdmlldydzIGVsXG4gICAgYXNzaWduIDogZnVuY3Rpb24gKHNlbGVjdG9yLCB2aWV3KSB7XG4gICAgICAgIHZhciBzZWxlY3RvcnM7XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgc2VsZWN0b3JzID0gc2VsZWN0b3I7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RvcnMgPSB7fTtcbiAgICAgICAgICAgIHNlbGVjdG9yc1tzZWxlY3Rvcl0gPSB2aWV3O1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2VsZWN0b3JzKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChzZWxlY3RvcnMsIGZ1bmN0aW9uICh2aWV3LCBzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2aWV3ID09PSBcInN0cmluZ1wiKSB2aWV3ID0gdGhpcy5fX3N1YnZpZXdzX19bdmlld107XG4gICAgICAgICAgICB2aWV3LnNldEVsZW1lbnQodGhpcy4kKHNlbGVjdG9yKSkucmVuZGVyKCk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInJlbW92YWxcIik7XG4gICAgICAgIHRoaXMudW5iaW5kKCk7XG4gICAgICAgIEJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMpO1xuICAgIH0sXG4gICAgXG4gICAgc3VidmlldzogZnVuY3Rpb24oa2V5LCB2aWV3KXtcbiAgICAgICAgLy8gU2V0IHVwIHN1YnZpZXcgb2JqZWN0XG4gICAgICAgIHZhciBzdiA9IHRoaXMuX19zdWJ2aWV3c19fID0gdGhpcy5fX3N1YnZpZXdzX18gfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBnZXR0aW5nXG4gICAgICAgIGlmICh2aWV3ID09PSB1bmRlZmluZWQpIHJldHVybiBzdltrZXldO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3RlbmVyIGZvciByZW1vdmFsIGV2ZW50XG4gICAgICAgIHZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHZpZXcucmVtb3ZlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB0aGUga2V5XG4gICAgICAgIHN2W2tleV0gPSB2aWV3O1xuICAgICAgICBcbiAgICAgICAgLy8gQWxsb3cgY2hhaW5pbmdcbiAgICAgICAgcmV0dXJuIHZpZXdcbiAgICB9XG4gICAgXG59KTtcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXciLCJ2YXIgRmlsdGVycyA9IHJlcXVpcmUoXCIuL0ZpbHRlcnNcIik7XG52YXIgU29ydHMgPSByZXF1aXJlKFwiLi9Tb3J0c1wiKTtcbnZhciBGb3JtYXRzID0gcmVxdWlyZShcIi4vRm9ybWF0c1wiKTtcbnZhciBDb2x1bW4gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIFxuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIGlkOiBcIlwiLFxuICAgICAgICBrZXk6IFwiXCIsXG4gICAgICAgIGxhYmVsOiBcIlwiLFxuICAgICAgICBzb3J0OiB1bmRlZmluZWQsXG4gICAgICAgIGZpbHRlcjogdW5kZWZpbmVkLFxuICAgICAgICBmb3JtYXQ6IHVuZGVmaW5lZCxcbiAgICAgICAgc2VsZWN0OiBmYWxzZSxcbiAgICAgICAgZmlsdGVyX3ZhbHVlOiBcIlwiLFxuICAgICAgICBzb3J0X3ZhbHVlOiBcIlwiLFxuICAgICAgICBsb2NrX3dpZHRoOiBmYWxzZVxuICAgIH0sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBmaWx0ZXJcbiAgICAgICAgdmFyIGZpbHRlciA9IHRoaXMuZ2V0KFwiZmlsdGVyXCIpO1xuICAgICAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJzdHJpbmdcIiAmJiBGaWx0ZXJzLmhhc093blByb3BlcnR5KGZpbHRlcikpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiZmlsdGVyXCIsIEZpbHRlcnNbZmlsdGVyXSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBzb3J0XG4gICAgICAgIHZhciBzb3J0ID0gdGhpcy5nZXQoXCJzb3J0XCIpO1xuICAgICAgICBpZiAodHlwZW9mIHNvcnQgPT09IFwic3RyaW5nXCIgJiYgU29ydHMuaGFzT3duUHJvcGVydHkoc29ydCkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwic29ydFwiLCBTb3J0c1tzb3J0XSh0aGlzLmdldChcImtleVwiKSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZm9ybWF0XG4gICAgICAgIHZhciBzZWxlY3QgPSB0aGlzLmdldCgnc2VsZWN0Jyk7XG4gICAgICAgIGlmIChzZWxlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KFwiZm9ybWF0XCIsIEZvcm1hdHMuc2VsZWN0ICk7XG4gICAgICAgICAgICB0aGlzLnNldChcInNlbGVjdF9rZXlcIiwgdGhpcy5nZXQoXCJrZXlcIikpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0pTT04oKTtcbiAgICB9LFxuICAgIFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGF0dHJzLndpZHRoIDwgYXR0cnMubWluX2NvbHVtbl93aWR0aCkgcmV0dXJuIFwiQSBjb2x1bW4gd2lkdGggY2Fubm90IGJlID0+IDBcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChhdHRycy5sb2NrX3dpZHRoID09PSB0cnVlICYmIGF0dHJzLndpZHRoID4gMCkgcmV0dXJuIFwiVGhpcyBjb2x1bW4gaGFzIGEgbG9ja2VkIHdpZHRoXCI7XG4gICAgICAgIFxuICAgIH0sXG4gICAgXG4gICAgZ2V0S2V5OiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuZ2V0KHRoaXMuZ2V0KCdrZXknKSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRGb3JtYXR0ZWQ6IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgICAgIHZhciBmbiA9IHRoaXMuZ2V0KCdmb3JtYXQnKTtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIilcbiAgICAgICAgICAgID8gZm4odGhpcy5nZXRLZXkobW9kZWwpLCBtb2RlbClcbiAgICAgICAgICAgIDogdGhpcy5nZXRLZXkobW9kZWwpO1xuICAgIH0sXG4gICAgXG4gICAgc29ydEluZGV4OiBmdW5jdGlvbihuZXdJbmRleCkge1xuICAgICAgICB2YXIgc29ydHMgPSB0aGlzLmNvbGxlY3Rpb24uY29sX3NvcnRzO1xuICAgICAgICBpZiAodHlwZW9mIG5ld0luZGV4ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gc29ydHMuaW5kZXhPZih0aGlzLmdldChcImlkXCIpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjdXJJZHggPSB0aGlzLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgaWQgPSBzb3J0cy5zcGxpY2UoY3VySWR4LCAxKVswXTtcbiAgICAgICAgc29ydHMuc3BsaWNlKG5ld0luZGV4LCAwLCBpZCk7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5zb3J0KCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBDb2x1bW5zID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIFxuICAgIG1vZGVsOiBDb2x1bW4sXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24obW9kZWxzLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIF8uZWFjaChtb2RlbHMsIHRoaXMuc2V0TWluV2lkdGgsIHRoaXMpO1xuICAgICAgICB0aGlzLnJvd19zb3J0cyA9IHRoaXMuZ2V0SW5pdGlhbFJvd1NvcnRzKG1vZGVscyk7XG4gICAgICAgIHRoaXMuY29sX3NvcnRzID0gdGhpcy5nZXRJbml0aWFsQ29sU29ydHMobW9kZWxzKTtcbiAgICAgICAgdGhpcy5vbihcImNoYW5nZTpzb3J0X3ZhbHVlXCIsIHRoaXMub25Tb3J0Q2hhbmdlKTtcbiAgICB9LFxuICAgIFxuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGNvbDEsIGNvbDIpIHtcbiAgICAgICAgdmFyIGlkeDEgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDEuZ2V0KFwiaWRcIikpO1xuICAgICAgICB2YXIgaWR4MiA9IHRoaXMuY29sX3NvcnRzLmluZGV4T2YoY29sMi5nZXQoXCJpZFwiKSk7XG4gICAgICAgIHJldHVybiBpZHgxIC0gaWR4MjtcbiAgICB9LFxuICAgIFxuICAgIC8vIHJlc2V0Q29tcGFyYXRvcjogZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIHRoaXMuY29tcGFyYXRvciA9IGZ1bmN0aW9uKGNvbDEsIGNvbDIpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5jb2xfc29ydHNcIiwgdGhpcy5jb2xfc29ydHMpO1xuICAgIC8vICAgICAgICAgdmFyIGlkeDEgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDEuZ2V0KFwiaWRcIikpO1xuICAgIC8vICAgICAgICAgdmFyIGlkeDIgPSB0aGlzLmNvbF9zb3J0cy5pbmRleE9mKGNvbDIuZ2V0KFwiaWRcIikpO1xuICAgIC8vICAgICAgICAgcmV0dXJuIGlkeDEgLSBpZHgyO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHRoaXMuc29ydCgpO1xuICAgIC8vIH1cbiAgICBcbiAgICBzZXRNaW5XaWR0aDogZnVuY3Rpb24obW9kZWwpIHtcbiAgICAgICAgaWYgKG1vZGVsLmhhc093blByb3BlcnR5KCdtaW5fY29sdW1uX3dpZHRoJykpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIG1vZGVsWydtaW5fY29sdW1uX3dpZHRoJ10gPSB0aGlzLm9wdGlvbnMubWluX2NvbHVtbl93aWR0aDtcbiAgICB9LFxuICAgIFxuICAgIGdldEluaXRpYWxSb3dTb3J0czogZnVuY3Rpb24obW9kZWxzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlZmF1bHRTb3J0cyA9IF8ucGx1Y2sobW9kZWxzLCBcImlkXCIpO1xuICAgICAgICB2YXIgc29ydHM7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucm93X3NvcnRzKSB7XG4gICAgICAgICAgICBzb3J0cyA9IHRoaXMub3B0aW9ucy5yb3dfc29ydHM7XG4gICAgICAgICAgICBpZiAoICEgKF8uZXZlcnkoc29ydHMsIGZ1bmN0aW9uKHNvcnQpIHsgcmV0dXJuIGRlZmF1bHRTb3J0cy5pbmRleE9mKHNvcnQpID4gLTEgfSkpICkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9uZSBvciBtb3JlIHZhbHVlcyBpbiB0aGUgJ3Jvd19zb3J0cycgb3B0aW9uIGRvZXMgbm90IG1hdGNoIGEgY29sdW1uIGlkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ydHMgPSBfLnJlZHVjZShtb2RlbHMsZnVuY3Rpb24obWVtbywgY29sdW1uKXsgXG4gICAgICAgICAgICAgICAgaWYgKGNvbHVtblsnc29ydF92YWx1ZSddKSBcbiAgICAgICAgICAgICAgICAgICAgbWVtby5wdXNoKGNvbHVtbltcImlkXCJdKTsgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgICAgICB9LFtdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc29ydHM7XG4gICAgfSxcbiAgICBcbiAgICBnZXRJbml0aWFsQ29sU29ydHM6IGZ1bmN0aW9uKG1vZGVscykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWZhdWx0U29ydHMgPSBfLnBsdWNrKG1vZGVscywgXCJpZFwiKTtcbiAgICAgICAgdmFyIHNvcnRzO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNvbF9zb3J0cykge1xuICAgICAgICAgICAgc29ydHMgPSB0aGlzLm9wdGlvbnMuY29sX3NvcnRzO1xuICAgICAgICAgICAgaWYgKCAhIChfLmV2ZXJ5KHNvcnRzLCBmdW5jdGlvbihzb3J0KSB7IHJldHVybiBkZWZhdWx0U29ydHMuaW5kZXhPZihzb3J0KSA+IC0xIH0pKSApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmUgb3IgbW9yZSB2YWx1ZXMgaW4gdGhlICdjb2xfc29ydHMnIG9wdGlvbiBkb2VzIG5vdCBtYXRjaCBhIGNvbHVtbiBpZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvcnRzID0gZGVmYXVsdFNvcnRzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3J0cztcbiAgICB9LFxuICAgIFxuICAgIG9uU29ydENoYW5nZTogZnVuY3Rpb24obW9kZWwsIHZhbHVlKSB7XG4gICAgICAgIHZhciBpZCA9IG1vZGVsLmdldChcImlkXCIpO1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnJvd19zb3J0cy5pbmRleE9mKGlkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvd19zb3J0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yb3dfc29ydHMucHVzaChpZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51cGRhdGVDb21wYXJhdG9yKCk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVDb21wYXJhdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMucm93X3NvcnRzLmxlbmd0aCAhPT0gMCl7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgY29tcGFyYXRvciA9IGZ1bmN0aW9uKHJvdzEsIHJvdzIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzZWxmLnJvd19zb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBzZWxmLnJvd19zb3J0c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYuZ2V0KGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gY29sdW1uLmdldChcInNvcnRcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbHVtbi5nZXQoXCJzb3J0X3ZhbHVlXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydF9yZXN1bHQgPSB2YWx1ZSA9PSBcImFcIiA/IGZuKHJvdzEsIHJvdzIpIDogZm4ocm93Miwgcm93MSkgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydF9yZXN1bHQgIT0gMCkgcmV0dXJuIHNvcnRfcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyKFwiY2hhbmdlOmNvbXBhcmF0b3JcIiwgY29tcGFyYXRvcik7XG4gICAgfVxuICAgIFxufSk7XG5cbmV4cG9ydHMubW9kZWwgPSBDb2x1bW47XG5leHBvcnRzLmNvbGxlY3Rpb24gPSBDb2x1bW5zOyIsInZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vQmFzZVZpZXcnKTtcblxuLy8gdmFyIFRkYXRhID0gQmFzZVZpZXcuZXh0ZW5kKHtcbi8vICAgICBcbi8vICAgICBjbGFzc05hbWU6ICd0ZCcsXG4vLyAgICAgXG4vLyAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucyl7XG4vLyAgICAgICAgIHRoaXMuY29sdW1uID0gb3B0aW9ucy5jb2x1bW47XG4vLyAgICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2x1bW4sIFwiY2hhbmdlOndpZHRoXCIsIGZ1bmN0aW9uKGNvbHVtbiwgd2lkdGgpe1xuLy8gICAgICAgICAgICAgdGhpcy4kZWwud2lkdGgod2lkdGgpO1xuLy8gICAgICAgICB9KTtcbi8vICAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTpcIit0aGlzLmNvbHVtbi5nZXQoXCJrZXlcIiksIHRoaXMucmVuZGVyICk7XG4vLyAgICAgfSxcbi8vICAgICBcbi8vICAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PC9kaXY+Jyxcbi8vICAgICBcbi8vICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnY29sLScrdGhpcy5jb2x1bW4uaWQpLndpZHRoKHRoaXMuY29sdW1uLmdldCgnd2lkdGgnKSk7XG4vLyAgICAgICAgIHRoaXMuZWwuaW5uZXJIVE1MID0gdGhpcy50ZW1wbGF0ZTtcbi8vICAgICAgICAgLy8gdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKTtcbi8vICAgICAgICAgdGhpcy4kKFwiLmNlbGwtaW5uZXJcIikuYXBwZW5kKCB0aGlzLmNvbHVtbi5nZXRGb3JtYXR0ZWQodGhpcy5tb2RlbCkgKTtcbi8vICAgICAgICAgcmV0dXJuIHRoaXM7XG4vLyAgICAgfVxuLy8gICAgIFxuLy8gfSk7XG5cbnZhciBUcm93ID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBjbGFzc05hbWU6ICd0cicsXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2VcIiwgdGhpcy5yZW5kZXIpO1xuICAgIH0sXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwicmVtb3ZhbFwiKTtcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICB2YXIgaWQgPSBjb2x1bW4uZ2V0KCdpZCcpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1uLmdldCgnd2lkdGgnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBjb2x1bW4uZ2V0Rm9ybWF0dGVkKHRoaXMubW9kZWwpO1xuICAgICAgICAgICAgdmFyICR2aWV3ID0gJCgnPGRpdiBjbGFzcz1cInRkIGNvbC0nK2lkKydcIiBzdHlsZT1cIndpZHRoOicrd2lkdGgrJ3B4XCI+PGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICR2aWV3LmZpbmQoJy5jZWxsLWlubmVyJykuYXBwZW5kKGZvcm1hdHRlZCk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoJHZpZXcpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn0pO1xuXG52YXIgVGJvZHkgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gb3B0aW9ucy5jb2x1bW5zO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sbGVjdGlvbiwgXCJyZXNldFwiLCB0aGlzLnJlbmRlcik7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5jb2xsZWN0aW9uLCBcInNvcnRcIiwgdGhpcy5yZW5kZXIpO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMuY29sdW1ucywgXCJjaGFuZ2U6d2lkdGhcIiwgdGhpcy5hZGp1c3RDb2x1bW5XaWR0aCApXG4gICAgfSxcbiAgICBcbiAgICBhZGp1c3RDb2x1bW5XaWR0aDogZnVuY3Rpb24obW9kZWwsIG5ld1dpZHRoLCBvcHRpb25zKXtcbiAgICAgICAgdGhpcy4kKCcudGQuY29sLScrbW9kZWwuZ2V0KFwiaWRcIikpLndpZHRoKG5ld1dpZHRoKTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInJlbW92YWxcIik7XG4gICAgICAgIHZhciBzdGFydFRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24ocm93KXtcbiAgICAgICAgICAgIHZhciByb3dWaWV3ID0gbmV3IFRyb3coe1xuICAgICAgICAgICAgICAgIG1vZGVsOiByb3csXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2x1bW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICggdGhpcy5wYXNzZXNGaWx0ZXJzKHJvdykgKSB0aGlzLiRlbC5hcHBlbmQoIHJvd1ZpZXcucmVuZGVyKCkuZWwgKTtcbiAgICAgICAgICAgIHJvd1ZpZXcubGlzdGVuVG8odGhpcywgXCJyZW1vdmFsXCIsIHJvd1ZpZXcucmVtb3ZlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIHZhciBlbGFwc2VkVGltZSA9ICtuZXcgRGF0ZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zb2xlLmxvZyhcImVsYXBzZWRUaW1lXCIsZWxhcHNlZFRpbWUvMTAwMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgcGFzc2VzRmlsdGVyczogZnVuY3Rpb24ocm93KXtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sdW1ucy5ldmVyeShmdW5jdGlvbihjb2x1bW4pe1xuICAgICAgICAgICAgaWYgKGNvbHVtbi5nZXQoJ2ZpbHRlcl92YWx1ZScpID09IFwiXCIgfHwgdHlwZW9mIGNvbHVtbi5nZXQoJ2ZpbHRlcicpICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFzc2VzRmlsdGVyKHJvdywgY29sdW1uKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSxcbiAgICBcbiAgICBwYXNzZXNGaWx0ZXI6IGZ1bmN0aW9uKHJvdywgY29sdW1uKXtcbiAgICAgICAgcmV0dXJuIGNvbHVtbi5nZXQoJ2ZpbHRlcicpKCBjb2x1bW4uZ2V0KCdmaWx0ZXJfdmFsdWUnKSwgcm93LmdldChjb2x1bW4uZ2V0KCdrZXknKSksIGNvbHVtbi5nZXRGb3JtYXR0ZWQocm93KSwgcm93ICk7XG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUYm9keTsiLCJ2YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL0Jhc2VWaWV3Jyk7XG5cbnZhciBUaENlbGwgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIGNsYXNzTmFtZTogJ3RoJyxcbiAgICBcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZSgnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIiB0aXRsZT1cIjwlPSBsYWJlbCAlPlwiPjxzcGFuIGNsYXNzPVwidGgtaGVhZGVyXCI+PCU9IGxhYmVsICU+PC9zcGFuPjwvZGl2PjwlIGlmKGxvY2tfd2lkdGggIT09IHRydWUpIHslPjxzcGFuIGNsYXNzPVwicmVzaXplXCI+PC9zcGFuPjwlfSU+JyksXG4gICAgXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubGlzdGVuVG8odGhpcy5tb2RlbCwgXCJjaGFuZ2U6c29ydF92YWx1ZVwiLCB0aGlzLnJlbmRlciApO1xuICAgICAgICB0aGlzLmxpc3RlblRvKHRoaXMubW9kZWwsIFwiY2hhbmdlOndpZHRoXCIsIGZ1bmN0aW9uKG1vZGVsLCB3aWR0aCkge1xuICAgICAgICAgICAgdGhpcy4kZWwud2lkdGgod2lkdGgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBqc29uID0gdGhpcy5tb2RlbC5zZXJpYWxpemUoKTtcbiAgICAgICAgdmFyIHNvcnRfY2xhc3MgPSBqc29uLnNvcnRfdmFsdWUgPyAoanNvbi5zb3J0X3ZhbHVlID09IFwiZFwiID8gXCJkZXNjXCIgOiBcImFzY1wiICkgOiBcIlwiIDtcbiAgICAgICAgdGhpcy4kZWxcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYXNjIGRlc2MnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjb2wtJytqc29uLmlkK1wiIFwiK3NvcnRfY2xhc3MpXG4gICAgICAgICAgICAud2lkdGgoanNvbi53aWR0aClcbiAgICAgICAgICAgIC5odG1sKHRoaXMudGVtcGxhdGUoanNvbikpO1xuICAgICAgICBpZiAoc29ydF9jbGFzcyAhPT0gXCJcIikge1xuICAgICAgICAgICAgdGhpcy4kKFwiLnRoLWhlYWRlclwiKS5wcmVwZW5kKCc8aSBjbGFzcz1cIicrc29ydF9jbGFzcysnLWljb25cIj48L2k+ICcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwibW91c2Vkb3duIC5yZXNpemVcIjogXCJncmFiUmVzaXplclwiLFxuICAgICAgICBcImRibGNsaWNrIC5yZXNpemVcIjogXCJmaXRUb0NvbnRlbnRcIixcbiAgICAgICAgXCJtb3VzZXVwIC50aC1oZWFkZXJcIjogXCJjaGFuZ2VDb2x1bW5Tb3J0XCIsXG4gICAgICAgIFwibW91c2Vkb3duXCI6IFwiZ3JhYkNvbHVtblwiXG4gICAgfSxcbiAgICBcbiAgICBncmFiUmVzaXplcjogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG1vdXNlWCA9IGV2dC5jbGllbnRYO1xuICAgICAgICB2YXIgY29sdW1uV2lkdGggPSB0aGlzLm1vZGVsLmdldChcIndpZHRoXCIpO1xuICAgICAgICAvLyBIYW5kbGVyIGZvciB3aGVuIG1vdXNlIGlzIG1vdmluZ1xuICAgICAgICB2YXIgY29sX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IHNlbGYubW9kZWw7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gZXZ0LmNsaWVudFggLSBtb3VzZVg7XG4gICAgICAgICAgICB2YXIgbmV3V2lkdGggPSBjb2x1bW5XaWR0aCArIGNoYW5nZTtcbiAgICAgICAgICAgIGlmICggbmV3V2lkdGggPCAoY29sdW1uLmdldChcIm1pbl9jb2x1bW5fd2lkdGhcIikgfHwgc2VsZi5vcHRpb25zLm1pbl9jb2x1bW5fd2lkdGgpICkgcmV0dXJuO1xuICAgICAgICAgICAgY29sdW1uLnNldCh7XCJ3aWR0aFwiOiBuZXdXaWR0aH0sIHt2YWxpZGF0ZTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjbGVhbnVwX3Jlc2l6ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBjb2xfcmVzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKFwibW91c2Vtb3ZlXCIsIGNvbF9yZXNpemUpO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCBjbGVhbnVwX3Jlc2l6ZSk7XG4gICAgfSxcbiAgICBcbiAgICBmaXRUb0NvbnRlbnQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB2YXIgbmV3X3dpZHRoID0gMDtcbiAgICAgICAgdmFyIG1pbl93aWR0aCA9IHRoaXMubW9kZWwuZ2V0KCdtaW5fY29sdW1uX3dpZHRoJyk7XG4gICAgICAgIHZhciBpZCA9IHRoaXMubW9kZWwuZ2V0KCdpZCcpO1xuICAgICAgICB2YXIgJGN0eCA9IHRoaXMuJGVsLnBhcmVudHMoJy50YWJsZWQnKS5maW5kKCcudGJvZHknKTtcbiAgICAgICAgJChcIi50ZC5jb2wtXCIraWQrXCIgLmNlbGwtaW5uZXJcIiwgJGN0eCkuZWFjaChmdW5jdGlvbihpLCBlbCl7XG4gICAgICAgICAgICBuZXdfd2lkdGggPSBNYXRoLm1heChuZXdfd2lkdGgsJCh0aGlzKS5vdXRlcldpZHRoKHRydWUpLCBtaW5fd2lkdGgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeyd3aWR0aCc6bmV3X3dpZHRofSx7dmFsaWRhdGU6IHRydWV9KTtcbiAgICB9LFxuICAgIFxuICAgIGNoYW5nZUNvbHVtblNvcnQ6IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBcbiAgICAgICAgdmFyIG1vZGVsID0gdGhpcy5tb2RlbDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgbW9kZWwuZ2V0KFwic29ydFwiKSAhPT0gXCJmdW5jdGlvblwiIHx8IG1vZGVsLmdldChcIm1vdmluZ1wiKSA9PT0gdHJ1ZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgdmFyIGN1cl9zb3J0ID0gbW9kZWwuZ2V0KFwic29ydF92YWx1ZVwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghZXZ0LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIGFsbCBzb3J0c1xuICAgICAgICAgICAgbW9kZWwuY29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNvbCl7XG4gICAgICAgICAgICAgICAgaWYgKGNvbCAhPT0gbW9kZWwpIGNvbC5zZXQoe1wic29ydF92YWx1ZVwiOiBcIlwifSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2goY3VyX3NvcnQpIHtcbiAgICAgICAgICAgIGNhc2UgXCJcIjpcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoXCJzb3J0X3ZhbHVlXCIsIFwiYVwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJhXCI6XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KFwic29ydF92YWx1ZVwiLCBcImRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZFwiOlxuICAgICAgICAgICAgICAgIG1vZGVsLnNldChcInNvcnRfdmFsdWVcIiwgXCJcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIGdyYWJDb2x1bW46IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZ0Lm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBtb3VzZVggPSBldnQuY2xpZW50WDtcbiAgICAgICAgdmFyIG9mZnNldFggPSBldnQub2Zmc2V0WDtcbiAgICAgICAgdmFyIHRocmVzaG9sZHMgPSBbXTtcbiAgICAgICAgdmFyIGN1cnJlbnRJZHggPSB0aGlzLm1vZGVsLnNvcnRJbmRleCgpO1xuICAgICAgICB2YXIgJHRyID0gdGhpcy4kZWwucGFyZW50KCk7XG4gICAgICAgICR0ci5maW5kKCcudGgnKS5lYWNoKGZ1bmN0aW9uKGksZWwpe1xuICAgICAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIHZhciBvZmZzZXQgPSAkdGhpcy5vZmZzZXQoKS5sZWZ0O1xuICAgICAgICAgICAgdmFyIGhhbGYgPSAkdGhpcy53aWR0aCgpIC8gMjtcbiAgICAgICAgICAgIGlmIChpICE9IGN1cnJlbnRJZHgpIHRocmVzaG9sZHMucHVzaChvZmZzZXQraGFsZik7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcHJldmVudF9tb3VzZXVwID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB2YXIgZ2V0TmV3SW5kZXggPSBmdW5jdGlvbihwb3MpIHtcbiAgICAgICAgICAgIHZhciBuZXdJZHggPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgdGhyZXNob2xkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSB0aHJlc2hvbGRzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwb3MgPiB2YWwpIG5ld0lkeCsrO1xuICAgICAgICAgICAgICAgIGVsc2UgcmV0dXJuIG5ld0lkeDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gbmV3SWR4O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgZHJhd0hlbHBlciA9IGZ1bmN0aW9uKG5ld0lkeCkge1xuICAgICAgICAgICAgJHRyLmZpbmQoJy5jb2xzb3J0LWhlbHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgaWYgKG5ld0lkeCA9PSBjdXJyZW50SWR4KSByZXR1cm47XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gbmV3SWR4IDwgY3VycmVudElkeCA/ICdiZWZvcmUnIDogJ2FmdGVyJztcbiAgICAgICAgICAgICR0ci5maW5kKCcudGg6ZXEoJytuZXdJZHgrJyknKVttZXRob2RdKCc8ZGl2IGNsYXNzPVwiY29sc29ydC1oZWxwZXJcIj48L2Rpdj4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIG1vdmVfY29sdW1uID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgICB2YXIgY3VyTW91c2UgPSBldnQuY2xpZW50WDtcbiAgICAgICAgICAgIHZhciBjaGFuZ2UgPSBjdXJNb3VzZSAtIG1vdXNlWDtcbiAgICAgICAgICAgIHNlbGYuJGVsLmNzcyh7J2xlZnQnOmNoYW5nZSwgJ29wYWNpdHknOjAuNSwgJ3pJbmRleCc6IDEwfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBuZXdJZHggPSBnZXROZXdJbmRleChjdXJNb3VzZSwgdGhyZXNob2xkcyk7XG4gICAgICAgICAgICBkcmF3SGVscGVyKG5ld0lkeCk7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCgnbW92aW5nJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBjbGVhbnVwX21vdmUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHNlbGYuJGVsLmNzcyh7J2xlZnQnOiAwLCAnb3BhY2l0eSc6MX0pO1xuICAgICAgICAgICAgJHRyLmZpbmQoJy5jb2xzb3J0LWhlbHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgdmFyIGN1ck1vdXNlID0gZXZ0LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gY3VyTW91c2UgLSBtb3VzZVg7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNvcnRJbmRleChnZXROZXdJbmRleChjdXJNb3VzZSwgdGhyZXNob2xkcykpO1xuICAgICAgICAgICAgJCh3aW5kb3cpLm9mZihcIm1vdXNlbW92ZVwiLCBtb3ZlX2NvbHVtbik7XG4gICAgICAgICAgICBzZWxmLm1vZGVsLnNldCgnbW92aW5nJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oXCJtb3VzZW1vdmVcIiwgbW92ZV9jb2x1bW4pO1xuICAgICAgICAkKHdpbmRvdykub25lKFwibW91c2V1cFwiLCBjbGVhbnVwX21vdmUpXG4gICAgfVxufSk7XG5cbnZhciBUaFJvdyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gY2xlYXIgaXRcbiAgICAgICAgdGhpcy4kZWwuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBlYWNoIHRoIGNlbGxcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IFRoQ2VsbCh7IG1vZGVsOiBjb2x1bW4gfSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQoIHZpZXcucmVuZGVyKCkuZWwgKVxuICAgICAgICAgICAgdmlldy5saXN0ZW5Ubyh0aGlzLCBcInJlbW92YWxcIiwgdmlldy5yZW1vdmUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBGaWx0ZXJDZWxsID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLm1vZGVsLCBcImNoYW5nZTp3aWR0aFwiLCBmdW5jdGlvbihjb2x1bW4sIHdpZHRoKXtcbiAgICAgICAgICAgIHRoaXMuJGVsLndpZHRoKHdpZHRoKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cImNlbGwtaW5uZXJcIj48aW5wdXQgY2xhc3M9XCJmaWx0ZXJcIiB0eXBlPVwic2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJmaWx0ZXJcIiAvPjwvZGl2PicsXG4gICAgXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGZuID0gdGhpcy5tb2RlbC5nZXQoJ2ZpbHRlcicpO1xuICAgICAgICB2YXIgbWFya3VwID0gdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIgPyB0aGlzLnRlbXBsYXRlIDogXCJcIiA7XG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCd0ZCBjb2wtJyt0aGlzLm1vZGVsLmdldCgnaWQnKSkud2lkdGgodGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykpO1xuICAgICAgICB0aGlzLiRlbC5odG1sKG1hcmt1cCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIFwiY2xpY2sgLmZpbHRlclwiOiBcInVwZGF0ZUZpbHRlclwiLFxuICAgICAgICBcImtleXVwIC5maWx0ZXJcIjogXCJ1cGRhdGVGaWx0ZXJEZWxheWVkXCJcbiAgICB9LFxuICAgIFxuICAgIHVwZGF0ZUZpbHRlcjogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdmaWx0ZXJfdmFsdWUnLCAkLnRyaW0odGhpcy4kKCcuZmlsdGVyJykudmFsKCkpICk7XG4gICAgfSxcbiAgICBcbiAgICB1cGRhdGVGaWx0ZXJEZWxheWVkOiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlRmlsdGVyVGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMudXBkYXRlRmlsdGVyVGltZW91dClcbiAgICAgICAgdGhpcy51cGRhdGVGaWx0ZXJUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLnVwZGF0ZUZpbHRlci5iaW5kKHRoaXMsIGV2dCksIDIwMCk7XG4gICAgfVxuICAgIFxufSk7XG5cbnZhciBGaWx0ZXJSb3cgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNsZWFyIGl0XG4gICAgICAgIHRoaXMuJGVsLmVtcHR5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInJlbW92YWxcIilcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBlYWNoIHRoIGNlbGxcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24oY29sdW1uKXtcbiAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IEZpbHRlckNlbGwoeyBtb2RlbDogY29sdW1uIH0pO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKCB2aWV3LnJlbmRlcigpLmVsICk7XG4gICAgICAgICAgICB2aWV3Lmxpc3RlblRvKHRoaXMsIFwicmVtb3ZhbFwiLCB2aWV3LnJlbW92ZSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgXG59KTtcblxudmFyIFRoZWFkID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIC8vIFNldHVwIHN1YnZpZXdzXG4gICAgICAgIHRoaXMuc3VidmlldyhcInRoX3Jvd1wiLCBuZXcgVGhSb3coeyBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24gfSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMubmVlZHNGaWx0ZXJSb3coKSkge1xuICAgICAgICAgICAgdGhpcy5zdWJ2aWV3KFwiZmlsdGVyX3Jvd1wiLCBuZXcgRmlsdGVyUm93KHsgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uIH0pKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwidHIgdGgtcm93XCI+PC9kaXY+PGRpdiBjbGFzcz1cInRyIGZpbHRlci1yb3dcIj48L2Rpdj4nLFxuICAgIFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSk7XG4gICAgICAgIHRoaXMuYXNzaWduKHsgJy50aC1yb3cnIDogJ3RoX3JvdycgfSk7XG4gICAgICAgIGlmICh0aGlzLnN1YnZpZXcoJ2ZpbHRlcl9yb3cnKSkge1xuICAgICAgICAgICAgdGhpcy5hc3NpZ24oeyAnLmZpbHRlci1yb3cnIDogJ2ZpbHRlcl9yb3cnIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgdGhpcy4kKCcuZmlsdGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIG5lZWRzRmlsdGVyUm93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5zb21lKGZ1bmN0aW9uKGNvbHVtbil7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBjb2x1bW4uZ2V0KCdmaWx0ZXInKSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxufSk7XG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBUaGVhZDsiLCJleHBvcnRzLmxpa2UgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YodGVybSkgPiAtMTtcbn1cbmV4cG9ydHMuaXMgPSBmdW5jdGlvbih0ZXJtLCB2YWx1ZSwgY29tcHV0ZWRWYWx1ZSwgcm93KSB7XG4gICAgdGVybSA9IHRlcm0udG9Mb3dlckNhc2UoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIHRlcm0gPT0gdmFsdWU7XG59XG5leHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKHRlcm0sIHZhbHVlKSB7XG4gICAgdmFsdWUgKj0gMTtcbiAgICB2YXIgZmlyc3RfdHdvID0gdGVybS5zdWJzdHIoMCwyKTtcbiAgICB2YXIgZmlyc3RfY2hhciA9IHRlcm1bMF07XG4gICAgdmFyIGFnYWluc3RfMSA9IHRlcm0uc3Vic3RyKDEpKjE7XG4gICAgdmFyIGFnYWluc3RfMiA9IHRlcm0uc3Vic3RyKDIpKjE7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI8PVwiICkgcmV0dXJuIHZhbHVlIDw9IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF90d28gPT0gXCI+PVwiICkgcmV0dXJuIHZhbHVlID49IGFnYWluc3RfMiA7XG4gICAgaWYgKCBmaXJzdF9jaGFyID09IFwiPFwiICkgcmV0dXJuIHZhbHVlIDwgYWdhaW5zdF8xIDtcbiAgICBpZiAoIGZpcnN0X2NoYXIgPT0gXCI+XCIgKSByZXR1cm4gdmFsdWUgPiBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIn5cIiApIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKSA9PSBhZ2FpbnN0XzEgO1xuICAgIGlmICggZmlyc3RfY2hhciA9PSBcIj1cIiApIHJldHVybiBhZ2FpbnN0XzEgPT0gdmFsdWUgO1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpLmluZGV4T2YodGVybS50b1N0cmluZygpKSA+IC0xIDtcbn0iLCJleHBvcnRzLm51bWJlciA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpKjEgLSByb3cyLmdldChmaWVsZCkqMTtcbiAgICB9XG59XG5leHBvcnRzLnN0cmluZyA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gZnVuY3Rpb24ocm93MSxyb3cyKSB7IFxuICAgICAgICBpZiAoIHJvdzEuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPT0gcm93Mi5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSApIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gcm93MS5nZXQoZmllbGQpLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKSA+IHJvdzIuZ2V0KGZpZWxkKS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCkgPyAxIDogLTEgO1xuICAgIH1cbn0iLCJleHBvcnRzLnNlbGVjdCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlbCkge1xuICAgIHZhciBzZWxlY3Rfa2V5ID0gbW9kZWwuZ2V0KCdzZWxlY3Rfa2V5JykgfHwgJ3NlbGVjdGVkJztcbiAgICB2YXIgY2hlY2tlZCA9IG1vZGVsLmdldChzZWxlY3Rfa2V5KSA9PT0gdHJ1ZTtcbiAgICB2YXIgJHJldCA9ICQoJzxkaXYgY2xhc3M9XCJjZWxsLWlubmVyXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjwvZGl2PicpO1xuICAgIFxuICAgIC8vIFNldCBjaGVja2VkXG4gICAgdmFyICRjYiA9ICRyZXQuZmluZCgnaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgY2hlY2tlZCk7XG4gICAgXG4gICAgLy8gU2V0IGNsaWNrIGJlaGF2aW9yXG4gICAgJGNiLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoJGNiLmlzKFwiOmNoZWNrZWRcIikpIG1vZGVsLnNldChzZWxlY3Rfa2V5LCB0cnVlKTtcbiAgICAgICAgZWxzZSBtb2RlbC5zZXQoc2VsZWN0X2tleSwgZmFsc2UpO1xuICAgIH0pXG4gICAgXG4gICAgcmV0dXJuICRyZXQ7XG59Il19
;