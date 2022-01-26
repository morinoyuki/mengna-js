const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    keyword: {
        type: {
            is: String,
            re: String,
            includes: Array
        }, index: true, required: true, unique: true
    },
    type: { type: String, index: true, required: true },
    meta: { muteTime: Number, notice: Boolean }
})
exports.BlackKeyword = mongoose.model('blackKeyword', schema)