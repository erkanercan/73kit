"use client"

import * as React from "react"

import {
  reconcileBandScanListSelectionChange,
  reconcileBandZoneSelectionChange,
  reconcileScanListEditChanges,
  reconcileSpecialChannelEditChanges,
  reconcileVfoScanEdgeChanges,
  reconcileVfoScanEdgeSelectionChange,
  reconcileZoneEditChanges,
} from "@/modules/cps-workspace/change-set"
import type { DocumentHistoryAction } from "@/modules/cps-workspace/document-history"
import { resolveChannelFrequencyPatch } from "@/modules/codeplug/index"
import type {
  CallChannelPatch,
  ChannelCollectionPatch,
  RadioBand,
  VfoChannelPatch,
  VfoScanEdgePatch,
} from "@/modules/codeplug/index"

function useCollectionActions(
  setDocumentState: React.Dispatch<DocumentHistoryAction>
) {
  const editVfoChannel = React.useCallback(
    (slot: "A" | "B", patch: VfoChannelPatch) => {
      if (Object.keys(patch).length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const currentCodeplug = completedRead.workingCodeplug.codeplug
        const channel = currentCodeplug
          .getVfoChannels()
          .find((candidate) => candidate.slot === slot)
        if (!channel) {
          return current
        }
        const resolvedPatch = resolveChannelFrequencyPatch(channel, patch)
        const fields = Object.keys(resolvedPatch) as (keyof VfoChannelPatch)[]
        const nextCodeplug = currentCodeplug.editVfoChannel(slot, resolvedPatch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpecialChannelEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            { kind: "vfo", slot, fields }
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editCallChannel = React.useCallback(
    (slot: 1 | 2, patch: CallChannelPatch) => {
      if (Object.keys(patch).length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const currentCodeplug = completedRead.workingCodeplug.codeplug
        const channel = currentCodeplug
          .getCallChannels()
          .find((candidate) => candidate.slot === slot)
        if (!channel) {
          return current
        }
        const resolvedPatch = resolveChannelFrequencyPatch(channel, patch)
        const fields = Object.keys(resolvedPatch) as (keyof CallChannelPatch)[]
        const nextCodeplug = currentCodeplug.editCallChannel(
          slot,
          resolvedPatch
        )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileSpecialChannelEditChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            { kind: "call", slot, fields }
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editZone = React.useCallback(
    (number: number, patch: ChannelCollectionPatch) => {
      const fields = Object.keys(patch) as (keyof ChannelCollectionPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug = completedRead.workingCodeplug.codeplug.editZone(
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
          changes: reconcileZoneEditChanges(
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

  const editScanList = React.useCallback(
    (number: number, patch: ChannelCollectionPatch) => {
      const fields = Object.keys(patch) as (keyof ChannelCollectionPatch)[]
      if (fields.length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editScanList(number, patch)

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileScanListEditChanges(
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

  const editBandZoneSelection = React.useCallback(
    (band: RadioBand, zoneNumbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBandZoneSelection(
            band,
            zoneNumbers
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBandZoneSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editBandScanListSelection = React.useCallback(
    (band: RadioBand, scanListNumbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editBandScanListSelection(
            band,
            scanListNumbers
          )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileBandScanListSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    [setDocumentState]
  )

  const editVfoScanEdge = React.useCallback(
    (number: number, patch: VfoScanEdgePatch) => {
      const fields = Object.keys(patch) as (keyof VfoScanEdgePatch)[]
      if (fields.length === 0) return
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editVfoScanEdge(number, patch)
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileVfoScanEdgeChanges(
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

  const editVfoScanEdgeSelection = React.useCallback(
    (band: RadioBand, numbers: readonly number[]) => {
      setDocumentState((current) => {
        if (!current.completedRead) return current
        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editVfoScanEdgeSelection(
            band,
            numbers
          )
        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: nextCodeplug,
            }),
          }),
          changes: reconcileVfoScanEdgeSelectionChange(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug,
            band
          ),
        })
      })
    },
    [setDocumentState]
  )

  return {
    editBandScanListSelection,
    editBandZoneSelection,
    editCallChannel,
    editScanList,
    editVfoChannel,
    editVfoScanEdge,
    editVfoScanEdgeSelection,
    editZone,
  }
}

export { useCollectionActions }
