var Bormats = require('bormat');
exports.select = function(value, model, column) {
    var select_key = column.get('select_key');
    return '<input type="checkbox" class="selectbox" data-id="' + model.id + '" ' + (model[select_key] ? 'checked="checked"' : '') + '>';
}

var timeSince = Bormats.timeSince;

exports.timeSince = function(value) {
    if (/^\d+$/.test(value)) {
        var newVal = timeSince(value) || "a moment";
        return newVal + " ago";
    }
    return value;
}

exports.commaInt = Bormats.commaGroups;