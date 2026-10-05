// =============================================================================
// WebRTC Service & Signaling Helper for Audio & Video Calling
// Handles local/remote MediaStream, STUN negotiation, and offer/answer/ICE exchange
// =============================================================================

export type WebRTCSignal =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit }
  | { type: "end" };

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onSignalCallback: ((signal: WebRTCSignal) => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    onSignal?: (signal: WebRTCSignal) => void,
    onRemoteStream?: (stream: MediaStream) => void,
  ) {
    if (onSignal) this.onSignalCallback = onSignal;
    if (onRemoteStream) this.onRemoteStreamCallback = onRemoteStream;
  }

  setSignalCallback(cb: (signal: WebRTCSignal) => void) {
    this.onSignalCallback = cb;
  }

  setRemoteStreamCallback(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = cb;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  async setupMedia(kind: "audio" | "video"): Promise<MediaStream | null> {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        console.warn("getUserMedia not supported in this environment");
        return null;
      }
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: kind === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.warn("Failed to get local media stream:", err);
      return null;
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    if (this.pc) return this.pc;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();

    // Attach local tracks if available
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(event.track);
      }
      if (this.remoteStream && this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Forward ICE candidates to peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onSignalCallback) {
        this.onSignalCallback({
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc = pc;
    return pc;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.createPeerConnection();
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      if (this.onSignalCallback) {
        this.onSignalCallback({ type: "offer", sdp: offer });
      }
      return offer;
    } catch (err) {
      console.error("Error creating WebRTC offer:", err);
      return null;
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.createPeerConnection();
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush any queued ICE candidates
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift();
        if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (this.onSignalCallback) {
        this.onSignalCallback({ type: "answer", sdp: answer });
      }
      return answer;
    } catch (err) {
      console.error("Error handling WebRTC offer:", err);
      return null;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush any queued ICE candidates
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift();
        if (candidate) await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Error setting remote description from answer:", err);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding received ICE candidate:", err);
    }
  }

  toggleMute(isMuted: boolean): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }

  toggleCamera(isCamOff: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = !isCamOff;
    });
  }

  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
  }
}
