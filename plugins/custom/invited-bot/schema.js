const mongoose = require('mongoose')
const quitSchema = new mongoose.Schema({
    group: { type: Number, index: true, required: true, unique: true }
})
const botList = new mongoose.Schema({
    qq: { type: Number, index: true, required: true, unique: true }
})
exports.QuitGroup = mongoose.model('quitGroup', quitSchema)
exports.BotList = mongoose.model('botList', botList)
