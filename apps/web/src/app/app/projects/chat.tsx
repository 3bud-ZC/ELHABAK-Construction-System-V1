"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { EmptyState, LoadingState } from "@elhabak/ui";
import { ArrowDown, ArrowUp, Mic, Pause, Play, Send, Square, Trash2 } from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  apiRequest,
  formatVoiceDuration,
  roleLabel,
  voiceNoteUrl,
  type ChatHistoryResponse,
  type ChatMessageRecord,
  type ProjectRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { getSocket, joinProjectRoom, leaveProjectRoom } from "../../../lib/socket";

type ChatWorkspaceProps = { projectId: string };

type RecordingState = "idle" | "requesting" | "recording" | "preview" | "unsupported";

const MAX_RECORDING_SECONDS = 180;
const MAX_MESSAGE_LENGTH = 2000;

export function ChatWorkspace({ projectId }: ChatWorkspaceProps) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const user = useCurrentUser();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewIndicator, setShowNewIndicator] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>("audio/webm");

  const listRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const labels = useMemo(
    () =>
      ar
        ? {
          loading: "جاري تحميل الدردشة...",
          empty: "لا توجد رسائل بعد",
          emptyHint: "ابدأ المحادثة الخاصة بهذا المشروع.",
          placeholder: "اكتب رسالة...",
          send: "إرسال",
          loadOlder: "تحميل رسائل أقدم",
          newMessages: "رسائل جديدة",
          recordStart: "تسجيل رسالة صوتية",
          recordStop: "إيقاف التسجيل",
          discard: "حذف",
          sendVoice: "إرسال الرسالة الصوتية",
          micDenied: "تم رفض إذن الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.",
          micUnsupported: "التسجيل الصوتي غير مدعوم في هذا المتصفح.",
          recordFailed: "تعذر بدء التسجيل. حاول مرة أخرى.",
          uploadFailed: "تعذر إرسال الرسالة. حاول مرة أخرى.",
          emptyMessage: "لا يمكن إرسال رسالة فارغة.",
          tooLong: `الحد الأقصى ${MAX_MESSAGE_LENGTH} حرفاً.`,
          you: "أنت"
        }
        : {
          loading: "Loading chat...",
          empty: "No messages yet",
          emptyHint: "Start the conversation for this project.",
          placeholder: "Type a message...",
          send: "Send",
          loadOlder: "Load older messages",
          newMessages: "New messages",
          recordStart: "Record a voice note",
          recordStop: "Stop recording",
          discard: "Discard",
          sendVoice: "Send voice note",
          micDenied: "Microphone permission was denied. Allow access in your browser settings.",
          micUnsupported: "Voice recording is not supported in this browser.",
          recordFailed: "Could not start recording. Please try again.",
          uploadFailed: "Could not send the message. Please try again.",
          emptyMessage: "An empty message cannot be sent.",
          tooLong: `Maximum ${MAX_MESSAGE_LENGTH} characters.`,
          you: "You"
        },
    [ar]
  );

  const scrollToBottom = useCallback((smooth = false) => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    isNearBottomRef.current = true;
    setShowNewIndicator(false);
  }, []);

  const markRead = useCallback(() => {
    apiRequest(`/projects/${projectId}/messages/read`, { method: "POST", body: "{}" }).catch(() => undefined);
  }, [projectId]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, history] = await Promise.all([
        apiRequest<ProjectRecord>(`/projects/${projectId}`),
        apiRequest<ChatHistoryResponse>(`/projects/${projectId}/messages?limit=30`)
      ]);
      setProject(projectData);
      setMessages(history.messages);
      setNextCursor(history.nextCursor);
      setError("");
      requestAnimationFrame(() => scrollToBottom(false));
      markRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project chat.");
    } finally {
      setLoading(false);
    }
  }, [projectId, scrollToBottom, markRead]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // Realtime: join the authorized project room, append persisted messages as they arrive,
  // and resync from REST on reconnect so a missed event is never the only source of truth.
  useEffect(() => {
    const socket = getSocket();
    joinProjectRoom(projectId);

    function onMessage(payload: { message: ChatMessageRecord }) {
      if (payload.message.projectId !== projectId) return;
      setMessages((prev) => (prev.some((item) => item.id === payload.message.id) ? prev : [...prev, payload.message]));
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(true));
        markRead();
      } else {
        setShowNewIndicator(true);
      }
    }

    function onConnect() {
      joinProjectRoom(projectId);
      void loadInitial();
    }

    socket.on("chat:message", onMessage);
    socket.on("connect", onConnect);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("connect", onConnect);
      leaveProjectRoom(projectId);
    };
  }, [projectId]);

  function handleScroll() {
    const node = listRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    isNearBottomRef.current = distance < 120;
    if (isNearBottomRef.current) setShowNewIndicator(false);
  }

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const node = listRef.current;
    const previousHeight = node?.scrollHeight ?? 0;
    try {
      const history = await apiRequest<ChatHistoryResponse>(
        `/projects/${projectId}/messages?limit=30&cursor=${encodeURIComponent(nextCursor)}`
      );
      setMessages((prev) => [...history.messages, ...prev]);
      setNextCursor(history.nextCursor);
      requestAnimationFrame(() => {
        if (node) node.scrollTop = node.scrollHeight - previousHeight;
      });
    } catch {
      // Silent: the load-older control simply stays available for a retry.
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed) {
      setSendError(labels.emptyMessage);
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setSendError(labels.tooLong);
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const message = await apiRequest<ChatMessageRecord>(`/projects/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify({ type: "TEXT", text: trimmed })
      });
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
      setText("");
      requestAnimationFrame(() => scrollToBottom(true));
      markRead();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : labels.uploadFailed);
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendText();
    }
  }

  async function startRecording() {
    setSendError("");
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingState("unsupported");
      setSendError(labels.micUnsupported);
      return;
    }
    setRecordingState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        setRecordingState("unsupported");
        setSendError(labels.micUnsupported);
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recordedBlobRef.current = blob;
        setPreviewMimeType(mimeType);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecordingState("preview");
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      setRecordingState("idle");
      setSendError(labels.micDenied);
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    recordedBlobRef.current = null;
    setPreviewUrl(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
  }

  async function sendVoice() {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    setSending(true);
    setSendError("");
    try {
      const extension = previewMimeType.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("type", "VOICE");
      formData.append("durationSeconds", String(Math.max(1, recordingSeconds)));
      formData.append("file", blob, `voice-note.${extension}`);
      const message = await apiRequest<ChatMessageRecord>(`/projects/${projectId}/messages`, {
        method: "POST",
        body: formData
      });
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
      discardRecording();
      requestAnimationFrame(() => scrollToBottom(true));
      markRead();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : labels.uploadFailed);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(ar ? "ar-EG-u-nu-latn" : "en-US", { day: "numeric", month: "long", year: "numeric" }),
    [ar]
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(ar ? "ar-EG-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit" }),
    [ar]
  );

  if (loading) {
    return (
      <section className="app-page">
        <LoadingState label={labels.loading} />
      </section>
    );
  }

  if (!project) {
    return (
      <section className="app-page">
        <EmptyState title={error || labels.empty} description="" />
      </section>
    );
  }

  return (
    <section className="app-page project-workspace-page chat-page">
      <ProjectWorkspace project={project} locale={locale} role={user.role} active="chat" />
      {error && <div className="form-error">{error}</div>}

      <div className="chat-shell">
        <div className="chat-context-bar">
          <div className="chat-context-bar__info">
            <strong>{project.name}</strong>
            <span className="chat-context-bar__code mono">{project.code ?? "—"}</span>
          </div>
          <span className="chat-context-bar__tag">{ar ? "قناة اتصال المشروع" : "PROJECT COMMUNICATION CHANNEL"}</span>
        </div>
        <div className="chat-message-list" ref={listRef} onScroll={handleScroll}>
          {nextCursor && (
            <button type="button" className="chat-load-older" onClick={() => void loadOlder()} disabled={loadingOlder}>
              <ArrowUp size={14} /> {labels.loadOlder}
            </button>
          )}

          {messages.length === 0 && <EmptyState title={labels.empty} description={labels.emptyHint} />}

          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDateSeparator = !previous || !isSameDay(previous.createdAt, message.createdAt);
            const isOwn = message.author.id === user.id;
            return (
              <div key={message.id}>
                {showDateSeparator && <div className="chat-date-separator">{dateFormatter.format(new Date(message.createdAt))}</div>}
                <div className={`chat-bubble-row${isOwn ? " chat-bubble-row--own" : ""}`}>
                  <div className={`chat-bubble${isOwn ? " chat-bubble--own" : ""}`}>
                    <div className="chat-bubble__meta">
                      <strong>{isOwn ? labels.you : message.author.displayName}</strong>
                      <span className="chat-bubble__role">{roleLabel(message.author.role, locale)}</span>
                      <span className="chat-bubble__time mono">{timeFormatter.format(new Date(message.createdAt))}</span>
                    </div>
                    {message.type === "TEXT" ? (
                      <p className="chat-bubble__text">{message.text}</p>
                    ) : (
                      <VoiceBubble
                        message={message}
                        projectId={projectId}
                        activeId={playingVoiceId}
                        onActivate={() => setPlayingVoiceId(message.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showNewIndicator && (
          <button type="button" className="chat-new-indicator" onClick={() => scrollToBottom(true)}>
            <ArrowDown size={14} /> {labels.newMessages}
          </button>
        )}

        <div className="chat-composer">
          {sendError && <div className="form-error chat-composer__error">{sendError}</div>}

          {recordingState === "recording" && (
            <div className="chat-recorder">
              <span className="chat-recorder__dot" aria-hidden="true" />
              <span className="mono">{formatVoiceDuration(recordingSeconds)}</span>
              <button type="button" className="ui-button ui-button--danger ui-button--sm" onClick={stopRecording}>
                <Square size={14} /> {labels.recordStop}
              </button>
            </div>
          )}

          {recordingState === "preview" && previewUrl && (
            <div className="chat-recorder chat-recorder--preview">
              <audio src={previewUrl} controls className="chat-recorder__preview-audio" />
              <button type="button" className="ui-button ui-button--secondary ui-button--sm" onClick={discardRecording} disabled={sending}>
                <Trash2 size={14} /> {labels.discard}
              </button>
              <button type="button" className="ui-button ui-button--primary ui-button--sm" onClick={() => void sendVoice()} disabled={sending}>
                <Send size={14} /> {labels.sendVoice}
              </button>
            </div>
          )}

          {(recordingState === "idle" || recordingState === "requesting" || recordingState === "unsupported") && (
            <div className="chat-composer__row">
              <textarea
                className="chat-composer__input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder={labels.placeholder}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={sending}
              />
              <button
                type="button"
                className="chat-composer__mic"
                onClick={() => void startRecording()}
                disabled={sending || recordingState === "requesting"}
                aria-label={labels.recordStart}
                title={labels.recordStart}
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                className="ui-button ui-button--primary chat-composer__send"
                onClick={() => void sendText()}
                disabled={sending || text.trim().length === 0}
              >
                <Send size={16} /> {labels.send}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VoiceBubble({
  message,
  projectId,
  activeId,
  onActivate
}: {
  message: ChatMessageRecord;
  projectId: string;
  activeId: string | null;
  onActivate: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = message.voice?.durationSeconds ?? 0;

  useEffect(() => {
    if (activeId !== message.id && playing) {
      audioRef.current?.pause();
    }
  }, [activeId, message.id, playing]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      onActivate();
      void audio.play();
    }
  }

  function seek(event: MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * audio.duration;
  }

  return (
    <div className="voice-message">
      <button type="button" className="voice-message__toggle" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="voice-message__track" onClick={seek}>
        <div className="voice-message__track-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="voice-message__duration mono">{formatVoiceDuration(playing || currentTime > 0 ? currentTime : duration)}</span>
      <audio
        ref={audioRef}
        src={voiceNoteUrl(projectId, message.id)}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setCurrentTime(audio.currentTime);
          if (audio.duration) setProgress(audio.currentTime / audio.duration);
        }}
      />
    </div>
  );
}

function pickSupportedMimeType(): string | null {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

function isSameDay(a: string, b: string) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}
