"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createVoiceClone,
  deleteVoiceSample,
  generateVoiceSpeech,
  getVoiceProfile,
  rebuildVoiceClone,
  setUpVoiceProfile,
  type VoiceProfile,
  uploadVoiceSample,
} from "@/lib/voice-preservation";

interface VoicePreservationProps {
  ownerSubject: string;
  displayName: string;
}

const VOICE_PREVIEW_TEXT =
  "My voice matters, and I want to preserve it for the future.";

const SPEECH_EXERCISES = [
  {
    id: "sustained-ah",
    title: "Sustained vowel",
    instruction:
      "Take a comfortable breath, then hold “ah” steadily for as long as feels comfortable. Do not strain.",
    sampleLabel: "Sustained “ah” vowel exercise",
  },
  {
    id: "pa-ta-ka",
    title: "Pa-ta-ka repetition",
    instruction:
      "Repeat “pa-ta-ka” evenly and clearly for about 10 seconds at a comfortable pace.",
    sampleLabel: "Pa-ta-ka speech-motor exercise",
  },
  {
    id: "counting",
    title: "Count aloud",
    instruction:
      "Count from 1 to 20 in your usual speaking voice, with a natural pace and pauses.",
    sampleLabel: "Counting 1 to 20 exercise",
  },
  {
    id: "reading",
    title: "Short reading",
    instruction:
      "Read: “Today is a calm day. I can speak clearly and comfortably with the people I care about.”",
    sampleLabel: "Connected-speech reading exercise",
  },
] as const;

type ExerciseId = (typeof SPEECH_EXERCISES)[number]["id"];

