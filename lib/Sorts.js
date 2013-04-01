exports.number = function(row1,row2) { 
    return row1[field]*1 - row2[field]*1;
}
exports.string = function(row1,row2) { 
    if ( row1[field].toString().toLowerCase() == row2[field].toString().toLowerCase() ) return 0;
    return row1[field].toString().toLowerCase() > row2[field].toString().toLowerCase() ? 1 : -1 ;
}