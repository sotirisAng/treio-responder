const xml2js = require("xml2js");
const util = require("util");
const uuid = require("uuid");

const formIdTag = 'ns12:formId'
const globalCaseIdTag = 'ns12:globalCaseId'
const subjectTag = 'ns12:subject'
const parentFormIdTag = 'ns12:parentFormId'

async function parseXml(xmlContent) {
    const parser = new xml2js.Parser({explicitArray: false})
    const parseStringPromise = util.promisify(parser.parseString)

    const parsedXml = await parseStringPromise(xmlContent)
    let root = Object.keys(parsedXml)[0]

    let formId = parsedXml[root][formIdTag]
    let globalCaseId = parsedXml[root][globalCaseIdTag]
    let subject = parsedXml[root][subjectTag]
    return {formId, globalCaseId, subject}
}

async function updateXml(xmlContent, formId = null, globalCaseId, parentFormId = null, subject = null) {
    const parser = new xml2js.Parser({explicitArray: false})
    const parseStringPromise = util.promisify(parser.parseString)

    const parsedXml = await parseStringPromise(xmlContent)
    let root = Object.keys(parsedXml)[0]
    if(formId) {
        parsedXml[root][formIdTag] = formId
        parsedXml[root][subjectTag] = `test ${formId}`
    }
    if(parentFormId) {
        parsedXml[root][formIdTag] = uuid.v4()
        parsedXml[root][parentFormIdTag] = parentFormId
        parsedXml[root][subjectTag] = subject
    }
    parsedXml[root][globalCaseIdTag] = globalCaseId

    const builder = new xml2js.Builder()
    return builder.buildObject(parsedXml)
}

module.exports = {
    parseXml,
    updateXml
}
