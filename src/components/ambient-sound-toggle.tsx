import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Headphones, Play, Pause, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type SoundMode = "rain" | "hearth" | "wind" | "night";

interface SoundPreset {
  id: SoundMode;
  name: string;
  emoji: string;
  description: string;
}

const PRESETS: SoundPreset[] = [
  { id: "rain", name: "Gentle Rain", emoji: "🌧️", description: "Soft drizzle on window glass" },
  { id: "hearth", name: "Warm Hearth", emoji: "🪵", description: "Quiet crackle of fireplace" },
  { id: "wind", name: "Autumn Wind", emoji: "🍃", description: "Slow atmospheric breeze" },
  { id: "night", name: "Night Sanctuary", emoji: "✨", description: "Subtle nocturnal ambiance" },
];

export function AmbientSoundToggle({ className }: { className?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<SoundMode>("rain");
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.35;
    try {
      const v = localStorage.getItem("wryto-ambient-volume");
      return v ? parseFloat(v) : 0.35;
    } catch {
      return 0.35;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const generatorNodesRef = useRef<{ stop: () => void } | null>(null);

  // Initialize or resume AudioContext
  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  // Update volume
  function handleVolumeChange(vals: number[]) {
    const val = vals[0] ?? 0.35;
    setVolume(val);
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(val, audioCtxRef.current?.currentTime || 0, 0.05);
    }
    try {
      localStorage.setItem("wryto-ambient-volume", String(val));
    } catch {
      // ignore
    }
  }

  // Stop active procedural sound
  function stopCurrentSound() {
    if (generatorNodesRef.current) {
      try {
        generatorNodesRef.current.stop();
      } catch {
        // ignore
      }
      generatorNodesRef.current = null;
    }
  }

  // Start procedural audio generator based on selected preset
  function startSound(selectedMode: SoundMode) {
    stopCurrentSound();
    const ctx = getAudioContext();

    if (!masterGainRef.current) {
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(volume, ctx.currentTime);
      mg.connect(ctx.destination);
      masterGainRef.current = mg;
    }

    const master = masterGainRef.current;

    // Buffer size for noise generation (2 seconds looped buffer)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate pink noise base
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    if (selectedMode === "rain") {
      // Gentle rain: lowpass filter at 1100Hz with slight resonance
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(950, ctx.currentTime);

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(200, ctx.currentTime);

      noiseSource.connect(highpass);
      highpass.connect(filter);
      filter.connect(master);
      noiseSource.start();

      generatorNodesRef.current = {
        stop: () => {
          try {
            noiseSource.stop();
            noiseSource.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else if (selectedMode === "hearth") {
      // Warm fireplace: warm low rumble (lowpass at 420Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(master);
      noiseSource.start();

      generatorNodesRef.current = {
        stop: () => {
          try {
            noiseSource.stop();
            noiseSource.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else if (selectedMode === "wind") {
      // Autumn wind: bandpass with oscillating center frequency
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(2.5, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noiseSource.connect(filter);
      filter.connect(master);
      noiseSource.start();
      lfo.start();

      generatorNodesRef.current = {
        stop: () => {
          try {
            noiseSource.stop();
            lfo.stop();
            noiseSource.disconnect();
            lfo.disconnect();
          } catch {
            // ignore
          }
        },
      };
    } else {
      // Night sanctuary: very soft highpass and lowpass
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(750, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(master);
      noiseSource.start();

      generatorNodesRef.current = {
        stop: () => {
          try {
            noiseSource.stop();
            noiseSource.disconnect();
          } catch {
            // ignore
          }
        },
      };
    }
  }

  function handleTogglePlay() {
    if (isPlaying) {
      stopCurrentSound();
      setIsPlaying(false);
    } else {
      startSound(mode);
      setIsPlaying(true);
    }
  }

  function handleSelectMode(nextMode: SoundMode) {
    setMode(nextMode);
    if (isPlaying) {
      startSound(nextMode);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentSound();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const activePreset = PRESETS.find((p) => p.id === mode) ?? PRESETS[0];

  return (
    <DropdownMenu>
      <div className={cn("inline-flex items-center gap-1", className)}>
        {/* Play/Pause Button with Animated Waves */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={cn(
            "h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all spring-press cursor-pointer border",
            isPlaying
              ? "bg-primary/15 text-primary border-primary/30 font-semibold"
              : "bg-muted/50 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground",
          )}
          title={isPlaying ? `Pause soundscape (${activePreset.name})` : "Start ambient soundscape for focus"}
          aria-label={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
        >
          {isPlaying ? (
            <>
              {/* Animated audio equalizer bars */}
              <div className="flex items-center gap-0.5 h-3.5" aria-hidden="true">
                <span className="w-0.5 h-2.5 bg-primary rounded-full animate-pulse" />
                <span className="w-0.5 h-3.5 bg-primary rounded-full animate-pulse delay-75" />
                <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse delay-150" />
              </div>
              <span className="truncate max-w-[80px] sm:max-w-none">{activePreset.name}</span>
            </>
          ) : (
            <>
              <Headphones className="size-3.5" />
              <span className="hidden sm:inline">Soundscape</span>
            </>
          )}
        </button>

        {/* Dropdown Options Trigger */}
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="size-8 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors spring-press cursor-pointer"
            aria-label="Soundscape settings"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 liquid-glass shadow-xl">
        <DropdownMenuLabel className="flex items-center justify-between text-xs px-2 py-1 font-semibold text-foreground">
          <span>Writing Ambiance</span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-primary">Web Audio</span>
        </DropdownMenuLabel>

        {/* Volume Slider */}
        <div className="px-2 py-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {volume === 0 ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />} Volume
            </span>
            <span className="tabular-numbers font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="cursor-pointer"
            aria-label="Ambient volume"
          />
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/50" />

        {/* Preset Modes */}
        <div className="space-y-1">
          {PRESETS.map((p) => {
            const isSelected = mode === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectMode(p.id)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{p.emoji}</span>
                  <div>
                    <p className="leading-tight">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground/80 font-normal">{p.description}</p>
                  </div>
                </div>
                {isSelected && isPlaying && (
                  <span className="flex size-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
