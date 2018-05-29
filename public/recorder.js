let Recorder = function (source) {
  const bufferLen = 4096
  let recording = false
  let currCallback = null

  this.context = source.context
  if (!this.context.createScriptProcessor) {
    this.node = this.context.createJavaScriptNode(bufferLen, 2, 2)
  } else {
    this.node = this.context.createScriptProcessor(bufferLen, 2, 2)
  }

  const worker = new Worker('./recorderWorker.js')
  worker.postMessage({
    command: 'init',
    config: {sampleRate: this.context.sampleRate}
  })

  this.record = () => { recording = true }
  this.stop = () => { recording = false }
  this.clear = () => worker.postMessage({command: 'clear'})
  this.getBuffers = cb => {
    currCallback = cb
    worker.postMessage({command: 'getBuffers'})
  }

  this.exportWAV = cb => {
    currCallback = cb
    worker.postMessage({command: 'exportWAV', type: 'audio/wav'})
  }

  this.node.onaudioprocess = e => {
    if (!recording) return
    worker.postMessage({
      command: 'record',
      buffer: [
        e.inputBuffer.getChannelData(0),
        e.inputBuffer.getChannelData(1)
      ]
    })
  }

  worker.onmessage = e => currCallback(e.data)
  source.connect(this.node)
  this.node.connect(this.context.destination)
}

window.Recorder = Recorder
