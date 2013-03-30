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
        console.log("testing");
        if (attrs.width <= attrs.min_column_width) return "A column width cannot be => 0";
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