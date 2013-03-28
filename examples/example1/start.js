var Tabled = require('../../');

var MyModel = Backbone.Model.extend({
    defaults: {
        "name": "",
        "age": ""
    }
});

var MyCollection = Backbone.Collection.extend({
    model: MyModel
});

var mycollection = new MyCollection([]);

var mycolumns = [
    {
        id: "name",
        label: "Name",
        key: "name",
        filter: "like",
        sort: "string"
    },
    {
        id: "age",
        label: "Age",
        key: "age",
        format: function(age, person) {
            return age + " yrs old";
        },
        filter: "number",
        sort: "number"
    }
];

var table = new Tabled({
    collection: mycollection,
    columns: mycolumns,
    el: document.getElementById("table-target")
}).render();
