"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { isValidEarthdataToken, MIN_TOKEN_LENGTH } from "../../lib/tokenStorage";
import {
  AlertTriangleIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  TrashIcon,
} from "../icons/SurveyIcons";

export interface TokenModalProps {
  open: boolean;
  initialToken: string;
  onSave: (token: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Modal acessível para configuração do Bearer Token NASA Earthdata (`R-F3`).
 * Usa `<dialog>` nativo com `showModal()`, `closedby="any"` e fallback
 * pointerdown/pointerup fora do retângulo quando `closedBy` não é suportado.
 */
export function TokenModal({
  open,
  initialToken,
  onSave,
  onRemove,
  onClose,
}: TokenModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const [draft, setDraft] = useState<string>(initialToken);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    setDraft(initialToken);
    setTouched(false);
  }, [initialToken, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute("closedby", "any");

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      }
      inputRef.current?.focus();
    } else if (dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      onClose();
    };
    dialog.addEventListener("close", handleNativeClose);

    const supportsClosedBy =
      typeof HTMLDialogElement !== "undefined" &&
      "closedBy" in HTMLDialogElement.prototype;

    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (!supportsClosedBy) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (!supportsClosedBy) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [onClose]);

  const trimmed = draft.trim();
  const isValid = isValidEarthdataToken(trimmed);
  const showValidationError = touched && trimmed.length > 0 && !isValid;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSave(trimmed);
    onClose();
  };

  const handleRemove = () => {
    setDraft("");
    onRemove();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      data-testid="token-modal-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="bg-[var(--pz-surface)] text-[var(--pz-text)] border border-[var(--pz-border-strong)] rounded-2xl p-5 w-full max-w-xl shadow-2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--pz-accent-soft)] border border-[var(--pz-accent)]/30 text-[var(--pz-accent)] shrink-0">
              <KeyIcon className="w-4 h-4" />
            </span>
            <div>
              <h2 id={titleId} className="text-sm font-bold text-[var(--pz-text)]">
                Autenticação NASA Earthdata Cloud
              </h2>
              <p id={descId} className="text-xs text-[var(--pz-muted)] mt-0.5">
                Informe o Bearer Token gerado em{" "}
                <span className="font-mono text-[var(--pz-secondary)]">urs.earthdata.nasa.gov</span> para
                leitura direta de granules <code className="font-mono text-[var(--pz-accent)]">.h5</code>.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-token-modal-btn"
            aria-label="Fechar janela de configuração"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-[var(--pz-muted)] hover:text-[var(--pz-text)] transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="pz-status-yellow flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed">
          <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            O token permanece apenas no <code className="font-mono">localStorage</code> deste
            navegador e é enviado somente durante consultas customizadas, sem registro em logs do
            servidor.
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="earthdata-token-input" className="block text-xs font-medium text-[var(--pz-secondary)]">
            Bearer Token (mínimo {MIN_TOKEN_LENGTH} caracteres)
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="earthdata-token-input"
              data-testid="token-input"
              type={showSecret ? "text" : "password"}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setTouched(true);
              }}
              placeholder="Cole seu Bearer Token (eyJ0eXAi...)"
              className="px-3 py-2 rounded-xl bg-[var(--pz-well)] border border-[var(--pz-border)] focus:border-[var(--pz-accent)] text-xs font-mono text-[var(--pz-text)] w-full focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSecret((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-xs font-medium text-[var(--pz-text)] shrink-0 transition-colors cursor-pointer"
            >
              {showSecret ? (
                <>
                  <EyeOffIcon className="w-3.5 h-3.5" />
                  <span>Ocultar</span>
                </>
              ) : (
                <>
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Mostrar</span>
                </>
              )}
            </button>
          </div>
          {showValidationError && (
            <p role="alert" className="text-xs text-[var(--pz-danger-ink)]">
              O token precisa ter mais de 20 caracteres (atual: {trimmed.length}).
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-[var(--pz-border)]">
          <button
            type="button"
            data-testid="remove-token-btn"
            onClick={handleRemove}
            className="pz-status-red inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Remover token</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[var(--pz-well)] hover:bg-[var(--pz-accent-soft)] border border-[var(--pz-border)] text-[var(--pz-secondary)] hover:text-[var(--pz-text)] text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="save-token-btn"
              disabled={!isValid}
              className="px-4 py-1.5 rounded-xl bg-[var(--pz-accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--pz-accent-ink)] text-xs font-bold transition-opacity cursor-pointer"
            >
              Salvar e Aplicar
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
