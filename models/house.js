//  to use mongoose, we have to require mongoose and declare Schema
const mongoose = require('mongoose');
const User = require('./user.js');
const { Schema } = mongoose;

const houseSchema = new Schema({
    desc: String,   // stores description of the house
    categ: String,
    geometry: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    price: Number,
    location: String,
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    pics: [
        {
            url: String,
            filename: String
        }
    ]
});

//  make a model and export
module.exports = mongoose.model('House', houseSchema);
