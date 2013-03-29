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
    }
    
});

var Columns = Backbone.Collection.extend({
    
    model: Column
    
});

exports.model = Column;
exports.collection = Columns;