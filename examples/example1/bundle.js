;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
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

},{"../../":2}],2:[function(require,module,exports){

},{}]},{},[1])
;