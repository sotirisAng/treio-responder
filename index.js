require('dotenv').config()
const express = require('express')
const {response} = require("express");
const {PORT} = process.env
const {sendResponse, sendNewCase} = require('./actions')

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.get('/send-response', sendResponse)

app.get('/send-new', sendNewCase)

app.listen(PORT)

module.exports = {
    handler: app,
}
