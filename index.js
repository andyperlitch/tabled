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
        this.listenTo(this.columns, "change:filter_value", this.renderBody);
        this.listenTo(this.columns, "change:comparator", this.updateComparator);
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
    }

});

exports = module.exports = Tabled