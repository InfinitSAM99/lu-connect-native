import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GITHUB_REPO = "InfinitSAM99/lu-connect-native";

serve(async (req) => {
  try {
    // 1. Fetch latest release from GitHub
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Supabase-Edge-Function' }
    });
    
    if (!response.ok) throw new Error("Failed to fetch from GitHub API");
    const data = await response.json();
    const latestTag = data.tag_name; // e.g., "native-build-16"
    const apkAsset = data.assets.find((a) => a.name.endsWith(".apk"));
    const apkUrl = apkAsset ? apkAsset.browser_download_url : "";

    // 2. Connect to Supabase using the Service Role Key (server-side, secure)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Get current settings
    const { data: currentSettings } = await supabaseClient
      .from('app_settings')
      .select('latest_version')
      .eq('id', 1)
      .single();

    // 4. If the GitHub version is different (newer), update the database
    if (currentSettings?.latest_version !== latestTag) {
      await supabaseClient
        .from('app_settings')
        .update({
          latest_version: latestTag,
          apk_url: apkUrl,
          // If you want it to force update automatically, set this to true
          force_update: true, 
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      return new Response(JSON.stringify({ message: `Updated to ${latestTag}` }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: "Already up to date" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
})
