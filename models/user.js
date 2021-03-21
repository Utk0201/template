// to use mongoose, we have to use Schema

const mongoose = require('mongoose');
const {Schema} = mongoose;
const localMongoose = require('passport-local-mongoose');       //      https://www.npmjs.com/package/passport-local-mongoose

const userSchema = new Schema({
        oname: String,
        username: String,       //      this should be unique for every user
        oNo: Number,
        oAddress: String
})

userSchema.plugin(localMongoose);

// to use above Schema, we need to make a model and export it

module.exports = mongoose.model('User',userSchema);