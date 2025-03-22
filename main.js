require("./all/global")
const func = require("./all/place")
const readline = require("readline")
const yargs = require('yargs/yargs')
const _ = require('lodash')
const usePairingCode = true
const question = (text) => {
const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
})
return new Promise((resolve) => {
rl.question(text, resolve)
})}


var low
try {
low = require('lowdb')
} catch (e) {
low = require('./all/lowdb')
}

const { Low, JSONFile } = low
const mongoDB = require('./all/mongoDB')
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.db = new Low(
  /https?:\/\//.test(opts['db'] || '') ?
    new cloudDBAdapter(opts['db']) : /mongodb/.test(opts['db']) ?
      new mongoDB(opts['db']) :
      new JSONFile(`./all/database/database.json`)
)
global.DATABASE = global.db
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) return new Promise((resolve) => setInterval(function () { (!global.db.READ ? (clearInterval(this), resolve(global.db.data == null ? global.loadDatabase() : global.db.data)) : null) }, 1 * 1000))
  if (global.db.data !== null) return
global.db.READ = true
await global.db.read()
global.db.READ = false
global.db.data = {
    users: {},
    chats: {},
    others: {},
    ...(global.db.data || {})
  }
global.db.chain = _.chain(global.db.data)
}
loadDatabase()

if (global.db) setInterval(async () => {
if (global.db.data) await global.db.write()
}, 30 * 1000)


async function startSesi() {
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const { state, saveCreds } = await useMultiFileAuthState(`./session`)
const { version, isLatest } = await fetchLatestBaileysVersion()
const getMessage = async (key) => {
if (store) {
const msg = await store.loadMessage(key.remoteJid, key.id, undefined)
return msg?.message || undefined
}
return {
conversation: 'hallo'
}
}

const auth = {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'fatal', stream: 'store' })),
}

const connectionOptions = {
version,
keepAliveIntervalMs: 30000,
getMessage,
printQRInTerminal: !usePairingCode,
logger: pino({ level: "fatal" }),
auth,
browser: ["Ubuntu", "Chrome", "20.0.04"]
}
const Skyzo = func.makeWASocket(connectionOptions)
if (usePairingCode && !Skyzo.authState.creds.registered) {
const phoneNumber = await question(color('Masukin No Awal 62xx bukan 08xxx:\n', 'red'));
const code = await Skyzo.requestPairingCode(phoneNumber.trim())
console.log(`${chalk.redBright('Nih Kodenya Boss')} : ${code}`)
}
store.bind(Skyzo.ev)

Skyzo.ev.on('connection.update', async (update) => {
const { connection, lastDisconnect } = update
if (connection === 'close') {
const reason = new Boom(lastDisconnect?.error)?.output.statusCode
console.log(color(lastDisconnect.error, 'deeppink'))
if (lastDisconnect.error == 'Error: Stream Errored (unknown)') {
process.exit()
} else if (reason === DisconnectReason.badSession) {
console.log(color(`Bad Session File, Please Delete Session and Scan Again`))
process.exit()
} else if (reason === DisconnectReason.connectionClosed) {
console.log(color('[SYSTEM]', 'white'), color('Connection closed, reconnecting...', 'deeppink'))
process.exit()
} else if (reason === DisconnectReason.connectionLost) {
console.log(color('[SYSTEM]', 'white'), color('Connection lost, trying to reconnect', 'deeppink'))
process.exit()
} else if (reason === DisconnectReason.connectionReplaced) {
console.log(color('Connection Replaced, Another New Session Opened, Please Close Current Session First'))
Skyzo.logout()
} else if (reason === DisconnectReason.loggedOut) {
console.log(color(`Device Logged Out, Please Scan Again And Run.`))
Skyzo.logout()
} else if (reason === DisconnectReason.restartRequired) {
console.log(color('Restart Required, Restarting...'))
await startSesi()
} else if (reason === DisconnectReason.timedOut) {
console.log(color('Connection TimedOut, Reconnecting...'))
startSesi()
}
} else if (connection === "connecting") {
console.log(color('Connecting...'))
} else if (connection === "open") {
Skyzo.sendMessage("62857597932334@s.whatsapp.net", {text: "*BOT CONNECT BANG ZEX😎😜*"})
console.log(color('Connected To Server'))
}
})

