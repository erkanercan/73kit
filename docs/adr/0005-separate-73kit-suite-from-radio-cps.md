# ADR 0005: Separate 73Kit suite context from Radio CPS context

## Status

Accepted and implemented on 2026-09-01.

## Context

The application began as a TYT UVL-15W CPS. It is becoming 73Kit, a broader
amateur-radio toolkit in which Radio CPS is one tool and multiple Radio Models
and firmware layouts will be added.

A single global CPS shell would make unrelated future tools initialize
Radio-specific state. Separate static route trees for each Radio would duplicate
the same CPS information architecture. Asking operators to choose live firmware
would make manual UI state compete with firmware identity reported by hardware.

Backups and updates are Radio-dependent product tasks, but Firmware Update and
Resource Flash do not share Codeplug protocol or recovery invariants.

## Decision

- Use a general 73Kit shell at suite-level routes.
- Put Radio Model selection at `/{locale}/cps`.
- Use one dynamic `/{locale}/cps/{radioModel}/...` route tree.
- Compose Radio Model, CPS Workspace, and Update Coordinator providers only
  under a recognized model route.
- Detect live firmware from the Radio and require an exact validated support
  profile. Do not ask the operator to select it.
- Keep raw `.bin` import unbound; require explicit profile selection only when
  multiple validated offline layouts exist.
- Keep Backups and Firmware & Resources inside Radio CPS navigation.
- Keep updater implementation separate from CPS Workspace.
- Treat TYT UVL-15W and Tekser TR-UV15 as aliases of one model.
- Replace the old portable format with `.73kcps` and require explicit model
  and support-profile metadata. Do not provide legacy `.uvl15cps` parsing.

## Consequences

New Radio Models add registry, driver, profile, capability, persistence, and
test work but do not duplicate routes. General 73Kit pages remain independent
of serial and recovery lifecycle state. Links and navigation must be generated
from the selected model route.

Compatibility fails closed. A known model with an unvalidated firmware version
can be identified and explained, but its Codeplug cannot be interpreted or
written.

The clean file-format break is acceptable before public compatibility
commitments. Existing legacy artifacts must be recreated from their source
Radio or exported again; the parser will not guess their ownership.

## Rejected alternatives

### Make CPS the suite shell

Rejected because future independent tools would inherit irrelevant Radio,
Codeplug, update, and recovery state.

### Put Backups and Updates in the suite navigation

Rejected because neither artifact is safely meaningful without model/profile
context.

### Create a route tree per Radio

Rejected because it duplicates UI and safety behavior while encoding runtime
catalog data in source structure.

### Let the operator choose live firmware

Rejected because hardware-reported identity is authoritative and a wrong manual
choice could authorize an incompatible layout.

### Automatically use the closest known firmware profile

Rejected because binary compatibility is not semantic-version compatibility.
Several exact official profiles share the 102,400-byte range, so byte length
still cannot select a firmware profile or storage layout.

### Keep `.uvl15cps` backward compatibility

Rejected because it adds migration and ambiguity at an identity-bound binary
boundary before any compatibility promise is necessary.

## Follow-up

The implementation and extension checklist are maintained in
[73Kit and Radio CPS platform architecture](../architecture/73kit-radio-cps-platform.md).
