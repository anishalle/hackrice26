"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Loader2, Mic, Play, Square, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createVoiceClone,
  deleteVoiceSample,
  generateVoiceSpeech,
  getVoiceProfile,
  setUpVoiceProfile,
  type VoiceProfile,
  uploadVoiceSample,
} from "@/lib/voice-preservation";

interface VoicePreservationProps {
  ownerSubject: string;
  displayName: string;
}

const PRACTICE_PHRASE = "My voice matters, and I want to preserve it for the future.";

export function VoicePreservation({ ownerSubject, displayName }: VoicePreservationProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadProfile() {
    try {
      setProfile(await getVoiceProfile(ownerSubject));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your voice profile.");
    }
  }

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startRecording() {
    if (!consented) {
      setMessage("Please confirm consent before recording your voice.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Audio recording is not available in this browser. Upload a supported audio file instead.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const savedProfile = await setUpVoiceProfile(ownerSubject, displayName || "My preserved voice");
      setProfile(savedProfile);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = supportedRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => void saveRecording(recorder.mimeType || "audio/webm");
      recorder.start();
      setRecording(true);
      setMessage("Recording. Read the practice phrase slowly and clearly, then choose Stop recording.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start recording.");
    } finally {
      setSaving(false);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }

  async function saveRecording(contentType: string) {
    setSaving(true);
    try {
      const recordingBlob = new Blob(chunksRef.current, { type: contentType });
      const sample = await uploadVoiceSample(
        ownerSubject,
        recordingBlob,
        recordingFilename(contentType),
        PRACTICE_PHRASE
      );
      setProfile((current) =>
        current
          ? { ...current, sample_count: current.sample_count + 1, samples: [sample, ...current.samples] }
          : current
      );
      setMessage("Recording saved privately. Add more samples over time for a stronger voice model.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this recording.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSample(sampleId: string) {
    try {
      await deleteVoiceSample(ownerSubject, sampleId);
      setProfile((current) =>
        current
          ? {
              ...current,
              sample_count: current.sample_count - 1,
              samples: current.samples.filter((sample) => sample.id !== sampleId),
            }
          : current
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete this recording.");
    }
  }

  async function cloneVoice() {
    setCloning(true);
    setMessage(null);
    try {
      setProfile(await createVoiceClone(ownerSubject));
      setMessage("Your voice has been sent to ElevenLabs. You can now use it once it is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create your voice.");
    } finally {
      setCloning(false);
    }
  }

  async function speakPreview() {
    setSpeaking(true);
    setMessage(null);
    try {
      const audioUrl = URL.createObjectURL(await generateVoiceSpeech(ownerSubject, PRACTICE_PHRASE));
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not play your voice preview.");
    } finally {
      setSpeaking(false);
    }
  }

  const voiceReady = profile?.provider_status === "ready";

  return (
    <section className="mt-8 rounded-xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="voice-preservation-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <AudioLines className="size-4" />
            Voice preservation
          </div>
          <h2 id="voice-preservation-title" className="mt-2 text-xl font-semibold tracking-tight">
            Keep a recording of your voice
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Save short recordings now, then explicitly choose when to send them to ElevenLabs to create a voice.
            More clean audio gives a better result; aim for about one minute over several recordings.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {profile ? `${profile.sample_count} sample${profile.sample_count === 1 ? "" : "s"}` : "No samples yet"}
        </span>
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Practice phrase</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">“{PRACTICE_PHRASE}”</p>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block font-medium">I consent to storing these recordings and sending them to ElevenLabs only when I choose Create my voice.</span>
          <span className="block text-xs leading-5 text-muted-foreground">You can delete saved recordings individually before creating a voice.</span>
        </span>
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void loadProfile()} disabled={saving || recording}>
          Refresh recordings
        </Button>
        {recording ? (
          <Button variant="destructive" onClick={stopRecording} disabled={saving}>
            <Square className="size-4" />
            Stop recording
          </Button>
        ) : (
          <Button onClick={() => void startRecording()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            Record a sample
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => void cloneVoice()}
          disabled={!profile?.sample_count || !!profile.provider_voice_id || cloning}
        >
          {cloning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Create my voice
        </Button>
        <Button variant="outline" onClick={() => void speakPreview()} disabled={!voiceReady || speaking}>
          {speaking ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
          Hear preview
        </Button>
      </div>

      {profile?.provider_status === "verification_required" && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          ElevenLabs requires verification before this voice can generate speech.
        </p>
      )}

      {profile?.samples.length ? (
        <ul className="mt-6 divide-y rounded-xl border" aria-label="Saved voice recordings">
          {profile.samples.map((sample) => (
            <li key={sample.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{sample.phrase_hint || sample.original_filename}</p>
                <p className="text-xs text-muted-foreground">{Math.ceil(sample.byte_size / 1024)} KB · saved {new Date(sample.created_at).toLocaleDateString()}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Delete recording" onClick={() => void removeSample(sample.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}

function supportedRecordingMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(
    (mimeType) => MediaRecorder.isTypeSupported(mimeType)
  );
}

function recordingFilename(contentType: string): string {
  if (contentType.includes("ogg")) return "voice-sample.ogg";
  if (contentType.includes("mp4")) return "voice-sample.m4a";
  return "voice-sample.webm";
}
