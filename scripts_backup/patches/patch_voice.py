import re

file_path = 'src/components/ChatHelpers.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# We will replace the entire VoiceNotePlayer function
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

  const pct = duration > 0 ? Math.min(progress / duration, 1) : 0;
  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const activeColor = isMine ? '#ffffff' : '#ef4444';
  const inactiveColor = isMine ? 'rgba(255,255,255,0.3)' : 'rgba(239,68,68,0.2)';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 190, paddingVertical: 2 }}>
      <TouchableOpacity onPress={toggle} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isMine ? 'rgba(0,0,0,0.2)' : 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color={isMine ? '#fff' : '#ef4444'} style={{ marginLeft: playing ? 0 : 2 }} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: inactiveColor, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: activeColor }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: isMine ? 'rgba(255,255,255,0.8)' : '#6d7382', fontSize: 10, fontWeight: '600' }}>
            {fmt(progress)}
          </Text>
          <Text style={{ color: isMine ? 'rgba(255,255,255,0.8)' : '#6d7382', fontSize: 10, fontWeight: '600' }}>
            {fmt(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}"""

# Regex to find and replace the existing VoiceNotePlayer function
pattern = re.compile(r"export function VoiceNotePlayer\(\{ url, isMine \}: any\) \{.*?^\}", re.MULTILINE | re.DOTALL)
content_new = pattern.sub(new_player, content)

if content_new != content:
    with open(file_path, 'w') as f:
        f.write(content_new)
    print("Successfully updated VoiceNotePlayer in ChatHelpers.tsx")
else:
    print("Error: Could not find VoiceNotePlayer to replace.")
