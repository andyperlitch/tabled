;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var Tabled = require('../../');
var columns = [
    { id: "name", key: "name", label: "Name" },
    { id: "age", key: "age", label: "Age" }
]
var collection = new Backbone.Collection([
    { name: "andy", age: 24 },
    { name: "scott", age: 26 },
    { name: "tevya", age: 32 }
]);
var tabled = new Tabled({
    collection: collection,
    columns: columns,
    el: document.getElementById("table-target")
}).render();
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
        
        // Listeners
        this.listenTo(this.columns, "change:width", this.adjustInner );
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
    
    setWidths: function() {
        
        // TODO: check for saved_state widths
        
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
        this.currentWidth = adjustedWidth;
        // this.$el.width(adjustedWidth);
    },
    
    adjustInner: function() {
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
        var table_resize = function(evt){
            var change = (evt.clientX - mouseX)/self.columns.length;
            self.columns.each(function(column){
                column.set({"width":column.get("width")*1+change}, {validate:true});
            })
        } 
        var cleanup_resize = function(evt) {
            $(window).off("mousemove", table_resize);
        }
        
        $(window).on("mousemove", table_resize);
        $(window).one("mouseup", cleanup_resize);
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
},{}],4:[function(require,module,exports){
var Column = Backbone.Model.extend({
    
    defaults: {
        id: "",
        key: "",
        label: "",
        sort: undefined,
        filter: undefined,
        format: undefined,
        select: false
    },
    
    serialize: function() {
        return this.toJSON();
    },
    
    validate: function(attrs) {
        if (attrs.width < attrs.min_column_width) return "A column width cannot be => 0";
    }
    
});

var Columns = Backbone.Collection.extend({
    
    initialize: function(models, options) {
        this.options = options;
        _.each(models, this.setMinWidth, this);
    },
    
    setMinWidth: function(model) {
        if (model.hasOwnProperty('min_column_width')) return;
        
        model['min_column_width'] = this.options.min_column_width;
    },
    
    model: Column
    
});

exports.model = Column;
exports.collection = Columns;
},{}],5:[function(require,module,exports){
var BaseView = require('./BaseView');

var ThCell = BaseView.extend({
    
    className: 'th',
    
    template: _.template('<div class="cell-inner" title="<%= label %>"><%= label %></div><span class="resize"></span>'),
    
    initialize: function() {
        this.listenTo(this.model, "change:width", function(model, width) {
            this.$el.width(width);
        })
    },
    
    render: function() {
        var json = this.model.serialize();
        this.$el.addClass('col-'+json.id).width(json.width);
        this.$el.html(this.template(json));
        return this;
    },
    
    events: {
        "mousedown .resize": "grabResizer",
        "dblclick .resize": "fitToContent"
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
            column.set("width", newWidth);
        }
        var cleanup_resize = function(evt) {
            $(window).off("mousemove", col_resize);
        }
        
        $(window).on("mousemove", col_resize);
        $(window).one("mouseup", cleanup_resize);
    },
    
    fitToContent: function(evt) {
        var new_width = 0;
        var min_width = this.model.get('min_column_width');
        var id = this.model.get('id');
        $(".td.col-"+id+" .cell-inner").each(function(i, el){
            new_width = Math.max(new_width,$(this).outerWidth(true), min_width);
        });
        this.model.set({'width':new_width},{validate: true});
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
    
});

var FilterRow = BaseView.extend({
    
    
    
});
var Thead = BaseView.extend({
    
    initialize: function(options) {
        this.th_row     = new ThRow({ collection: this.collection });
        if (this.needsFilterRow()) this.filter_row = new FilterRow({ collection: this.collection });
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
            if (typeof column.get('filter') === 'function') needs_it = true;
        });
        return needs_it;
    }
    
});
exports = module.exports = Thead;
},{"./BaseView":3}],6:[function(require,module,exports){
var BaseView = require('./BaseView');

var Tdata = BaseView.extend({
    
    className: 'td',
    
    initialize: function(options){
        this.column = options.column;
        this.listenTo(this.column, "change:width", function(column, width){
            this.$el.width(width);
        })
    },
    
    template: '<div class="cell-inner"></div>',
    
    render: function() {
        this.$el.addClass('col-'+this.column.id).width(this.column.get('width'));
        this.$el.html(this.template);
        this.$(".cell-inner").append( this.getFormatted() );
        return this;
    },
    
    getKey: function() {
        return this.model.get(this.column.get('key'));
    },
    
    getFormatted: function() {
        var fn = this.column.get('format');
        return (typeof fn === "function")
            ? fn(this.getKey(), this.model)
            : this.getKey();
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
            this.$el.append( tdView.render().el );
        }, this);
        
        return this;
    }
    
});

var Tbody = BaseView.extend({
    
    initialize: function(options) {
        this.columns = options.columns;
        this.listenTo(this.collection, "reset", this.render);
    },
    
    render: function() {
        
        this.$el.empty();
        this.collection.each(function(row){
            var rowView = new Trow({
                model: row,
                collection: this.columns
            });
            this.$el.append( rowView.render().el );
        }, this);
        
        return this;
    }
    
});
exports = module.exports = Tbody;
},{"./BaseView":3}]},{},[1])
;