import CryptoJS from 'crypto-js';

if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (typeof global.crypto.subtle === 'undefined') {
  global.crypto.subtle = {
    digest: async (algorithm, data) => {
      const hashAlgo = algorithm.name.replace('-', '').toLowerCase();
      const wordArray = CryptoJS.lib.WordArray.create(data);
      const hash = CryptoJS[hashAlgo](wordArray);
      
      // Convert to ArrayBuffer
      const buffer = new ArrayBuffer(hash.sigBytes);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < hash.sigBytes; i++) {
        view[i] = (hash.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      }
      return buffer;
    }
  };
}
