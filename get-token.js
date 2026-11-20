const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  keyFile: 'service-account.json', // Make sure your json file is named exactly this
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

(async () => {
  try {
    const token = await auth.getAccessToken();
    console.log("✅ YOUR ACCESS TOKEN:");
    console.log(token);
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
})();