export function VoicePreservation({
  ownerSubject,
  displayName,
}: VoicePreservationProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const latestRecordingUrlRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] =
    useState<ExerciseId>("sustained-ah");
  const [latestRecordingUrl, setLatestRecordingUrl] = useState<string | null>(
    null
  );

  const selectedExercise =
    SPEECH_EXERCISES.find((exercise) => exercise.id === selectedExerciseId) ??
    SPEECH_EXERCISES[0];

  async function loadProfile(): Promise<VoiceProfile | null> {
    try {
      const savedProfile = await getVoiceProfile(ownerSubject);
      setProfile(savedProfile);
      return savedProfile;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load your voice profile."
      );
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    void getVoiceProfile(ownerSubject)
      .then((savedProfile) => {
        if (!cancelled) setProfile(savedProfile);
      })
      .catch(() => {
        // The explicit refresh/record actions show a useful error if this persists.
      });

    return () => {
      cancelled = true;
    };
  }, [ownerSubject]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (latestRecordingUrlRef.current) {
        URL.revokeObjectURL(latestRecordingUrlRef.current);
      }
    };
  }, []);

  async function startRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage(
        "Audio recording is not available in this browser. Use a browser with microphone recording enabled."
      );
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const existingProfile = profile ?? (await loadProfile());
      if (!existingProfile && !consented) {
        setMessage("Please confirm consent before recording your voice.");
        return;
      }

      const savedProfile =
        existingProfile ??
        (await setUpVoiceProfile(
          ownerSubject,
          displayName || "My preserved voice"
        ));
      setProfile(savedProfile);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = supportedRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () =>
        void saveRecording(recorder.mimeType || "audio/webm");
      recorder.start();
      setRecording(true);
      setMessage(
        "Recording. Follow the selected exercise, then choose Stop recording."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not start recording."
      );
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
    const recordingBlob = new Blob(chunksRef.current, { type: contentType });
    if (latestRecordingUrlRef.current) {
      URL.revokeObjectURL(latestRecordingUrlRef.current);
    }
    const recordingUrl = URL.createObjectURL(recordingBlob);
    latestRecordingUrlRef.current = recordingUrl;
    setLatestRecordingUrl(recordingUrl);

    try {
      const sample = await uploadVoiceSample(
        ownerSubject,
        recordingBlob,
        recordingFilename(contentType),
        selectedExercise.sampleLabel
      );
      setProfile((current) =>
        current
          ? {
              ...current,
              sample_count: current.sample_count + 1,
              samples: [sample, ...current.samples],
            }
          : current
      );
      setMessage(
        "Recording saved privately. Listen to it below, then add more exercises over time for a stronger voice model."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save this recording."
      );
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
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete this recording."
      );
    }
  }

  async function cloneVoice() {
    setCloning(true);
    setMessage(null);
    try {
      setProfile(await createVoiceClone(ownerSubject));
      setMessage(
        "Your voice has been sent to ElevenLabs. You can use it once it is ready."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not create your voice."
      );
    } finally {
      setCloning(false);
    }
  }

  async function rebuildVoice() {
    setCloning(true);
    setMessage(null);
    try {
      setProfile(await rebuildVoiceClone(ownerSubject));
      setConfirmingRebuild(false);
      setMessage(
        "Your voice was rebuilt from every saved recording and is ready to use."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not rebuild your voice."
      );
    } finally {
      setCloning(false);
    }
  }

  async function speakPreview() {
    setSpeaking(true);
    setMessage(null);
    try {
      const audioUrl = URL.createObjectURL(
        await generateVoiceSpeech(ownerSubject, VOICE_PREVIEW_TEXT)
      );
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not play your voice preview."
      );
    } finally {
      setSpeaking(false);
    }
  }

  const voiceReady = profile?.provider_status === "ready";

  return (
    <section
      className="rounded-xl border bg-card p-5 shadow-sm sm:p-7"
      aria-labelledby="voice-preservation-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <AudioLines className="size-4" />
            Voice preservation
          </div>
          <h2
            id="voice-preservation-title"
            className="mt-2 text-xl font-semibold tracking-tight"
          >
            Keep a recording of your voice
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build a private library of speech exercises now, then explicitly
            choose when to send recordings to ElevenLabs to create a voice.
            These exercises can help track speech over time; they do not diagnose
            ALS or any other condition.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {profile
            ? `${profile.sample_count} sample${profile.sample_count === 1 ? "" : "s"}`
            : "No samples yet"}
        </span>
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Choose a speech exercise</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SPEECH_EXERCISES.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              aria-pressed={selectedExercise.id === exercise.id}
              onClick={() => setSelectedExerciseId(exercise.id)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                selectedExercise.id === exercise.id
                  ? "border-primary bg-primary/10"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="block font-medium">{exercise.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {exercise.instruction}
              </span>
            </button>
          ))}
        </div>
      </div>

      {profile ? (
        <p className="mt-5 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Consent recorded on {new Date(profile.consent_granted_at).toLocaleDateString()}.
          You can record additional exercises without consenting again.
        </p>
      ) : (
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="block font-medium">
              I consent to storing these recordings and sending them to ElevenLabs
              only when I choose Create my voice.
            </span>
            <span className="block text-xs leading-5 text-muted-foreground">
              This is required only once. You can delete saved recordings before
              creating a voice.
            </span>
          </span>
        </label>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void loadProfile()}
          disabled={saving || recording}
        >
          Refresh recordings
        </Button>
        {recording ? (
          <Button variant="destructive" onClick={stopRecording} disabled={saving}>
            <Square className="size-4" />
            Stop recording
          </Button>
        ) : (
          <Button onClick={() => void startRecording()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mic className="size-4" />
            )}
            Record exercise
          </Button>
        )}
        {profile?.provider_voice_id ? (
          <Button
            variant="outline"
            onClick={() => setConfirmingRebuild(true)}
            disabled={!profile.sample_count || cloning}
          >
            <RotateCcw className="size-4" />
            Rebuild my voice
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => void cloneVoice()}
            disabled={!profile?.sample_count || cloning}
          >
            {cloning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Create my voice
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => void speakPreview()}
          disabled={!voiceReady || speaking}
        >
          {speaking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Volume2 className="size-4" />
          )}
          Hear preview
        </Button>
      </div>

      {confirmingRebuild && profile && (
        <div
          className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          role="alertdialog"
          aria-labelledby="rebuild-voice-title"
        >
          <p id="rebuild-voice-title" className="text-sm font-semibold">
            Rebuild your voice from all {profile.sample_count} saved samples?
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This creates a new ElevenLabs clone from every recording currently
            saved here and replaces the active clone. It may use ElevenLabs
            credits.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmingRebuild(false)}
              disabled={cloning}
            >
              Cancel
            </Button>
            <Button onClick={() => void rebuildVoice()} disabled={cloning}>
              {cloning ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Rebuild from all samples
            </Button>
          </div>
        </div>
      )}

      {profile?.provider_status === "verification_required" && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          ElevenLabs requires verification before this voice can generate speech.
        </p>
      )}

      {latestRecordingUrl && (
        <div className="mt-5 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">Listen to your latest recording</p>
          <audio className="mt-3 w-full" controls src={latestRecordingUrl}>
            Your browser cannot play this recording.
          </audio>
        </div>
      )}

      {profile?.samples.length ? (
        <ul
          className="mt-6 divide-y rounded-xl border"
          aria-label="Saved voice recordings"
        >
          {profile.samples.map((sample) => (
            <li
              key={sample.id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {sample.phrase_hint || sample.original_filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil(sample.byte_size / 1024)} KB · saved {new Date(sample.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete recording"
                onClick={() => void removeSample(sample.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {message && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}

function supportedRecordingMimeType(): string | undefined {
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function recordingFilename(contentType: string): string {
  if (contentType.includes("ogg")) return "voice-sample.ogg";
  if (contentType.includes("mp4")) return "voice-sample.m4a";
  return "voice-sample.webm";
}
