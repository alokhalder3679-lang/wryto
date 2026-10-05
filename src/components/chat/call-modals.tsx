// ─── Call Modal (Audio + Video) ───────────────────────────────
import { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat, formatCallTime } from "@/lib/chat-context";
import { Button } from "@/components/ui/button";

// ── Shared round action button ────────────────────────────────
function CallBtn({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "end" | "accept" | "muted";
  active?: boolean;
}) {
  const base = "flex flex-col items-center gap-1.5";
  const btn = cn(
    "size-14 rounded-full flex items-center justify-center transition-all active:scale-95",
    variant === "end" && "bg-red-500 hover:bg-red-600 text-white",
    variant === "accept" && "bg-emerald-500 hover:bg-emerald-600 text-white",
    variant === "muted" &&
      (active ? "bg-foreground text-background" : "bg-muted/80 text-foreground hover:bg-muted"),
    variant === "default" && "bg-muted/80 text-foreground hover:bg-muted",
  );
  return (
    <div className={base}>
      <button className={btn} onClick={onClick} aria-label={label}>
        <Icon className="size-6" />
      </button>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ── Outgoing / ringing overlay ────────────────────────────────
function OutgoingCall() {
  const { call, endCall } = useChat();
  if (call.phase !== "outgoing") return null;
  return (
    <CallOverlay>
      <div className="relative size-24 rounded-full bg-primary/20 ring-4 ring-primary/30">
        <Initials name={call.peerName} />
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
      </div>
      <p className="mt-5 text-xl font-bold">{call.peerName}</p>
      <p className="mt-1 text-sm text-muted-foreground animate-pulse">
        {call.kind === "video" ? "Video call" : "Audio call"} • Calling…
      </p>
      <div className="mt-12 flex gap-8">
        <CallBtn icon={PhoneOff} label="Cancel" onClick={endCall} variant="end" />
      </div>
    </CallOverlay>
  );
}

// ── Incoming call overlay ─────────────────────────────────────
function IncomingCall() {
  const { call, acceptCall, rejectCall } = useChat();
  if (call.phase !== "incoming") return null;
  return (
    <CallOverlay>
      <div className="relative size-24 rounded-full bg-primary/20 ring-4 ring-primary/30">
        <Initials name={call.peerName} />
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
      </div>
      <p className="mt-5 text-xl font-bold">{call.peerName}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Incoming {call.kind === "video" ? "video" : "audio"} call…
      </p>
      <div className="mt-12 flex gap-12">
        <CallBtn icon={PhoneOff} label="Decline" onClick={rejectCall} variant="end" />
        <CallBtn icon={Phone} label="Accept" onClick={acceptCall} variant="accept" />
      </div>
    </CallOverlay>
  );
}

// ── Active audio call ─────────────────────────────────────────
function ActiveAudioCall() {
  const { call, endCall, toggleMute, toggleSpeaker } = useChat();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (call.phase === "active" && call.remoteStream && audioRef.current) {
      audioRef.current.srcObject = call.remoteStream;
    }
  }, [call]);

  if (call.phase !== "active" || call.kind !== "audio") return null;
  return (
    <CallOverlay>
      {/* Remote audio stream */}
      <audio ref={audioRef} autoPlay playsInline />
      <div className="size-24 rounded-full bg-primary/20 ring-4 ring-primary/30">
        <Initials name={call.peerName} />
      </div>
      <p className="mt-5 text-xl font-bold">{call.peerName}</p>
      <p className="mt-1 font-mono text-sm text-emerald-500">{formatCallTime(call.elapsed)}</p>
      <div className="mt-12 flex gap-6">
        <CallBtn
          icon={call.muted ? MicOff : Mic}
          label={call.muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          variant="muted"
          active={call.muted}
        />
        <CallBtn icon={PhoneOff} label="End" onClick={endCall} variant="end" />
        <CallBtn
          icon={call.speakerOff ? VolumeX : Volume2}
          label={call.speakerOff ? "Speaker" : "Speaker"}
          onClick={toggleSpeaker}
          variant="muted"
          active={call.speakerOff}
        />
      </div>
    </CallOverlay>
  );
}

// ── Active video call ─────────────────────────────────────────
function ActiveVideoCall() {
  const { call, endCall, toggleMute, toggleCam, toggleSpeaker } = useChat();
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (call.phase === "active") {
      if (call.remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = call.remoteStream;
      }
      if (call.localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = call.localStream;
      }
    }
  }, [call]);

  if (call.phase !== "active" || call.kind !== "video") return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">
      {/* Remote video */}
      <div className="relative flex-1 flex items-center justify-center bg-zinc-800 overflow-hidden">
        {call.remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="size-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="mx-auto size-28 rounded-full bg-primary/20 ring-4 ring-primary/30 flex items-center justify-center text-3xl font-bold text-primary">
              {call.peerName
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <p className="mt-4 text-lg font-semibold text-white">{call.peerName}</p>
            <p className="mt-1 font-mono text-sm text-emerald-400">
              {formatCallTime(call.elapsed)}
            </p>
          </div>
        )}

        {/* Local video PiP */}
        <div
          className={cn(
            "absolute bottom-4 right-4 size-28 sm:size-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-zinc-700 flex items-center justify-center transition-all z-10",
            call.camOff && "bg-zinc-900",
          )}
        >
          {call.camOff || !call.localStream ? (
            <VideoOff className="size-8 text-muted-foreground" />
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover -scale-x-100"
            />
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-6 bg-zinc-900 py-6 px-4">
        <CallBtn
          icon={call.muted ? MicOff : Mic}
          label={call.muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          variant="muted"
          active={call.muted}
        />
        <CallBtn
          icon={call.camOff ? VideoOff : Video}
          label={call.camOff ? "Cam on" : "Cam off"}
          onClick={toggleCam}
          variant="muted"
          active={call.camOff}
        />
        <CallBtn icon={PhoneOff} label="End call" onClick={endCall} variant="end" />
        <CallBtn
          icon={call.speakerOff ? VolumeX : Volume2}
          label="Speaker"
          onClick={toggleSpeaker}
          variant="muted"
          active={call.speakerOff}
        />
      </div>
    </div>
  );
}

// ── Shared overlay wrapper ─────────────────────────────────────
function CallOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
      {children}
    </div>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <span className="flex size-full items-center justify-center rounded-full text-2xl font-bold text-primary">
      {name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}

// ── Master export (renders whichever modal is active) ─────────
export function CallModals() {
  return (
    <>
      <OutgoingCall />
      <IncomingCall />
      <ActiveAudioCall />
      <ActiveVideoCall />
    </>
  );
}

// ── In-chat call buttons ──────────────────────────────────────
export function ChatCallButtons({ peerName, peerId }: { peerName: string; peerId: string }) {
  const { startCall } = useChat();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => startCall(peerId, peerName, "audio")}
        aria-label="Audio call"
      >
        <Phone className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => startCall(peerId, peerName, "video")}
        aria-label="Video call"
      >
        <Video className="size-4" />
      </Button>
    </div>
  );
}
