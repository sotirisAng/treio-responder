const xml2js = require("xml2js");
const util = require("util");
const uuid = require("uuid");
const moment = require("moment");

const formIdTag = 'ns12:formId'
const globalCaseIdTag = 'ns12:globalCaseId'
const subjectTag = 'ns12:subject'
const parentFormIdTag = 'ns12:parentFormId'
const dateOfIssuing = 'ns9:DateOfIssuing'
const dateOfReceipt = 'ns9:DateOfReceipt'

async function parseXml(xmlContent) {
    const parser = new xml2js.Parser({ explicitArray: false })
    const parseStringPromise = util.promisify(parser.parseString)

    return await parseStringPromise(xmlContent)
}

function exportXmlIds(parsedXml) {
    let root = Object.keys(parsedXml)[0]

    let formId = parsedXml[root][formIdTag]
    let globalCaseId = parsedXml[root][globalCaseIdTag]
    let subject = parsedXml[root][subjectTag]

    return { formId, globalCaseId, subject }
}

const scenario = {
    "test1": "response to test1",
    "test2": "response to test2"
}

function checkAnnexValues(xml) {
    let root = Object.keys(xml)[0]

    let namespaceC
    if (xml[root]["ns12:form"]["ns12:annexA"]["ns4:SectionC"]) {
        namespaceC = "ns4"
    } else if (xml[root]["ns12:form"]["ns12:annexA"]["ns8:SectionC"]) {
        namespaceC = "ns8"
    } else {
        return
    }

    const sectionC = xml[root]["ns12:form"]["ns12:annexA"][`${namespaceC}:SectionC`]
    const investigativeMeasures = sectionC[`${namespaceC}:InvestigativeMeasuresToCollectTheFollowingTypesOfEEvidence`]
    if (investigativeMeasures === undefined) {
        return
    }
    let comment = investigativeMeasures[`${namespaceC}:Comment`]

    return scenario[comment] || null
}

async function updateXml(xmlContent, formId = null, globalCaseId, parentFormId = null, subject = null, scenario = null) {
    const parser = new xml2js.Parser({ explicitArray: false })
    const parseStringPromise = util.promisify(parser.parseString)

    const parsedXml = await parseStringPromise(xmlContent)
    let root = Object.keys(parsedXml)[0]
    if (formId) {
        parsedXml[root][formIdTag] = formId
        parsedXml[root][subjectTag] = `test ${formId}`
    }
    if (parentFormId) {
        parsedXml[root][formIdTag] = uuid.v4()
        parsedXml[root][parentFormIdTag] = parentFormId
        parsedXml[root][subjectTag] = subject
        parsedXml[root]["ns12:form"]["ns12:annexB"]["ns9:PartA"][dateOfIssuing] = moment().format('YYYY-MM-DD') + "+02:00"
        parsedXml[root]["ns12:form"]["ns12:annexB"]["ns9:PartA"][dateOfReceipt] = moment().format('YYYY-MM-DD') + "+02:00"

        if (scenario) {
                if (parsedXml[root]["ns12:form"]["ns12:annexB"]["ns9:PartD"]["ns9:AnyOtherInformation"]) {
                    parsedXml[root]["ns12:form"]["ns12:annexB"]["ns9:PartD"]["ns9:AnyOtherInformation"] = scenario
                }
                else {
            parsedXml[root]["ns12:form"]["ns12:annexB"]["ns9:PartD"] = { "ns9:AnyOtherInformation": { _: scenario } }
                }
        }
    }
    parsedXml[root][globalCaseIdTag] = globalCaseId

    const builder = new xml2js.Builder()
    return builder.buildObject(parsedXml)
}

module.exports = {
    parseXml,
    updateXml,
    exportXmlIds,
    checkAnnexValues
}
