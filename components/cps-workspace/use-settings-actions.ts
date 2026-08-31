"use client"

import * as React from "react"

import {
  reconcileAprsSettingChanges,
  reconcileBluetoothSettingChanges,
  reconcileDisplaySettingChanges,
  reconcileDtmfSettingChanges,
  reconcileFiveToneSettingChanges,
  reconcileFmBroadcastChannelChanges,
  reconcileFmBroadcastSettingChanges,
  reconcileFunctionSettingChanges,
  reconcileGpsSettingChanges,
  reconcileKeyboardSettingChanges,
  reconcileMenuVisibilityChanges,
  reconcileSoundSettingChanges,
  reconcileSpectrumSettingChanges,
  reconcileTwoToneSettingChanges,
} from "@/modules/cps-workspace/change-set"
import type { DocumentHistoryAction } from "@/modules/cps-workspace/document-history"
import type {
  AprsSettingsPatch,
  BluetoothSettingsPatch,
  DisplaySettingsPatch,
  DtmfSettingsPatch,
  FiveToneSettingsPatch,
  FmBroadcastChannelPatch,
  FmBroadcastSettingsPatch,
  FunctionSettingsPatch,
  GpsSettingsPatch,
  KeyboardSettingsPatch,
  MenuVisibilityItemId,
  SoundSettingsPatch,
  SpectrumSettingsPatch,
  TwoToneSettingsPatch,
} from "@/modules/codeplug/index"

function useSettingsActions(
  setDocumentState: React.Dispatch<DocumentHistoryAction>
) {
  const editFunctionSettings = React.useCallback(
    (patch: FunctionSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FunctionSettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFunctionSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFunctionSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editDisplaySettings = React.useCallback(
    (patch: DisplaySettingsPatch) => {
      const fields = Object.keys(patch) as (keyof DisplaySettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editDisplaySettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileDisplaySettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editSoundSettings = React.useCallback(
    (patch: SoundSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof SoundSettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editSoundSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSoundSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editKeyboardSettings = React.useCallback(
    (patch: KeyboardSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof KeyboardSettingsPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editKeyboardSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileKeyboardSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editAprsSettings = React.useCallback(
    (patch: AprsSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof AprsSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editAprsSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileAprsSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editGpsSettings = React.useCallback(
    (patch: GpsSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof GpsSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editGpsSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileGpsSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editBluetoothSettings = React.useCallback(
    (patch: BluetoothSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof BluetoothSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBluetoothSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBluetoothSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editSpectrumSettings = React.useCallback(
    (patch: SpectrumSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof SpectrumSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editSpectrumSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpectrumSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editDtmfSettings = React.useCallback(
    (patch: DtmfSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof DtmfSettingsPatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editDtmfSettings(patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileDtmfSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editTwoToneSettings = React.useCallback(
    (patch: TwoToneSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof TwoToneSettingsPatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editTwoToneSettings(patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileTwoToneSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editFiveToneSettings = React.useCallback(
    (patch: FiveToneSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FiveToneSettingsPatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFiveToneSettings(patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFiveToneSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editFmBroadcastChannel = React.useCallback(
    (number: number, patch: FmBroadcastChannelPatch) => {
      const fields = Object.keys(patch) as (keyof FmBroadcastChannelPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFmBroadcastChannel(
            number,
            patch
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFmBroadcastChannelChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            number,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editFmBroadcastSettings = React.useCallback(
    (patch: FmBroadcastSettingsPatch) => {
      const fields = Object.keys(patch) as (keyof FmBroadcastSettingsPatch)[]
      if (fields.length === 0) return

      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editFmBroadcastSettings(patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileFmBroadcastSettingChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            fields
          ),
        })
      })
    },
    [setDocumentState]
  )

  const setMenuVisibility = React.useCallback(
    (id: MenuVisibilityItemId, visible: boolean) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.setMenuVisibility(id, visible)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileMenuVisibilityChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug
          ),
        })
      })
    },
    [setDocumentState]
  )

  return {
    editAprsSettings,
    editBluetoothSettings,
    editDisplaySettings,
    editDtmfSettings,
    editFiveToneSettings,
    editFmBroadcastChannel,
    editFmBroadcastSettings,
    editFunctionSettings,
    editGpsSettings,
    editKeyboardSettings,
    editSoundSettings,
    editSpectrumSettings,
    editTwoToneSettings,
    setMenuVisibility,
  }
}

export { useSettingsActions }
