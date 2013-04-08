var BaseView = require('./lib/BaseView');
var Column = require('./lib/Column').model;
var Columns = require('./lib/Column').collection;
var Thead = require('./lib/Thead');
var Tbody = require('./lib/Tbody');

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
        totalRows: 0
    },
    
    validate: function(attrs) {
        var total_rows = attrs.collection.length;
        
        if ( attrs.offset > Math.max(attrs.max_rows, total_rows) - attrs.max_rows ) {
            return "Offset cannot be that high.";
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