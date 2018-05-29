const wget = require('wget-improved')
const ProgressBar = require('progress')
const tar = require('tar')
const src = 'https://github.com/mozilla/DeepSpeech/releases/download/v0.1.1/deepspeech-0.1.1-models.tar.gz'
const output = './models.tar.gz'
let bar = null
console.log('The Demo is now downloading the pre-trained models from %s (roughly 1.4 GB), this will take a few moments...', src)
let download = wget.download(src, output)
download.on('error', console.error)
download.on('progress', progress => bar.tick(progress))
download.on('start', _ => {
  bar = new ProgressBar('  downloading [:bar] :percent :etas', {
    width: 20,
    total: (100000 / 2)
  })
})
download.on('end', async _ => {
  bar.tick(100000 / 2)
  console.log('')
  console.log('Extracting tar archive...')
  await tar.x({file: output})
  console.log('Done extracting archive')
})
