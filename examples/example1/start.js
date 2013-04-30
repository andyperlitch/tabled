var Tabled = require('../../');
var _ = require('underscore'), Backbone = require('backbone');
var columns = [
    { id: "name", key: "name", label: "Name" },
    { id: "age", key: "age", label: "Age" }
]
var collection = new Backbone.Collection([
    { name: "andy", age: 24 },
    { name: "scott", age: 26 },
    { name: "tevya", age: 32 }
]);
var tabled = new Tabled({
    collection: collection,
    columns: columns,
    el: document.getElementById("table-target")
}).render();