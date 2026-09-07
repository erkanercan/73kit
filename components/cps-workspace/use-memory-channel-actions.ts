"use client"

import * as React from "react"

import {
  reconcileChannelMembershipChanges,
  reconcileMemoryChannelEditChanges,
  reconcileMemoryChannelStructureChange,
} from "@/modules/cps-workspace/change-set"
import type { DocumentHistoryAction } from "@/modules/cps-workspace/document-history"
import { resolveChannelFrequencyPatch } from "@/modules/codeplug/index"
import type {
  ChannelMembershipPatch,
  MemoryChannelPatch,
} from "@/modules/codeplug/index"

function useMemoryChannelActions(
  setDocumentState: React.Dispatch<DocumentHistoryAction>
) {
  const moveMemoryChannel = React.useCallback(
    (fromNumber: number, toNumber: number) => {
      if (fromNumber === toNumber) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const workingCodeplug = Object.freeze({
          ...completedRead.workingCodeplug,
          codeplug: completedRead.workingCodeplug.codeplug.moveMemoryChannel(
            fromNumber,
            toNumber
          ),
        })
        const changes = workingCodeplug.codeplug.equals(
          completedRead.baselineBackup.codeplug
        )
          ? []
          : [
              ...current.changes,
              Object.freeze({
                kind: "move-memory-channel" as const,
                fromNumber,
                toNumber,
              }),
            ]

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug,
          }),
          changes,
        })
      })
    },
    [setDocumentState]
  )

  const editMemoryChannel = React.useCallback(
    (number: number, patch: MemoryChannelPatch) => {
      if (Object.keys(patch).length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const currentCodeplug = completedRead.workingCodeplug.codeplug
        const channel = currentCodeplug.getChannels()[number - 1]
        if (!channel) {
          return current
        }
        const resolvedPatch = resolveChannelFrequencyPatch(channel, patch)
        const fields = Object.keys(
          resolvedPatch
        ) as (keyof MemoryChannelPatch)[]
        const nextCodeplug = currentCodeplug.editMemoryChannel(
          number,
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
          changes: reconcileMemoryChannelEditChanges(
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

  const editChannelMemberships = React.useCallback(
    (number: number, patch: ChannelMembershipPatch) => {
      if (Object.keys(patch).length === 0) {
        return
      }

      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.editChannelMemberships(
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
          changes: reconcileChannelMembershipChanges(
            current.changes,
            completedRead.baselineBackup.codeplug,
            nextCodeplug
          ),
        })
      })
    },
    [setDocumentState]
  )

  const addMemoryChannel = React.useCallback(() => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      const completedRead = current.completedRead
      const number =
        completedRead.workingCodeplug.codeplug
          .getChannels()
          .findIndex((channel) => !channel.valid) + 1
      if (number === 0) {
        return current
      }

      const nextCodeplug =
        completedRead.workingCodeplug.codeplug.addMemoryChannel()
      const result = reconcileMemoryChannelStructureChange(
        current.changes,
        completedRead.baselineBackup.codeplug,
        completedRead.workingCodeplug.codeplug,
        nextCodeplug,
        { kind: "add-memory-channel", number }
      )

      return Object.freeze({
        completedRead: Object.freeze({
          ...completedRead,
          workingCodeplug: Object.freeze({
            ...completedRead.workingCodeplug,
            codeplug: result.codeplug,
          }),
        }),
        changes: result.changes,
      })
    })
  }, [setDocumentState])

  const duplicateMemoryChannel = React.useCallback(
    (number: number) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const channels = completedRead.workingCodeplug.codeplug.getChannels()
        const hasUnusedAfter = channels
          .slice(number)
          .some((channel) => !channel.valid)
        const copyNumber = hasUnusedAfter ? number + 1 : number
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.duplicateMemoryChannel(number)
        const result = reconcileMemoryChannelStructureChange(
          current.changes,
          completedRead.baselineBackup.codeplug,
          completedRead.workingCodeplug.codeplug,
          nextCodeplug,
          { kind: "add-memory-channel", number: copyNumber }
        )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: result.codeplug,
            }),
          }),
          changes: result.changes,
        })
      })
    },
    [setDocumentState]
  )

  const deleteMemoryChannel = React.useCallback(
    (number: number) => {
      setDocumentState((current) => {
        if (!current.completedRead) {
          return current
        }

        const completedRead = current.completedRead
        const nextCodeplug =
          completedRead.workingCodeplug.codeplug.deleteMemoryChannel(number)
        const result = reconcileMemoryChannelStructureChange(
          current.changes,
          completedRead.baselineBackup.codeplug,
          completedRead.workingCodeplug.codeplug,
          nextCodeplug,
          { kind: "delete-memory-channel", number }
        )

        return Object.freeze({
          completedRead: Object.freeze({
            ...completedRead,
            workingCodeplug: Object.freeze({
              ...completedRead.workingCodeplug,
              codeplug: result.codeplug,
            }),
          }),
          changes: result.changes,
        })
      })
    },
    [setDocumentState]
  )

  const resetWorkingCodeplug = React.useCallback(() => {
    setDocumentState((current) => {
      if (!current.completedRead) {
        return current
      }

      return Object.freeze({
        completedRead: Object.freeze({
          ...current.completedRead,
          workingCodeplug: Object.freeze({
            ...current.completedRead.workingCodeplug,
            codeplug: current.completedRead.baselineBackup.codeplug,
          }),
        }),
        changes: [],
      })
    })
  }, [setDocumentState])

  return {
    addMemoryChannel,
    deleteMemoryChannel,
    duplicateMemoryChannel,
    editChannelMemberships,
    editMemoryChannel,
    moveMemoryChannel,
    resetWorkingCodeplug,
  }
}

export { useMemoryChannelActions }
