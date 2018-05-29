const Sox = require('sox-stream')
const DeepSpeech = require('deepspeech')
const MemoryStream = require('memory-stream')

module.exports = emitter => {
  // Beam width used in the CTC decoder when building candidate transcriptions
  const BEAM_WIDTH = 500
  // The alpha hyperparameter of the CTC decoder. Language Model weight
  const LM_WEIGHT = 1.75
  // The beta hyperparameter of the CTC decoder. Word insertion weight (penalty)
  const WORD_COUNT_WEIGHT = 1.00
  // Valid word insertion weight. This is used to lessen the word insertion penalty
  // when the inserted word is part of the vocabulary
  const VALID_WORD_COUNT_WEIGHT = 1.00

  // These constants are tied to the shape of the graph used (changing them changes
  // the geometry of the first layer), so make sure you use the same constants that
  // were used during training

  // Number of MFCC features to use
  const N_FEATURES = 26
  // Size of the context window used for producing timesteps in the input vector
  const N_CONTEXT = 9

  const MODEL = './models/output_graph.pb'
  const ALPHABET = './models/alphabet.txt'
  const LM = './models/lm.binary'
  const TRIE = './models/trie'

  console.log('Loading model from file %s', MODEL)
  let model = new DeepSpeech.Model(MODEL, N_FEATURES, N_CONTEXT, ALPHABET, BEAM_WIDTH)
  console.log('Finished loading model')
  console.log('Loading language model from file(s) %s %s', LM, TRIE)
  model.enableDecoderWithLM(ALPHABET, LM, TRIE, LM_WEIGHT, WORD_COUNT_WEIGHT, VALID_WORD_COUNT_WEIGHT)
  console.log('Finished loading langauge model')

  return function (stream) {
    let audioStream = new MemoryStream()
    stream.pipe(Sox({
      output: {
        bits: 16,
        rate: 16000,
        channels: 1,
        type: 'raw'
      }
    })).pipe(audioStream)

    audioStream.on('finish', () => {
      let audioBuffer = audioStream.toBuffer()
      console.log('Running inference...')
      let text = model.stt(audioBuffer.slice(0, audioBuffer.length / 2), 16000)
      console.log('Inference finished: %s', String(text))
      emitter.emit('text', {text})
    })
  }
}
