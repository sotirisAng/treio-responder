require('dotenv').config()
const express = require('express')
const {response} = require("express");
const {PORT} = process.env
const {sendResponse, sendNewCase} = require('./actions')
const {readFile} = require("fs/promises");
const {parseXml, checkAnnexValues, exportXmlIds, updateXml} = require("./xmlHelper");

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.get('/send-response', sendResponse)

app.get('/send-new', sendNewCase)

app.get('/scenario', async (req, res) => {
    let contentXml = (await readFile("fakeFiles/Document8.xml")).toString('utf8')
    let parsedXml = await parseXml(contentXml)

    let scenario = checkAnnexValues(parsedXml)
    let ids = exportXmlIds(parsedXml)

    let responseXmlContent = (await readFile("fakeFiles/content.xml")).toString('utf8')
    const newXml = await updateXml(responseXmlContent, null, ids["globalCaseId"], ids["formId"], ids["subject"], scenario)

    return res.send(newXml)
})

app.listen(PORT)

module.exports = {
    handler: app,
}
