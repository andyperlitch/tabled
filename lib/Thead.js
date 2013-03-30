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
    
    events: {
        "mousedown .resize": "grabResizer"
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