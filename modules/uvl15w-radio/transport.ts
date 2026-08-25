interface RadioConnection {
  read(): Promise<Uint8Array | null>
  write(bytes: Uint8Array): Promise<void>
  close(): Promise<void>
}

interface RadioTransport {
  open(): Promise<RadioConnection>
}

export type { RadioConnection, RadioTransport }
