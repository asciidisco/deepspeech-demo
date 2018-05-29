const EventEmitter = require('events')
const startServer = require('./server')
const initDeepspeech = require('./ds')

const myEmitter = new EventEmitter()
const audioStreamCb = initDeepspeech(myEmitter)
startServer(audioStreamCb, myEmitter)
