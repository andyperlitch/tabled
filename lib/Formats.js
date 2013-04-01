exports.select = function(value, model) {
    var select_key = model.get('select_key') || 'selected';
    var checked = !! model.get(select_key);
    var $ret = $('<div class="cell-inner"><input type="checkbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', true);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        if ($cb.is(":checked")) console.log("checked");
        else console.log("not checked");
    })
    
    return $ret;
}