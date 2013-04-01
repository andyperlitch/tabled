var assert = require('assert');
describe("the Tabled module", function() {
    
    describe("a simple tabled view", function() {
        
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
                columns: this.columns,
                table_width: 500
            });
            this.$pg = $("#playground");
            this.tabled.render().$el.appendTo(this.$pg);
        });
        
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
        
        it("should set a min column width on all columns", function() {
            this.tabled.columns.each(function(column){
                assert(column.get('min_column_width'), "A column did not have a min_column_width");
            })
        });
        
        it("should render .tabled, .thead, and .tbody element", function() {
            assert($(".tabled", this.$pg).length, ".tabled element not found");
            assert($(".thead", this.$pg).length, ".thead element not found");
            assert($(".tbody", this.$pg).length, ".tbody element not found");
        });
        
        it("should render as many columns as columns.length", function(){
            assert.equal($(".th").length, this.tabled.columns.length , "number of th's does not match column count");
        });
        
        it("should fill .th's with the labels", function() {
            var name = $(".th .cell-inner").filter(":eq(0)").text();
            var age = $(".th .cell-inner").filter(":eq(1)").text();
            assert.equal(name, this.columns[0].label, "'Name' was not the text of the first th");
            assert.equal(age, this.columns[1].label, "'Age' was not the text of the second th");
        });
        
        it("should render as many rows as the collection length", function() {
            assert.equal($(".tbody .tr", this.$pg).length, this.collection.length );
        });
        
        it("should have columns*rows number of td's", function() {
            assert.equal( $(".tbody .td", this.$pg).length, this.collection.length * this.tabled.columns.length, "table does not have the right amount of td's");
        });
        
        it("should store all widths in the columns", function() {
            this.tabled.columns.each(function(column){
                assert(column.get('width') != undefined);
                assert(typeof column.get('width') !== "undefined" );
            })
        })
        
        it("should add col-[id] classes to each row", function() {
            var ids = this.tabled.columns.pluck('id');
            var expected_length = this.collection.length;
            ids.forEach(function(id, i){
                assert.equal(expected_length, $(".tbody .td.col-"+id).length, "wrong number of .col-"+id+" tds");
            });
        });

        it("should fill tds with a .cell-inner element containing the row data", function() {
            var $rows = this.$pg.find(".tbody .tr");
            this.collection.each(function(data, i){
                var name = $rows.filter(":eq("+i+")").find(".td:eq(0) .cell-inner").text();
                var age = $rows.filter(":eq("+i+")").find(".td:eq(1) .cell-inner").text();
                assert.equal(data.get('name'), name, "row name did not match data name");
                assert.equal(data.get('age'), age, "row age did not match data age");
            }, this);
        });
        
        it("should set the widths of all .td elements to greater than or equal to the minimum column width", function() {
            var min_col_width = this.tabled.options.min_column_width;
            this.$pg.find(".th, .td").each(function(i, el) {
                assert( $(this).width() >= min_col_width , "cell width(s) were not greater than 0 ("+i+")" );
            });
        });
        
        it("should not have a filter row if there are no filters", function() {
            assert.equal( $('.filter-row', this.$pg ).length, 0 , "There is a filter row even though no columns have a filter");
        });
        
        it("should have size-adjustable columns", function() {
            var resizer = $('.resize:eq(0)', this.$pg);
            assert(resizer, "resizers should exist");
            var column = this.tabled.columns.at(0);
            var old_width = column.get('width');
            var mousedownEvt = $.Event("mousedown", {clientX: 0});
            var mousemoveEvt = $.Event("mousemove", {clientX: 10});
            resizer.trigger(mousedownEvt);
            $(window).trigger(mousemoveEvt);
            $(window).trigger("mouseup");
            assert(old_width != column.get('width'), "width of column object did not change");
            
            var new_width = column.get("width");
            $('.td-name', this.$pg).each(function(i,el){
                assert.equal(new_width, $(this).width(), "all cells of adjusted column are not the same size");
            })
        });
        
        it("colums should resize to content on dblclick", function() {
            var dblclick = $.Event("dblclick");
            var column = this.tabled.columns.get("name");
            var expected_width = 0;
            $(".td.col-name .cell-inner").each(function(i, el){
                expected_width = Math.max(expected_width, $(this).outerWidth(true), column.get('min_column_width'));
            });
            
            $(".th.col-name .resize").trigger(dblclick);
            assert.equal(column.get('width'), expected_width, "The column does not have the right width");
        });
        
        it("shouldn't allow columns to have a width of less than their min-width", function() {
            var column = this.tabled.columns.at(0);
            column.set( {'width': 0} , {validate: true} );
            assert(column.get('width') != 0, 'validation did not stop setting a bad width value');
        });
        
        it("should be resizable by the .resize-table element", function() {
            var table = $(".tabled", this.$pg);
            var old = table.width();
            var resizer = $(".resize-table", this.$pg);
            assert(resizer, "table resizer should exist");
            var mousedownEvt = $.Event("mousedown", {clientX: 0});
            var mousemoveEvt = $.Event("mousemove", {clientX: 10});
            resizer.trigger(mousedownEvt);
            $(window).trigger(mousemoveEvt);
            $(window).trigger('mouseup');
            assert.equal(old + 10, table.width(), "should have changed widths");
        })
        
        afterEach(function() {
            this.tabled.remove();
        });
        
    });
    
    describe("an advanced tabled view", function() {
        this.timeout(500);
        beforeEach(function(){
            this.Tabled = require('../');
            
            function inches2feet(inches, model){
                var feet = Math.floor(inches/12);
                var inches = inches % 12;
                return feet + "'" + inches + '"';
            }
            
            function feet_filter(term, value, formatted, model) {
                if (term == "tall") return value > 70;
                if (term == "short") return value < 69;
                return true;
            }
            
            this.columns = [
                { id: "selector", key: "selected", label: "", select: true },
                { id: "first_name", key: "first_name", label: "First Name", sort: "string", filter: "like",  },
                { id: "last_name", key: "last_name", label: "Last Name", sort: "string", filter: "like",  },
                { id: "age", key: "age", label: "Age", sort: "number", filter: "number" },
                { id: "height", key: "height", label: "Height", format: inches2feet, filter: feet_filter }
            ];
            this.collection = new Backbone.Collection([
                { id: 1, first_name: "andy",  last_name: "perlitch", age: 24 , height: 69, selected: false },
                { id: 2, first_name: "scott", last_name: "perlitch", age: 26 , height: 71, selected: false },
                { id: 3, first_name: "tevya", last_name: "robbins", age: 32  , height: 68, selected: true }
            ]);
            this.tabled = new this.Tabled({
                collection: this.collection,
                columns: this.columns,
                table_width: 500
            });
            this.$pg = $("#playground");
            this.tabled.render().$el.appendTo(this.$pg);
        });
        
        it("should have a filter row with filter inputs", function() {
            assert.equal( $('.filter-row input').length, 4, "filter row not there or not enough filter inputs" );
        });
        
        it("should have checkboxes in the select column", function(){
            assert.equal(3, $('.col-selector input[type="checkbox"]').length, "wrong number of checkboxes found");
        });
        
        it("should render already selected rows as checked", function() {
            assert($('.col-selector input[type="checkbox"]:eq(2)').is(":checked"), "initially selected row was not checked");
        });
        
        it("should emit events when a checkbox is clicked", function(done) {
            this.collection.once("change:selected", function(model, value) {
                assert(this.collection.get(model) !== undefined, "model that changed was not in the collection");
                done();
            }, this);
            $('.col-selector input[type="checkbox"]:eq(0)').trigger('click');
        });
        
        it("should allow default filters", function(){
            $('.filter-row input:eq(1)').val('perli').trigger('click');
            assert.equal($(".tbody .tr").length, 2, "did not filter the rows down to 2");
        });
        
        it("should allow custom filters", function(){
            $('.filter-row input:eq(3)').val('tall').trigger('click');
            assert.equal($(".tbody .tr").length, 1, "did not filter the rows down to 1");
        });
        
        it("should allow default sorting", function(){
            
        });
        
        afterEach(function(){
            this.tabled.remove();
        });
        
    })
})