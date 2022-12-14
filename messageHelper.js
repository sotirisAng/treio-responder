const axios = require("axios");
const { readFile } = require("fs/promises");
const { promises: fs } = require("fs");
require('dotenv').config()
const moment = require("moment");
const { REST_SERVICE_URL, NODE_ENV, ORIGINAL_SENDER, FINAL_RECIPIENT } = process.env


const lookForAction = (action, data) => {
    const today = moment()
    const yesterday = moment().subtract(1, 'days')
    let filteredData = data.filter(message =>
        message.action === action && message.messageStatus === "CONFIRMED" && message.finalRecipient === ORIGINAL_SENDER && (message.created.split('T')[0] === today.format('YYYY-MM-DD') || message.created.split('T')[0] === yesterday.format('YYYY-MM-DD')))
    filteredData = filteredData.sort((a, b) => a.created - b.created)
    return filteredData
}

function unansweredCases(messages, allMessages) {
    return messages.filter(message => {
        const conversation = conversationMessages(message.conversationId, allMessages)
        const answers = messageAnswers(conversation, message)
        return answers.length === 0
    })
}

async function getMessages() {
    const response = await axios.get(`${REST_SERVICE_URL}/getAllMessages`)
    return response.data.messages
}

const validFileTypes = {
    "xml": "BUSINESS_CONTENT",
    "pdf": "BUSINESS_DOCUMENT",
    "other": "BUSINESS_ATTACHMENT"
}

async function getMessageFiles(messageFiles) {
    let filteredFiles = messageFiles.filter(file => Object.values(validFileTypes).includes(file.fileType))
    let files = {}
    if (NODE_ENV === "production") {

        for (const file of filteredFiles) {
            const filePath = file.storageLocation + '/' + file.fileName
            files[file.fileName] = (await readFile(filePath)).toString('base64')
        }
    } else {
        files = {
            "Eio_AnnexA_Submission.xml": (await readFile("fakeFiles/Document.xml")).toString('base64'),
        }
    }
    return files
}

function conversationMessages(conversationId, messages) {
    return messages.filter(message => message.conversationId === conversationId)
}

function messageAnswers(conversation, sentMessage) {
    return conversation.filter(message => message.action === 'Eio_AnnexB_Submission' && message.toPartyId === ORIGINAL_SENDER && message.created > sentMessage.created)
}

async function createMessage(conversationId, action) {
    const payload = {
        "conversationId": conversationId,
        "originalSender": ORIGINAL_SENDER,
        "finalRecipient": FINAL_RECIPIENT,
        "service": "Eio",
        "action": action,
        "fromPartyId": "CY",
        "fromPartyRole": "http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/initiator",
        "toPartyId": "BG",
        "toPartyRole": "http://docs.oasis-open.org/ebxml-msg/ebms/v3.0/ns/core/200704/responder"
    }
    return await axios.post(`${REST_SERVICE_URL}/saveMessage`, payload)
}

async function pdfFileContent(signedPdf) {
    const filename = signedPdf ? "Test_signed.pdf" : "Test.pdf"
    return (await fs.readFile(`fakeFiles/${filename}`)).toString('base64')
}

async function createMessageXMLFile(fileName, fileContent, storageLocation) {
    const fileContentBase64 = Buffer.from(fileContent).toString('base64')

    const payload = {
        "fileName": "content.xml",
        "fileType": "BUSINESS_CONTENT",
        "storageLocation": storageLocation,
        "fileContent": fileContentBase64
    }
    return await axios.post(`${REST_SERVICE_URL}/uploadMessageFile`, payload)
}

async function createMessagePdfFile(messageId, storageLocation, signedPdf) {

    const fileContentBase64 = await pdfFileContent(signedPdf)

    const payload = {
        "fileName": "Document.pdf",
        "fileType": "BUSINESS_DOCUMENT",
        "storageLocation": storageLocation,
        "fileContent": fileContentBase64
    }
    return await axios.post(`${REST_SERVICE_URL}/uploadMessageFile`, payload)
}

async function saveSubmittedMessage(storageInfo) {
    const payload = {
        "storageInfo": storageInfo
    }
    return await axios.post(`${REST_SERVICE_URL}/submitStoredClientMessage`, payload)
}

module.exports = {
    getMessages,
    getMessageFiles,
    conversationMessages,
    messageAnswers,
    createMessage,
    createMessageXMLFile,
    createMessagePdfFile,
    saveSubmittedMessage,
    lookForAction,
    unansweredCases
}
