import * as Crypto from 'expo-crypto';
if (typeof global.crypto === 'undefined') global.crypto = {};
if (typeof global.crypto.subtle === 'undefined') {
  global.crypto.subtle = {
    digest: async (algorithm, data) => {
      const algoName = typeof algorithm === 'string' ? algorithm : algorithm.name;
      let expoAlgo;
      switch (algoName.toUpperCase()) {
        case 'SHA-256': expoAlgo = Crypto.CryptoDigestAlgorithm.SHA256; break;
        case 'SHA-384': expoAlgo = Crypto.CryptoDigestAlgorithm.SHA384; break;
        case 'SHA-512': expoAlgo = Crypto.CryptoDigestAlgorithm.SHA512; break;
        case 'SHA-1': expoAlgo = Crypto.CryptoDigestAlgorithm.SHA1; break;
        default: throw new Error(`Unsupported algorithm: ${algoName}`);
      }
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      return await Crypto.digest(expoAlgo, bytes);
    },
  };
}
console.log('✅ Crypto polyfill loaded');
