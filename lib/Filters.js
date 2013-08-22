function like(term, value, computedValue, row) {
    var
    term = term.toLowerCase(),
    value = value.toLowerCase(),
    negate = term.slice(0,1) === '!';
    
    if (negate) {
        term = term.substr(1);
        if (term === '') {
            return true;
        }
        return value.indexOf(term) === -1;
    }
    
    return value.indexOf(term) > -1;
}

exports.like = like;

exports.likeFormatted = function(term, value, computedValue, row) {
    return like(term,computedValue,computedValue, row);
}

exports.is = function(term, value, computedValue, row) {
    term = term.toLowerCase();
    value = value.toLowerCase();
    return term == value;
}
exports.number = function(term, value) {
    value *= 1;
    var first_two = term.substr(0,2);
    var first_char = term[0];
    var against_1 = term.substr(1)*1;
    var against_2 = term.substr(2)*1;
    if ( first_two == "<=" ) return value <= against_2 ;
    if ( first_two == ">=" ) return value >= against_2 ;
    if ( first_char == "<" ) return value < against_1 ;
    if ( first_char == ">" ) return value > against_1 ;
    if ( first_char == "~" ) return Math.round(value) == against_1 ;
    if ( first_char == "=" ) return against_1 == value ;
    return value.toString().indexOf(term.toString()) > -1 ;
}

var unitmap = {
    "second": 1000,
    "minute": 60000,
    "hour": 3600000,
    "day": 86400000,
    "week": 86400000*7,
    "month": 86400000*31,
    "year": 86400000*365
}

var parseDateFilter = function(string) {
    
    // split on clauses (if any)
    var clauses = string.split(",");
    var total = 0;
    
    // parse each clause
    for (var i = 0; i < clauses.length; i++) {
        var clause = clauses[i].trim();
        var terms = clause.split(" ");
        if (terms.length < 2) continue;
        var count = terms[0]*1;
        var unit = terms[1].replace(/s$/, '');
        if (! unitmap.hasOwnProperty(unit) ) continue;
        total += count * unitmap[unit];
    };
    
    return total;
    
}

exports.date = function(term, value) {
    // < 1 day ago
    // < 10 minutes ago
    // < 10 minutes, 50 seconds ago
    // > 2 days ago
    // >= 1 day ago
    
    value *= 1;
    var now = (+new Date());
    var first_two = term.substr(0,2);
    var first_char = term[0];
    var against_1 = (term.substr(1)).trim();
    var against_2 = (term.substr(2)).trim();
    if ( first_two == "<=" ) {
        var lowerbound = now - parseDateFilter(against_2);
        return value >= lowerbound;
    }
    if ( first_two == ">=" ) {
        var upperbound = now - parseDateFilter(against_2);
        return value <= upperbound;
    }
    if ( first_char == "<" ) {
        var lowerbound = now - parseDateFilter(against_1);
        return value > lowerbound;
    }
    if ( first_char == ">" ) {
        var upperbound = now - parseDateFilter(against_1);
        return value < upperbound;
    }
    return false ;
}