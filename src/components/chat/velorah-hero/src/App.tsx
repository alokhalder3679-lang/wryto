/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { JourneyModal } from "./components/JourneyModal";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4";

export default function App() {
  const [modalMode, setModalMode] = useState<"signup" | "reading" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled gracefully in background
        });
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-background text-foreground">
      {/* Fullscreen Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_URL}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Glassmorphic Navigation */}
      <Navbar onSignUp={() => setModalMode("signup")} />

      {/* Vertically Centered Cinematic Hero */}
      <Hero onBeginJourney={() => setModalMode("reading")} />

      {/* Interactive Modal */}
      <JourneyModal
        isOpen={modalMode !== null}
        mode={modalMode ?? "signup"}
        onClose={() => setModalMode(null)}
        onSwitchToSignUp={() => setModalMode("signup")}
      />
    </div>
  );
}
