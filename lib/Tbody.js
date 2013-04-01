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
        this.$(".cell-inner").append( this.column.getFormatted(this.model) );
        return this;
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
            if ( this.passesFilters(row) ) this.$el.append( rowView.render().el );
        }, this);
        
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