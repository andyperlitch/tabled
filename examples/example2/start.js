var Tabled = require('../../');
var _ = require('underscore'), Backbone = require('backbone');
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

var columns = [
    { id: "selector", key: "selected", label: "", select: true, width: 30 },
    { id: "first_name", key: "first_name", label: "First Name", sort: "string", filter: "like",  },
    { id: "last_name", key: "last_name", label: "Last Name", sort: "string", filter: "like",  },
    { id: "age", key: "age", label: "Age", sort: "number", filter: "number" },
    { id: "height", key: "height", label: "Height", format: inches2feet, filter: feet_filter, sort: "number" }
];
var collection = new Backbone.Collection([
    { id: 1, first_name: "andy",  last_name: "perlitch", age: 24 , height: 69, selected: false },
    { id: 2, first_name: "scott", last_name: "perlitch", age: 26 , height: 71, selected: false },
    { id: 3, first_name: "tevya", last_name: "robbins", age: 32  , height: 68, selected: true }
]);
var tabled = new Tabled({
    collection: collection,
    columns: columns,
    table_width: 500
});
var $pg = $("#playground");
tabled.render().$el.appendTo($pg);