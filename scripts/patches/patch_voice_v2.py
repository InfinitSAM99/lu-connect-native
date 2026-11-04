import re

file_path = 'src/components/ChatHelpers.tsx'
with open(file_path, 'r') as f:
    content = f.read()

new_player = """export function VoiceNotePlayer({ url, isMine }: any) {
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.isLoaded) {
        setPlaying(status.playing || false);
        setDuration(status.duration || 0);
        setProgress(status.currentTime || 0);
        if (status.didJustFinish) {
          setPlaying(false);
          setProgress(0);
          player.seekTo(0);
        }
      }
    });
    return () => { try { sub.remove(); } catch {} };
  }, [player]);

  const toggle = () => {
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Dots to simulate the waveform in the screenshot
  const totalBars = 20;
  const filledBars = duration > 0 ? Math.floor((progress / duration) * totalBars) : 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 200 }}>
      <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" style={{ marginLeft: playing ? 0 : 2 }} />
      </TouchableOpacity>
      
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginRight: 12, height: 20, gap: 3 }}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View 
            key={i} 
            style={{ 
              width: 3, 
              height: 12, 
              borderRadius: 1.5, 
              backgroundColor: i < filledBars ? '#fff' : 'rgba(255,255,255,0.3)' 
            }} 
          />
        ))}
      </View>

      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
        {fmt(playing || progress > 0 ? progress : duration)}
      </Text>
    </View>
  );
}"""

pattern = re.compile(r"export function VoiceNotePlayer\(\{ url, isMine \}: any\) \{.*?^\}", re.MULTILINE | re.DOTALL)
content_new = pattern.sub(new_player, content)

if content_new != content:
    with open(file_path, 'w') as f:
        f.write(content_new)
    print("Successfully updated VoiceNotePlayer in ChatHelpers.tsx")
else:
    print("Error: Could not find VoiceNotePlayer to replace.")
