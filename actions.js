const {
    getMessages,
    getMessageFiles,
    createMessage,
    createMessageXMLFile,
    createMessagePdfFile,
    saveSubmittedMessage,
    lookForAction,
    unansweredCases,
} = require("./messageHelper");
const { parseXml, updateXml, exportXmlIds, checkAnnexValues } = require("./xmlHelper");
const { readFile } = require("fs/promises");
const moment = require("moment");
const uuid = require("uuid");


const annexAFilename = 'Eio_AnnexA_Submission.xml'
const annexBFilename = 'Eio_AnnexB_Submission.xml'

async function sendResponse(req, res) {
    try {
        const messages = await getMessages();
        const annexAMessages = lookForAction('Eio_AnnexA_Submission', messages)

        const unanswered_cases = unansweredCases(annexAMessages, messages)

        if (unanswered_cases.length === 0) {
            return res.send('All cases has been answered')
        }

        for (let message of unanswered_cases) {
            console.log(message.id)
            const messageFiles = await getMessageFiles(message.files.files);
            const contentBase64Xml = messageFiles[annexAFilename]
            const contentXml = (await Buffer.from(contentBase64Xml, 'base64')).toString('utf8')
            let parsedXml = await parseXml(contentXml)

            let scenario = checkAnnexValues(parsedXml)

            let ids = exportXmlIds(parsedXml)

            let responseXmlContent = (await readFile("fakeFiles/content.xml")).toString('utf8')
            const newXml = await updateXml(responseXmlContent, null, ids["globalCaseId"], ids["formId"], ids["subject"], scenario)

            const responseMessage = await createMessage(message.conversationId, "Eio_AnnexB_Submission")
            if (![200, 201].includes(responseMessage.status)) {
                return res.send('Error creating message')
            }

            const uploadFile = await createMessageXMLFile(annexBFilename, newXml, responseMessage.data.storageInfo)
            if (![200, 201].includes(uploadFile.status)) {
                return res.send('Error uploading xml file')
            }

            const signedPdf = req.query.signedPdf !== 'false'
            const uploadPdfFile = await createMessagePdfFile(responseMessage.data.id, responseMessage.data.storageInfo, signedPdf)
            if (![200, 201].includes(uploadPdfFile.status)) {
                return res.send('Error uploading pdf file')
            }

            const savedMessage = await saveSubmittedMessage(responseMessage.data.storageInfo)
            if (![200, 201].includes(savedMessage.status)) {
                res.send('Error on saving response message!')
            }

            console.log('sent')

        }

        res.send('Response messages sent!')

    } catch (error) {
        res.send('Error sending response')
        console.log(error);
    }
}

async function sendNewCase(req, res) {
    try {
        const randomId = moment().format(("YYYYMMDD"))
        const message = await createMessage(randomId, "Eio_AnnexA_Submission")
        if (![200, 201].includes(message.status)) {
            return res.send('Error creating message')
        }
        let xmlContent = (await readFile("fakeFiles/AnnexA.xml")).toString('utf8')
        const globalCaseId = `EIO-CY-BG-${moment().format(("YYYY-MM-DD"))}-0001-${Math.floor(Math.random() * 1000)}`
        const formId = uuid.v4()
        const newXmlContent = await updateXml(xmlContent, formId, globalCaseId)
        const uploadFile = await createMessageXMLFile(annexAFilename, newXmlContent, message.data.storageInfo)
        if (![200, 201].includes(uploadFile.status)) {
            return res.send('Error uploading xml file')
        }

        const signedPdf = req.query.signedPdf !== 'false'
        const uploadPdfFile = await createMessagePdfFile(message.data.id, message.data.storageInfo, signedPdf)
        if (![200, 201].includes(uploadPdfFile.status)) {
            return res.send('Error uploading pdf file')
        }
        await new Promise(r => setTimeout(r, 5000));

        const savedMessage = await saveSubmittedMessage(message.data.storageInfo)
        if (![200, 201].includes(savedMessage.status)) {
            res.send('Error on saving message!')
        }

        res.send('Message sent!')

    } catch (error) {
        res.send('Error sending new case', error)
        console.log(error);
    }
}

module.exports = {
    sendResponse,
    sendNewCase
}
