# Prompt-Free Local Storage

Relay stores desktop workspace state with prompt-free local encryption instead of OS secure-storage APIs that can trigger Keychain, safeStorage, device-password, fingerprint, or biometric prompts. This is a deliberate trade-off: OS-backed secret stores can be stronger in some environments, but surprise credential prompts broke first-run trust and are unacceptable for classroom workflows.
