var BaseView = require('./lib/BaseView');
var Column = require('./lib/Column').model;
var Columns = require('./lib/Column').collection;
var Thead = require('./lib/Thead');
var Tbody = require('./lib/Tbody');
var Tabled = BaseView.extend({
    
    initialize: function(options) {

        // Columns
        this.columns = new Columns(options.columns);
        
        // Subviews
        this.thead = new Thead({
            collection: this.columns
        });
        
    },
    
    template: '<div class="tabled"><div class="thead"></div><div class="tbody"></div></div>',
    
    render: function() {
        this.$el.html(this.template);
        this.assign({
            '.thead': this.thead
        })
        return this;
    }
    
});

exports = module.exports = Tabled