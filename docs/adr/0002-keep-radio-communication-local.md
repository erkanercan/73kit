# Keep radio communication local

Core CPS communication will remain local between the user's browser and the physical Radio, without routing radio data or commands through the Next.js server or another backend. This preserves offline-capable core functionality, keeps sensitive Codeplugs on the user's machine, and gives the browser session direct ownership of hardware safety and recovery; optional future services must not become part of the radio communication path.
