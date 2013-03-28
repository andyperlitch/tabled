Tabled
======

Backbone UI component for building interactive tables.

##Usage

    var Tabled = require('tabled');
    var mycollection = new Backbone.Collection([ // can be any backbone collection
        { name: "andy", age: 24 },
        { name: "scott", age: 26 },
        { name: "tevya", age: 32 }
    ]);
    var mycolumns = [
        { id: "name", key: "name", label: "Name" },
        { id: "age", key: "age", label: "Age" }
    ]; // see below for all column options
    
    // This returns a backbone view
    var table = new Tabled({
        collection: mycollection,
        columns: mycolumns
        // more options are available (see options section below)
    });
    
    // Treat the same as any other view:
    table.$el.appendTo($my_el);
    table.setElement(".some-element");

##Options

There are several special options you can pass to Tabled besides the collection and columns:

###`id` (optional)

The id of this table instance. Used to store information about the table in localStorage for table attributes you want saved between sessions, eg. when setting the `save_width` option to `true`. All data stored in `localStorage` is opt-in and only takes up a single key in localStorage per table. The key will be `tabled.[ID]` on `localStorage`.


###`adjustable_width` (default: `true`)

`Boolean` Set to `false` if you'd like the table not to have an adjustable width.


###`save_width` (default: `false`)

`Boolean` Saves the width of the table each time the user adjusts it. The result is the table being capable of saving state between sessions.


##Columns

`tabled` expects an array of column objects to be past to it via the `columns` key . The following are all the keys possible on a column object

###`id`

`String` unique id for the column


###`key`

`String` the main attribute of each model that this column will display or use in its format function


###`label`

`String` the name of the column that will be displayed at the top of the table


###`sort` (optional)

`String` or `Function`
Allows the column to be sortable by clicking on the column header. If this is a string, it should refer to a predefined sort method (currently `'number'` and `'string'`). If it is a  function, it should be in the form shown below:

    sort: function(model1, model2) {
        // return value < 0 if model1 ranks higher than model2
        // return value > 0 if model2 ranks higher than model1
        // return 0 if model1 and model2 are of the same rank
    }

This function defines the ascending order, and the descending order is defined by reversing the order of the arguments.

###`filter` (optional)

`String` or `Function` Adds a text field at the top of the column where the user can type values that will filter the list. If `filter` is a string, this should refer to a predefined filter method (currently `'number'` and `'like'`). If it is a function, it should be in the following format:

    filter: function( filter_field_value, raw_row_value, formatted_row_value, row_model ) {
        // return truthy value to include this row
        // return falsy value to exclude
    }

- `filter_field_value`: the text contained in the filter filed
- `raw_row_value`: the value of `model.get(column.key)`
- `formatted_row_value`: the value outputted by the format function, if there. If there is no format function, this will be the same as `raw_row_value`
- `row_model`: the model that the filter is being applied to

###`format` (optional)

`Function` Returns a string, DOM element, or jQuery object to be used as the value of the row. Receives the value of `model.get(column.key)` and the model itself as arguments:

    format: function(value, model) {
        // return something here
        // note: under the hood, this value is added with $().append()
    }

###`select` (optional)

`Boolean` If the `select` key is set to true on a column, the cells in that column will be checkboxes that, when checked or unchecked, will emit "tabled:select" and "tabled:deselect" events on the model in the collection whose row was clicked. Also, when the selected group changes, the Tabled instance itself will emit a "tabled:select_change" event with an array of selected models as the first argument and the data collection itself.

##Examples

To run the examples, do the following:

    npm install .
    jam install
    make all
    
Then, simply view the index.html page of the example you want to see in a browser.