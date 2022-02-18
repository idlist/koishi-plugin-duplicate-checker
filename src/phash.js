/**
 * This script is from
 * https://github.com/btd/sharp-phash/blob/master/index.js
 * and some modification is made to meet the need.
 */
const sharp = require('sharp')

const SAMPLE_SIZE = 32
const LOW_SIZE = 8

/**
 * @param {number} size
 * @returns {number[]}
 */
const initSqrt = size => {
  const sqrts = new Array(size)
  for (let i = 1; i < size; i++) {
    sqrts[i] = 1
  }
  sqrts[0] = 1 / Math.sqrt(2.0)
  return sqrts
}

/**
 * @param {number} size
 * @returns {number[][]}
 */
const initCos = size => {
  const cosines = new Array(size)
  for (let k = 0; k < size; k++) {
    cosines[k] = new Array(size)
    for (let n = 0; n < size; n++) {
      cosines[k][n] = Math.cos(((2 * k + 1) / (2.0 * size)) * n * Math.PI)
    }
  }
  return cosines
}

const sqrt = initSqrt(SAMPLE_SIZE)
const cos = initCos(SAMPLE_SIZE)

/**
 * @param {number[][]} image
 * @param {number} size
 * @returns {number[][]}
 */
const applyDCT = (image, size) => {
  const dct = new Array(size)
  for (let u = 0; u < size; u++) {
    dct[u] = new Array(size)
    for (let v = 0; v < size; v++) {
      let sum = 0
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          sum += cos[i][u] * cos[j][v] * image[i][j]
        }
      }
      sum *= (sqrt[u] * sqrt[v]) / 4
      dct[u][v] = sum
    }
  }
  return dct
}

/**
 * @param {import('sharp').SharpOptions} image Image to be phashed.
 * @param {number?} size Size of the square taken from the result of DCT. Default value is 8.
 * @returns {Promise<string>} Fingerprint.
 */
const phash = async (image, size = LOW_SIZE) => {
  // Preprocess image.
  const data = await sharp(image)
    .greyscale()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'fill' })
    .raw()
    .toBuffer()

  // Copy signal.
  const s = new Array(SAMPLE_SIZE)
  for (let x = 0; x < SAMPLE_SIZE; x++) {
    s[x] = new Array(SAMPLE_SIZE)
    for (let y = 0; y < SAMPLE_SIZE; y++) {
      s[x][y] = data[SAMPLE_SIZE * y + x]
    }
  }

  console.log(s)

  // Apply 2D DCT II
  const dct = applyDCT(s, SAMPLE_SIZE)

  console.log(dct)

  // Get AVG on high frequencies.
  let totalSum = 0
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      totalSum += dct[x + 1][y + 1]
    }
  }

  const avg = totalSum / (size * size)

  // Compute Hash.
  let fingerprint = ''

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      fingerprint += dct[x + 1][y + 1] > avg ? '1' : '0'
    }
  }

  return fingerprint
}

module.exports = phash