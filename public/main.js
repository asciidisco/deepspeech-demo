let audioContext = new window.AudioContext()
let audioInput = null
let realAudioInput = null
let inputPoint = null
let audioRecorder = null
let socket = null
let analyserContext = null
let canvasWidth = null
let canvasHeight = null
let analyserNode = null

const drawBuffer = (width, height, context, data) => {
  const step = Math.ceil(data.length / width)
  const amp = height / 2
  context.fillStyle = 'silver'
  context.clearRect(0, 0, width, height)
  for (let i = 0; i < width; i++) {
    let min = 1.0
    let max = -1.0
    for (let j = 0; j < step; j++) {
      let datum = data[(i * step) + j]
      if (datum < min) min = datum
      if (datum > max) max = datum
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp))
  }
}

const gotBuffers = buffers => {
  let canvas = document.getElementById('wavedisplay')
  drawBuffer(canvas.width, canvas.height, canvas.getContext('2d'), buffers[0])
  audioRecorder.exportWAV(doneEncoding)
}

const doneEncoding = blob => {
  const stream = window.ss.createStream()
  document.getElementById('result').textContent = 'Analysing...'
  window.ss(socket).emit('audio', stream)
  window.ss.createBlobReadStream(blob).pipe(stream)
}

const toggleRecording = element => {
  if (element.classList.contains('recording')) {
    element.textContent = 'Listen'
    audioRecorder.stop()
    element.classList.remove('recording')
    audioRecorder.getBuffers(gotBuffers)
    return
  }
  element.textContent = 'Listening...'
  if (!audioRecorder) return
  element.classList.add('recording')
  audioRecorder.clear()
  audioRecorder.record()
}

const updateAnalysers = time => {
  if (!analyserContext) {
    const canvas = document.getElementById('analyser')
    canvasWidth = canvas.width
    canvasHeight = canvas.height
    analyserContext = canvas.getContext('2d')
  }

  // analyzer draw code here
  const SPACING = 3
  const BAR_WIDTH = 1
  const numBars = Math.round(canvasWidth / SPACING)
  const freqByteData = new Uint8Array(analyserNode.frequencyBinCount)
  analyserNode.getByteFrequencyData(freqByteData)
  analyserContext.clearRect(0, 0, canvasWidth, canvasHeight)
  analyserContext.fillStyle = '#F6D565'
  analyserContext.lineCap = 'round'
  const multiplier = analyserNode.frequencyBinCount / numBars

  // Draw rectangle for each frequency bin.
  for (let i = 0; i < numBars; ++i) {
    let magnitude = 0
    const offset = Math.floor(i * multiplier)
    // gotta sum/average the block, or we miss narrow-bandwidth spikes
    for (var j = 0; j < multiplier; j++) magnitude += freqByteData[offset + j]
    magnitude = magnitude / multiplier
    analyserContext.fillStyle = `hsl( ${Math.round((i * 360) / numBars)}, 100%, 50%)`
    analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude)
  }
  window.requestAnimationFrame(updateAnalysers)
}

const gotStream = stream => {
  inputPoint = audioContext.createGain()
  // Create an AudioNode from the stream.
  realAudioInput = audioContext.createMediaStreamSource(stream)
  audioInput = realAudioInput
  audioInput.connect(inputPoint)
  analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 2048
  inputPoint.connect(analyserNode)
  audioRecorder = new window.Recorder(inputPoint)
  let zeroGain = audioContext.createGain()
  zeroGain.gain.value = 0.0
  inputPoint.connect(zeroGain)
  zeroGain.connect(audioContext.destination)
  updateAnalysers()
}

const initAudio = () => {
  navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true
      },
      optional: []
    }
  }).then(gotStream).catch(console.error)
}

const connect = () => {
  socket = window.io.connect(window.location.origin)
  window.ss(socket).on('news', (stream, data) => {
    document.getElementById('result').textContent = data.text
  })
}

connect()
initAudio()
