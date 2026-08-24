# Separate raw and identity-bound exports

The CPS will support both Raw Backup Exports containing the exact codeplug bytes and CPS Exports that also preserve Source Radio identity and interpretation metadata. This keeps raw backups interoperable while preventing an imported identity-free codeplug from weakening the rule that ordinary Radio Writes may target only the Source Radio; a Raw Backup Export therefore imports as an Unbound Codeplug and cannot be written to a radio.
