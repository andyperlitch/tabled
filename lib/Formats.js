exports.select = function(value, model) {
    var select_key = 'selected';
    var checked = model[select_key] === true;
    var $ret = $('<div class="cell-inner"><input type="checkbox"></div>');
    
    // Set checked
    var $cb = $ret.find('input').prop('checked', checked);
    
    // Set click behavior
    $cb.on('click', function(evt) {
        var selected = !! $cb.is(":checked");
        model[select_key] = selected;
        model.trigger('change_selected', model, selected);
        if (model.collection) model.collection.trigger('change_selected');
    })
    
    return $ret;
}

exports.commaInt = function(value) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
function timeSince(timestamp, compareDate, timeChunk) {
    var now = compareDate === undefined ? +new Date() : compareDate;
    var remaining = (timeChunk !== undefined) ? timeChunk : now - timestamp;
    var string = "";
    var separator = ", ";
    var level = 0;
    var max_levels = 3;
    var milli_per_second = 1000;
    var milli_per_minute = milli_per_second * 60;
    var milli_per_hour = milli_per_minute * 60;
    var milli_per_day = milli_per_hour * 24;
    var milli_per_week = milli_per_day * 7;
    var milli_per_month = milli_per_week * 4;
    var milli_per_year = milli_per_day * 365;
    
    var levels = [
    
        { plural: "years", singular: "year", ms: milli_per_year },
        { plural: "months", singular: "month", ms: milli_per_month },
        { plural: "weeks", singular: "week", ms: milli_per_week },
        { plural: "days", singular: "day", ms: milli_per_day },
        { plural: "hours", singular: "hour", ms: milli_per_hour },
        { plural: "minutes", singular: "minute", ms: milli_per_minute },
        { plural: "seconds", singular: "second", ms: milli_per_second }
    ];
    
    for (var i=0; i < levels.length; i++) {
        if ( remaining < levels[i].ms ) continue;
        level++;
        var num = Math.floor( remaining / levels[i].ms );
        var label = num == 1 ? levels[i].singular : levels[i].plural ;
        string += num + " " + label + separator;
        remaining %= levels[i].ms;
        if ( level >= max_levels ) break;
    };
    
    string = string.substring(0, string.length - separator.length);
    return string;
}
exports.timeSince = function(value) {
    if (/^\d+$/.test(value)) {
        var newVal = timeSince(value) || "a moment";
        return newVal + " ago";
    }
    return value;
}