Skyzo.ev.on('call', async (user) => {
if (!global.anticall) return
let botNumber = await Skyzo.decodeJid(Skyzo.user.id)
for (let ff of user) {
if (ff.isGroup == false) {
if (ff.status == "offer") {
let sendcall = await Skyzo.sendMessage(ff.from, {text: `@${ff.from.split("@")[0]} Maaf Kamu Akan Saya Block Karna Ownerbot Menyalakan Fitur *Anticall*\nJika Tidak Sengaja Segera Hubungi Owner Untuk Membuka Blokiran Ini`, contextInfo: {mentionedJid: [ff.from], externalAdReply: {thumbnailUrl: "https://telegra.ph/file/dddff382a71ab09c48427.jpg", title: "｢ CALL DETECTED ｣", previewType: "PHOTO"}}}, {quoted: null})
Skyzo.sendContact(ff.from, [owner], "SPAM + VC = BLOK!!!", sendcall)
await sleep(8000)
await Skyzo.updateBlockStatus(ff.from, "block")
}}
}})

Skyzo.ev.on('messages.upsert', async (chatUpdate) => {
try {
m = chatUpdate.messages[0]
if (!m.message) return
m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
if (m.key && m.key.remoteJid === 'status@broadcast') return Skyzo.readMessages([m.key])
if (!Skyzo.public && m.key.remoteJid !== global.owner+"@s.whatsapp.net" && !m.key.fromMe && chatUpdate.type === 'notify') return
if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return
if (global.autoread) Skyzo.readMessages([m.key])
m = func.smsg(Skyzo, m, store)
require("./skyzoo")(Skyzo, m, store)
} catch (err) {
console.log(err)
}
})

Skyzo.ev.on('group-participants.update', async (anu) => {
if (!global.welcome) return
let botNumber = await Skyzo.decodeJid(Skyzo.user.id)
if (anu.participants.includes(botNumber)) return
try {
let metadata = await Skyzo.groupMetadata(anu.id)
let namagc = metadata.subject
let participants = anu.participants
for (let num of participants) {
let check = anu.author !== num && anu.author.length > 1
let tag = check ? [anu.author, num] : [num]
try {
ppuser = await Skyzo.profilePictureUrl(num, 'image')
} catch {
ppuser = 'https://telegra.ph/file/dddff382a71ab09c48427.jpg'
}
if (anu.action == 'add') {
Skyzo.sendMessage(anu.id, {text: check ? `@${anu.author.split("@")[0]} Telah Menambahkan @${num.split("@")[0]} Ke Dalam Grup Ini` : `Hallo Kak @${num.split("@")[0]} Selamat Datang Di *${namagc}*`, 
contextInfo: {mentionedJid: [...tag], externalAdReply: { thumbnailUrl: ppuser, title: '© Welcome Message', body: '', renderLargerThumbnail: true, sourceUrl: linkgc, mediaType: 1}}})
} 
if (anu.action == 'remove') { 
Skyzo.sendMessage(anu.id, {text: check ? `@${anu.author.split("@")[0]} Telah Mengeluarkan @${num.split("@")[0]} Dari Grup Ini` : `@${num.split("@")[0]} Telah Keluar Dari Grup Ini`, 
contextInfo: {mentionedJid: [...tag], externalAdReply: { thumbnailUrl: ppuser, title: '© Leaving Message', body: '', renderLargerThumbnail: true, sourceUrl: linkgc, mediaType: 1}}})
}
if (anu.action == "promote") {
Skyzo.sendMessage(anu.id, {text: `@${anu.author.split("@")[0]} Telah Menjadikan @${num.split("@")[0]} Sebagai Admin Grup Ini`, 
contextInfo: {mentionedJid: [...tag], externalAdReply: { thumbnailUrl: ppuser, title: '© Promote Message', body: '', renderLargerThumbnail: true, sourceUrl: linkgc, mediaType: 1}}})
}
if (anu.action == "demote") {
Skyzo.sendMessage(anu.id, {text: `@${anu.author.split("@")[0]} Telah Memberhentikan @${num.split("@")[0]} Sebagai Admin Grup Ini`, 
contextInfo: {mentionedJid: [...tag], externalAdReply: { thumbnailUrl: ppuser, title: '© Demote Message', body: '', renderLargerThumbnail: true, sourceUrl: linkgc, mediaType: 1}}})
}
} 
} catch (err) {
console.log(err)
}})

Skyzo.ev.on('contacts.update', (update) => {
for (let contact of update) {
let id = Skyzo.decodeJid(contact.id)
if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
}
})

Skyzo.sendPoll = (jid, name = '', values = [], selectableCount = 1) => {
return Skyzo.sendMessage(jid, {poll: { name, values, selectableCount }})
};

Skyzo.public = true

Skyzo.ev.on('creds.update', saveCreds)
return Skyzo
}

startSesi()

process.on('uncaughtException', function (err) {
console.log('Caught exception: ', err)
})