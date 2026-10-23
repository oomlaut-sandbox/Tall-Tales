// Upload or record music (Music and Sounds, behind the grown-ups' question): a grown-up uploads an audio file from
// the phone, or records one right here (a parent or grandparent singing a lullaby), gives it a name, and it becomes
// a new piece in the Music list to choose like any other.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { colors, fonts } from '../theme';
import { useT } from '../i18n';
import { addMusic, cleanName, pickFile } from '../myMusic';
import { chooseAmbient, holdAmbient } from '../ambient';

const REC = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1 };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function MyMusicSheet({ visible, onClose, kind = 'music' }) {
  const isSound = kind === 'sound';
  const t = useT();
  const recorder = useAudioRecorder(REC);
  const [step, setStep] = useState('choose'); // choose → record → name
  const [file, setFile] = useState(null); // { uri, name }
  const [name, setName] = useState('');
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState('');
  const started = useRef(0);
  const preview = useRef(null);
  useEffect(() => { if (visible) { setStep('choose'); setFile(null); setName(''); setMsg(''); setSecs(0); } }, [visible]);
  useEffect(() => { if (!recording) return undefined; const iv = setInterval(() => setSecs((Date.now() - started.current) / 1000), 250); return () => clearInterval(iv); }, [recording]);
  const stopPreview = () => { try { if (preview.current) { preview.current.pause(); preview.current.remove(); } } catch (e) {} preview.current = null; };
  useEffect(() => () => stopPreview(), []);

  const upload = async () => {
    const f = await pickFile();
    if (!f) return;
    setFile(f); setName(cleanName(f.name)); setStep('name');
  };
  const startRec = async () => {
    setMsg('');
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setMsg(t('Oomlaut Reader needs the microphone to record. You can allow it in Settings.')); return; }
      stopPreview();
      holdAmbient(true); // the music mustn't be in the recording
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      started.current = Date.now(); setSecs(0); setRecording(true);
    } catch (e) { setMsg(t('Recording couldn’t start. Try again.')); holdAmbient(false); }
  };
  const stopRec = async () => {
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri && (Date.now() - started.current) > 1500) { setFile({ uri: recorder.uri, name: 'recording.m4a' }); }
    } catch (e) { setMsg(t('That recording couldn’t be saved.')); }
    holdAmbient(false);
  };
  const listen = () => {
    if (!file) return;
    if (preview.current) { stopPreview(); return; }
    try { const p = createAudioPlayer({ uri: file.uri }); preview.current = p; p.play(); } catch (e) {}
  };
  const save = async () => {
    stopPreview();
    const id = await addMusic(file.uri, name, file.name, kind);
    if (!id) { setMsg(t('That music couldn’t be added. Try another file.')); return; }
    chooseAmbient(isSound ? 'sound' : 'music', id);
    onClose();
  };
  const close = async () => { stopPreview(); if (recording) await stopRec(); onClose(); };

  const Pill = ({ label, onPress, color = colors.green, disabled }) => (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.pill, { backgroundColor: color, opacity: disabled ? 0.4 : 1 }]} accessibilityRole="button">
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{isSound ? t('Upload or record a sound') : t('Upload or record music')}</Text>
          {step === 'choose' ? (
            <>
              <Text style={styles.small}>{isSound ? t('Add a sound from your phone, or record one yourself: rain on your window, the sea, your cat purring.') : t('Add a song from your phone, or record one yourself: a parent or grandparent singing a lullaby.')}</Text>
              <View style={{ gap: 12, marginTop: 18 }}>
                <Pill label={t('Upload')} onPress={upload} />
                <Pill label={t('Record')} color={colors.deepRed} onPress={() => setStep('record')} />
              </View>
            </>
          ) : null}
          {step === 'record' ? (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Text style={styles.timer}>{mmss(secs)}</Text>
              <Pressable onPress={recording ? stopRec : startRec} style={styles.recBtn} accessibilityRole="button" accessibilityLabel={recording ? t('Stop') : t('Record')}>
                <View style={recording ? styles.recStop : styles.recDot} />
              </Pressable>
              <Text style={[styles.small, { marginTop: 10 }]}>{recording ? t('Recording… tap to stop') : file ? t('Listen, record again, or keep it') : isSound ? t('Tap to start recording') : t('Tap to start singing')}</Text>
              {file && !recording ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Pill label={t('Listen')} color="#555" onPress={listen} />
                  <Pill label={t('Keep it')} onPress={() => { stopPreview(); setName(isSound ? t('Our sound') : t('Lullaby')); setStep('name'); }} />
                </View>
              ) : null}
            </View>
          ) : null}
          {step === 'name' ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>{t('Name')}</Text>
              <TextInput allowFontScaling={false} value={name} onChangeText={setName} placeholder={isSound ? t('Rain on our window') : t('Grandma’s lullaby')} placeholderTextColor="#777" style={styles.input} autoFocus maxLength={40} returnKeyType="done" onSubmitEditing={save} />
              <View style={{ marginTop: 16 }}><Pill label={isSound ? t('Add to Sounds') : t('Add to Music')} onPress={save} disabled={!name.trim()} /></View>
            </View>
          ) : null}
          {msg ? <Text style={[styles.small, { color: '#e88', marginTop: 12 }]}>{msg}</Text> : null}
          <Pressable onPress={close} hitSlop={10} style={{ alignSelf: 'center', marginTop: 18 }} accessibilityRole="button"><Text style={styles.cancel}>{t('Cancel')}</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#222', borderRadius: 20, padding: 22 },
  title: { color: colors.white, fontFamily: fonts.ui, fontSize: 19, fontWeight: '700', marginBottom: 8 },
  small: { color: '#b5b5b5', fontFamily: fonts.ui, fontSize: 14, lineHeight: 19 },
  label: { color: '#b5b5b5', fontFamily: fonts.ui, fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#333', color: colors.white, fontFamily: fonts.ui, fontSize: 17, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 0, includeFontPadding: false, height: 46 },
  pill: { height: 44, borderRadius: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontFamily: fonts.ui, fontSize: 16, fontWeight: '700' },
  timer: { color: colors.white, fontFamily: fonts.ui, fontSize: 34, fontWeight: '200', marginBottom: 14, fontVariant: ['tabular-nums'] },
  recBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  recDot: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.highlight },
  recStop: { width: 28, height: 28, borderRadius: 5, backgroundColor: colors.highlight },
  cancel: { color: '#9a9a9a', fontFamily: fonts.ui, fontSize: 15 },
});
