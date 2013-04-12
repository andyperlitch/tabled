var Bormats = require('bormat');
exports.select = function(value, model) {
    var select_key = 'selected';
    var checked = model[select_key] === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox" class="selectbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb
    .on('click mousedown', function(evt){
        evt.preventDefault();
    })
    .on('mouseup', function(evt) {
        var selected = !! model[select_key];
        var is_selected_now = model[select_key] = !selected;
        $cb.prop('checked', is_selected_now);
        model.trigger('change_selected', model, selected);
    })
    
    return $ret;
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