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