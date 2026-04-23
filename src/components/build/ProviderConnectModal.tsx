"use client";

import type { BuildProviderId } from "@/lib/build-providers/types";

export type ProviderAuthPayload = {
  ready: boolean;
  message: string;
  loginSteps: string[];
};

type ProviderConnectModalProps = {
  open: boolean;
  providerId: BuildProviderId | null;
  snapshot: ProviderAuthPayload | null;
  verifying: boolean;
  onClose: () => void;
  onVerify: () => void | Promise<void>;
};

function providerTitle(id: BuildProviderId | null): string {
  if (id === "cursor") return "Cursor Agent";
  if (id === "claude") return "Claude (Anthropic)";
  return "Coding agent";
}

export default function ProviderConnectModal({
  open,
  providerId,
  snapshot,
  verifying,
  onClose,
  onVerify,
}: ProviderConnectModalProps) {
  if (!open || !providerId || !snapshot) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={() => {
        if (verifying) return;
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-connect-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h2
            id="provider-connect-title"
            className="text-base font-semibold text-foreground"
          >
            Connect {providerTitle(providerId)}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Semicolon uses your local credentials for this agent. Complete the
            steps below, then verify the connection.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-foreground/90">{snapshot.message}</p>
          {snapshot.loginSteps.length > 0 ? (
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted leading-relaxed">
              {snapshot.loginSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onVerify()}
            disabled={verifying}
            className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-wait"
          >
            {verifying ? "Checking…" : "I’ve signed in — verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
