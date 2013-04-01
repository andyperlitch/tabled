exports.select = function(value, model) {
    var select_key = model.get('select_key') || 'selected';
    var checked = model.get(select_key) === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        if ($cb.is(":checked")) model.set(select_key, true);
        else model.set(select_key, false);
    })
    
    return $ret;
}