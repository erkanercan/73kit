"use client"

import * as React from "react"
import { Redo2Icon, Undo2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

import { useCpsWorkspace } from "@/components/cps-workspace-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function DocumentHistoryControls() {
  const { busy, canRedo, canUndo, redoWorkingCodeplug, undoWorkingCodeplug } =
    useCpsWorkspace()
  const t = useTranslations()
  const undoDisabled = busy || !canUndo
  const redoDisabled = busy || !canRedo

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        isEditingTarget(event.target) ||
        isInsideModal(event.target)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const modified = event.metaKey || event.ctrlKey
      const wantsUndo = modified && key === "z" && !event.shiftKey
      const wantsRedo =
        modified &&
        ((key === "z" && event.shiftKey) ||
          (event.ctrlKey && key === "y" && !event.shiftKey))

      if (wantsUndo && !busy && canUndo) {
        event.preventDefault()
        undoWorkingCodeplug()
      } else if (wantsRedo && !busy && canRedo) {
        event.preventDefault()
        redoWorkingCodeplug()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [busy, canRedo, canUndo, redoWorkingCodeplug, undoWorkingCodeplug])

  return (
    <div
      className="flex items-center gap-1"
      aria-label={t("historyControlsLabel")}
    >
      <HistoryButton
        label={t("undo")}
        unavailableLabel={t("undoUnavailable")}
        shortcut={t("undoShortcut")}
        disabled={undoDisabled}
        onClick={undoWorkingCodeplug}
        icon={Undo2Icon}
        ariaKeyShortcuts="Control+Z Meta+Z"
      />
      <HistoryButton
        label={t("redo")}
        unavailableLabel={t("redoUnavailable")}
        shortcut={t("redoShortcut")}
        disabled={redoDisabled}
        onClick={redoWorkingCodeplug}
        icon={Redo2Icon}
        ariaKeyShortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
      />
    </div>
  )
}

function HistoryButton({
  label,
  unavailableLabel,
  shortcut,
  disabled,
  onClick,
  icon: Icon,
  ariaKeyShortcuts,
}: {
  label: string
  unavailableLabel: string
  shortcut: string
  disabled: boolean
  onClick(): void
  icon: typeof Undo2Icon
  ariaKeyShortcuts: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex"
            tabIndex={disabled ? 0 : undefined}
            aria-label={disabled ? unavailableLabel : undefined}
          />
        }
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={label}
          aria-keyshortcuts={disabled ? undefined : ariaKeyShortcuts}
          onClick={onClick}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {disabled ? unavailableLabel : label} · {shortcut}
      </TooltipContent>
    </Tooltip>
  )
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    ) !== null
  )
}

function isInsideModal(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('[role="dialog"], [role="alertdialog"]') !== null
  )
}

export { DocumentHistoryControls }
