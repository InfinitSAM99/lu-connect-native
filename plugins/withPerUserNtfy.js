const fs = require("fs");
const path = require("path");

function patchServiceKotlin(src) {
  let out = src;

  if (!out.includes("EXTRA_TOPIC_URL")) {
    out = out.replace(
      /var topicUrl: String = BuildConfig\.[A-Z0-9_]+/,
      `const val EXTRA_TOPIC_URL = "topic_url"
        private const val PREFS_NAME = "lu_connect_ntfy_prefs"
        private const val KEY_TOPIC_URL = "topic_url"
        var topicUrl: String = BuildConfig.NTFY_TOPIC_URL

        fun loadSavedTopic(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val saved = prefs.getString(KEY_TOPIC_URL, null)
            val resolved = if (!saved.isNullOrBlank()) saved else BuildConfig.NTFY_TOPIC_URL
            topicUrl = resolved
            return resolved
        }

        fun saveAndApplyTopic(context: Context, newUrl: String) {
            val trimmed = newUrl.trim()
            val finalUrl = if (trimmed.isNotEmpty()) trimmed else BuildConfig.NTFY_TOPIC_URL
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_TOPIC_URL, finalUrl)
                .apply()
            topicUrl = finalUrl
            val intent = Intent(context, NtfyService::class.java).apply {
                putExtra(EXTRA_TOPIC_URL, finalUrl)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "apply topic failed: " + e.message)
            }
        }`
    );
  }

  if (!out.includes("loadSavedTopic(this)")) {
    out = out.replace("createChannels()", "loadSavedTopic(this)\n        createChannels()");
  }

  if (!out.includes("val incoming = intent?.getStringExtra(EXTRA_TOPIC_URL)")) {
    out = out.replace(
      "override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY",
      `override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val incoming = intent?.getStringExtra(EXTRA_TOPIC_URL)
        if (!incoming.isNullOrBlank() && incoming != topicUrl) {
            topicUrl = incoming
            try { ws?.close(1000, "topic changed") } catch (_: Exception) {}
            connect()
        }
        return START_STICKY
    }`
    );
  }

  if (!out.includes("class LuConnectNtfyModule")) {
    out += `
class LuConnectNtfyModule(reactContext: com.facebook.react.bridge.ReactApplicationContext) :
    com.facebook.react.bridge.ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "LuConnectNtfy"

    @com.facebook.react.bridge.ReactMethod
    fun setTopicUrl(url: String) {
        NtfyService.saveAndApplyTopic(reactApplicationContext, url)
    }
}

class LuConnectNtfyPackage : com.facebook.react.BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: com.facebook.react.bridge.ReactApplicationContext
    ): com.facebook.react.bridge.NativeModule? =
        if (name == "LuConnectNtfy") LuConnectNtfyModule(reactContext) else null

    override fun getReactModuleInfoProvider(): com.facebook.react.module.model.ReactModuleInfoProvider =
        com.facebook.react.module.model.ReactModuleInfoProvider {
            mapOf(
                "LuConnectNtfy" to com.facebook.react.module.model.ReactModuleInfo(
                    "LuConnectNtfy",
                    "LuConnectNtfy",
                    false,
                    false,
                    false,
                    false
                )
            )
        }
}
`;
  }

  return out;
}

function patchMainApplication(src) {
  if (src.includes("LuConnectNtfyPackage()")) return src;
  if (/PackageList\(this\)\.packages\.apply\s*\{/.test(src)) {
    return src.replace(
      /PackageList\(this\)\.packages\.apply\s*\{/,
      "PackageList(this).packages.apply {\n              add(LuConnectNtfyPackage())"
    );
  }
  if (/val packages = PackageList\(this\)\.packages/.test(src)) {
    return src.replace(
      /val packages = PackageList\(this\)\.packages/,
      "val packages = PackageList(this).packages\n            packages.add(LuConnectNtfyPackage())"
    );
  }
  return src;
}

module.exports = function withPerUserNtfy(config) {
  const { withDangerousMod } = require("expo/config-plugins");
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const pkg = (cfg.android && cfg.android.package) || "com.infinitsam.luconnectnative";
      const dir = path.join(root, "app/src/main/java", ...pkg.split("."));

      const serviceFile = path.join(dir, "NtfyService.kt");
      if (fs.existsSync(serviceFile)) {
        fs.writeFileSync(serviceFile, patchServiceKotlin(fs.readFileSync(serviceFile, "utf8")));
      }

      const mainApp = path.join(dir, "MainApplication.kt");
      if (fs.existsSync(mainApp)) {
        fs.writeFileSync(mainApp, patchMainApplication(fs.readFileSync(mainApp, "utf8")));
      }
      return cfg;
    },
  ]);
};
