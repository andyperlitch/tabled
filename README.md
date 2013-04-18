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


###`save_state` (default: `false`)

`Boolean` Saves the state of the table each time the user changes it. This means that column and row sort orders and widths of the columns will be saved between sessions.


###`table_width` (default: `'auto'`)

`Int` or `String` Set an explicit default width in pixels for this table. If this is set to `'auto'` (the default value) the table will be rendered at the available width inside of its container. 

WARNING: If the table is hidden on initialization, a `table_width` of `'auto'` will result in a width of 0, in which case the table will automatically be rendered with a width of [number of columns] * [min width of columns]. 

Also note that you cannot set a width to something less than the sum of the minimum column widths (the width will simply be calculated as if the width was 0 as noted earlier).


###`min_column_width` (default: 20)

`Int` The default minimum column width in pixels that any one column can be. This can be overridden on a per-column basis by setting the same key on the column object.


###`row_sorts` (default: `[]`)
`Array` Specify the sort precedence of columns by providing an array of column ids. For example, passing an array like this: `["last_name", "first_name", "age"]` will sort the data first by `last_name`, then `first_name`, then `age`. The sort directions of these columns should be set using the `sort_value` option on the column object (see below).  


###`col_sorts` (default: `[]`)
`Array` Specify the column order by their ids in an array.

Example: `["id", "last_name", "first_name"]`


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

###`sort_value` (optional)

`String` (`a|d`)
If you want to set an initial sort direction for a column, set this option to either `'a'` for ascending or `'d'` for descending. To set multiple column sorts in a specific order, use this in conjunction with the `sort` key on the options of the main `tabled` view (see above).

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

This function should return true if the row should be included in the filtered set, and false if it should not be.


###`format` (optional)

`Function` or `String` If a function, it should return a string, DOM element, or jQuery object to be used as the value of the row. Receives the value of `model.get(column.key)` and the model itself as arguments:

    format: function(value, model) {
        // return something here
        // note: under the hood, this value is added with $().append()
    }

If it is a string, it should be one of the predefined formatting functions:
####`'select'`

The cells in that column will be checkboxes that, when checked or unchecked, will change the value of the `key` on the model to true or false, respectively. This will then emit appropriate change events on the model and collection of data. Consider the following column definition object:

    // ...in column definitions...
    { id: "selector", select: true, key: "selected" , label: "" }
    
Each row of data will have a column with a checkbox, and when one is clicked, the model's `selected` attribute will be changed to true (or false if unchecking), eg. model.set('selected', true);

##Examples

To run the examples, do the following:

    npm install .
    jam install
    make all
    
Then, simply view the index.html page of the example you want to see in a browser.

##TODO

- do not alter the collection for select boxes
- when some columns locked, resize table using full mouse delta
- dblclick on table resizer to fit to parent
- sortable rows
- radio button select
