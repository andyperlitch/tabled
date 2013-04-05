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