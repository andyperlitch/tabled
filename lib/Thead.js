var BaseView = require('./BaseView');

var ThCell = BaseView.extend({
    
    className: 'th',
    
    template: _.template('<div class="cell-inner" title="{{label}}">{{label}}</div><span class="resize"></span>'),
    
    render: function() {
        var json = this.model.serialize();
        this.$el.addClass('col-'+json.id);
        this.$el.html(this.template(json));
        return this;
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
        this.filter_row = new FilterRow({ collection: this.collection });
    },
    
    template: '<div class="tr th-row"></div><div class="tr filter-row"></div>',
    
    render: function() {
        this.$el.html(this.template);
        this.assign({
            '.th-row'       : this.th_row,
            '.filter-row'   : this.filter_row
        });
        
        return this;
    }
    
});
exports = module.exports = Thead;