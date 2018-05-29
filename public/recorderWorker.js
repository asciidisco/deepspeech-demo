let recLength = 0
let recBuffersL = []
let recBuffersR = []
let sampleRate

this.onmessage = e => {
  if (e.data.command === 'init') init(e.data.config)
  if (e.data.command === 'record') record(e.data.buffer)
  if (e.data.command === 'exportWAV') exportWAV(e.data.type)
  if (e.data.command === 'getBuffers') getBuffers()
  if (e.data.command === 'clear') clear()
}

const mergeBuffers = (recBuffers, recLength) => {
  let result = new Float32Array(recLength)
  let offset = 0
  for (let i = 0; i < recBuffers.length; i++) {
    result.set(recBuffers[i], offset)
    offset += recBuffers[i].length
  }
  return result
}

const init = config => { sampleRate = config.sampleRate }

const record = inputBuffer => {
  recBuffersL.push(inputBuffer[0])
  recBuffersR.push(inputBuffer[1])
  recLength += inputBuffer[0].length
}

const exportWAV = type => {
  const bufferL = mergeBuffers(recBuffersL, recLength)
  const bufferR = mergeBuffers(recBuffersR, recLength)
  const interleaved = interleave(bufferL, bufferR)
  const dataview = encodeWAV(interleaved)
  const audioBlob = new Blob([dataview], {type})
  this.postMessage(audioBlob)
}

const getBuffers = () => {
  let buffers = []
  buffers.push(mergeBuffers(recBuffersL, recLength))
  buffers.push(mergeBuffers(recBuffersR, recLength))
  this.postMessage(buffers)
}

const clear = () => {
  recLength = 0
  recBuffersL = []
  recBuffersR = []
}

const interleave = (inputL, inputR) => {
  const length = inputL.length + inputR.length
  let result = new Float32Array(length)
  let index = 0
  let inputIndex = 0
  while (index < length) {
    result[index++] = inputL[inputIndex]
    result[index++] = inputR[inputIndex]
    inputIndex++
  }
  return result
}

const floatTo16BitPCM = (output, offset, input) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

const encodeWAV = samples => {
  let buffer = new ArrayBuffer(44 + samples.length * 2)
  let view = new DataView(buffer)
  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* file length */
  view.setUint32(4, 32 + samples.length * 2, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, 1, true)
  /* channel count */
  view.setUint16(22, 2, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 4, true)
  /* bits per sample */
  view.setUint16(34, 16, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true)
  floatTo16BitPCM(view, 44, samples)
  return view
}
