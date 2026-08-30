"use client"

import * as React from "react"
import { PlayIcon, SquareIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import type { ToneSegment } from "@/modules/tone-preview"

interface TonePreviewControls {
  readonly activeId: string | null
  readonly error: "unsupported" | "playback" | null
  toggle(id: string, segments: readonly ToneSegment[]): Promise<void>
}

function TonePreviewButton({
  id,
  disabled,
  preview,
  createSegments,
}: {
  id: string
  disabled: boolean
  preview: TonePreviewControls
  createSegments(): readonly ToneSegment[]
}) {
  const t = useTranslations()
  const active = preview.activeId === id
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      disabled={disabled}
      aria-pressed={active}
      onClick={() => void preview.toggle(id, createSegments())}
    >
      {active ? (
        <SquareIcon data-icon="inline-start" aria-hidden="true" />
      ) : (
        <PlayIcon data-icon="inline-start" aria-hidden="true" />
      )}
      {t(active ? "signalPreviewStop" : "signalPreviewListen")}
    </Button>
  )
}

function useTonePreview(): TonePreviewControls {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<"unsupported" | "playback" | null>(
    null
  )
  const contextRef = React.useRef<AudioContext | null>(null)
  const oscillatorsRef = React.useRef<OscillatorNode[]>([])
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = React.useRef(0)

  const stop = React.useCallback(() => {
    generationRef.current += 1
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
    for (const oscillator of oscillatorsRef.current) {
      try {
        oscillator.stop()
      } catch {
        // The oscillator may already have reached its scheduled stop time.
      }
    }
    oscillatorsRef.current = []
    if (contextRef.current) void contextRef.current.close()
    contextRef.current = null
    setActiveId(null)
  }, [])

  React.useEffect(() => stop, [stop])

  const toggle = React.useCallback(
    async (id: string, segments: readonly ToneSegment[]) => {
      if (activeId === id) {
        stop()
        return
      }
      stop()
      setError(null)

      if (typeof AudioContext === "undefined") {
        setError("unsupported")
        return
      }

      const playable = segments.filter((segment) => segment.durationMs > 0)
      const totalDurationMs = playable.reduce(
        (total, segment) => total + segment.durationMs,
        0
      )
      if (totalDurationMs === 0) return

      const generation = generationRef.current
      const context = new AudioContext()
      contextRef.current = context

      try {
        await context.resume()
        if (generation !== generationRef.current) return

        const startAt = context.currentTime + 0.02
        let elapsedSeconds = 0
        const oscillators: OscillatorNode[] = []

        for (const segment of playable) {
          const segmentStart = startAt + elapsedSeconds
          const durationSeconds = segment.durationMs / 1000
          const segmentEnd = segmentStart + durationSeconds
          const rampSeconds = Math.min(0.008, durationSeconds / 3)

          for (const frequencyHz of segment.frequenciesHz) {
            const oscillator = context.createOscillator()
            const gain = context.createGain()
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(frequencyHz, segmentStart)
            gain.gain.setValueAtTime(0, segmentStart)
            gain.gain.linearRampToValueAtTime(
              0.1 / segment.frequenciesHz.length,
              segmentStart + rampSeconds
            )
            gain.gain.setValueAtTime(
              0.1 / segment.frequenciesHz.length,
              Math.max(segmentStart + rampSeconds, segmentEnd - rampSeconds)
            )
            gain.gain.linearRampToValueAtTime(0, segmentEnd)
            oscillator.connect(gain).connect(context.destination)
            oscillator.start(segmentStart)
            oscillator.stop(segmentEnd)
            oscillators.push(oscillator)
          }

          elapsedSeconds += durationSeconds
        }

        oscillatorsRef.current = oscillators
        setActiveId(id)
        timerRef.current = setTimeout(() => {
          if (generation !== generationRef.current) return
          oscillatorsRef.current = []
          contextRef.current = null
          void context.close()
          setActiveId(null)
          timerRef.current = null
        }, totalDurationMs + 80)
      } catch {
        if (generation === generationRef.current) {
          stop()
          setError("playback")
        }
      }
    },
    [activeId, stop]
  )

  return { activeId, error, toggle }
}

export { TonePreviewButton, useTonePreview }
export type { TonePreviewControls }
