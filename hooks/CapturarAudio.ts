import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useRef, useState } from "react";

export function useAudioCapture(maxMs = 8000) {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function ensurePermissions() {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) throw new Error("Permiso de micrófono denegado");
  }

  async function start() {
    await ensurePermissions();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); // m4a/aac
    await rec.startAsync();
    recordingRef.current = rec;
    setIsRecording(true);

    // Auto-stop por timeout
    timeoutRef.current = setTimeout(stop, maxMs);
  }

  async function stop() {
    if (!recordingRef.current) return;
    try {
      timeoutRef.current && clearTimeout(timeoutRef.current);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      return uri; // file://...
    } catch {
      setIsRecording(false);
      return undefined;
    }
  }

  async function toggle() {
    if (isRecording) return await stop();
    await start();
    return undefined;
  }

  return { isRecording, toggle, stop };
}
