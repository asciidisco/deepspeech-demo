const fs = require('fs')
const path = require('path')
const http = require('http')
const express = require('express')
const serve = require('express-static')
const SocketIo = require('socket.io')
const ss = require('socket.io-stream')

const PORT = 3000
const app = express()
const server = http.Server(app)
const io = SocketIo(server)

module.exports = function (streamCb, myEmitter) {
  // add socket io client libs from node_modules
  app.get('/socket.io-stream.js', (req, res) => fs.createReadStream(require.resolve('socket.io-stream/socket.io-stream.js')).pipe(res))
  app.get('/socket.io.js', (req, res) => fs.createReadStream(require.resolve('socket.io-client/dist/socket.io.js')).pipe(res))
  app.get('/socket.io.js.map', (req, res) => fs.createReadStream(require.resolve('socket.io-client/dist/socket.io.js.map')).pipe(res))
  app.get('/adapter.js', (req, res) => fs.createReadStream(require.resolve('webrtc-adapter/out/adapter.js')).pipe(res))
  // static ressources
  app.use(serve(path.join(__dirname, 'public')))
  // configure socket.io stream interface (add callbacks for audio stream & return text)
  io.on('connection', socket => {
    ss(socket).on('audio', streamCb)
    myEmitter.on('text', text => ss(socket).emit('news', ss.createStream(), text))
  })
  // start the server
  server.listen(PORT, () => console.log('Server is running at http://localhost:%s - You´re good to go!', server.address().port))
}
