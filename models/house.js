//  to use mongoose, we have to require mongoose and declare Schema

const mongoose = require('mongoose');

const {Schema} = mongoose;

const houseSchema = new Schema({
    desc: String,   // stores description of the house
    type: String,
    price: Number,
    lift: Boolean
})

//  make a model and export
module.exports = mongoose.model('House',houseSchema);
