const fs = require("fs");
const path = require("path");

function findFileRecursive(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
}

function getModuleKotlin(pkg) {
  return `package ${pkg}

import android.content.Context
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class LuConnectNtfyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LuConnectNtfy"

    @ReactMethod
    fun setTopicUrl(url: String) {
        val trimmed = url.trim()
        reactApplicationContext
            .getSharedPreferences("lu_connect_ntfy_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("topic_url", trimmed)
            .apply()
    }
}

class LuConnectNtfyPackage : com.facebook.react.BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext
    ): NativeModule? =
        if (name == "LuConnectNtfy") LuConnectNtfyModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                "LuConnectNtfy" to ReactModuleInfo(
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
      const pkgDir = path.join(root, "app/src/main/java", ...pkg.split("."));
      fs.mkdirSync(pkgDir, { recursive: true });

      fs.writeFileSync(path.join(pkgDir, "LuConnectNtfyModule.kt"), getModuleKotlin(pkg));

      const mainApp = findFileRecursive(path.join(root, "app/src/main"), "MainApplication.kt");
      if (mainApp) {
        fs.writeFileSync(mainApp, patchMainApplication(fs.readFileSync(mainApp, "utf8")));
      }
      return cfg;
    },
  ]);
};
