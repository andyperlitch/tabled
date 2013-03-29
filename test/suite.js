var assert = require('assert');
describe("the Tabled module", function() {
    
    beforeEach(function() {
        this.Tabled = require('../');
        this.columns = [
            { id: "name", key: "name", label: "Name" },
            { id: "age", key: "age", label: "Age" }
        ]
        this.collection = new Backbone.Collection([
            { name: "andy", age: 24 },
            { name: "scott", age: 26 },
            { name: "tevya", age: 32 }
        ]);
        this.tabled = new this.Tabled({
            collection: this.collection,
            columns: this.columns
        });
        this.$pg = $("#playground");
    });
    
    describe("a tabled view", function() {
        
        it("should be a backbone view", function() {
            assert(this.tabled instanceof Backbone.View, "was not a backbone view");
        });
        
        it("should allow chaining from the render method", function() {
            var same = this.tabled.render();
            assert(same === this.tabled, "render did not return this for chaining");
        });
        
        it("should make the columns list into a Backbone.Collection", function() {
            assert(this.tabled.columns instanceof Backbone.Collection, "tabled.columns was not a backbone collection");
        });
        
        it("should render .tabled, .thead, and .tbody element", function() {
            this.tabled.render().$el.appendTo(this.$pg);
            assert($(".tabled", this.$pg).length, ".tabled element not found");
            assert($(".thead", this.$pg).length, ".thead element not found");
            assert($(".tbody", this.$pg).length, ".tbody element not found");
        });
        
        it("should render as many columns as columns.length", function(){
            assert.equal($(".th").length, this.tabled.columns.length , "number of th's does not match column count");
        });
        
    });
    
    afterEach(function() {
        this.tabled.remove();
    })
    
})