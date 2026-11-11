"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { isValidEarthdataToken, MIN_TOKEN_LENGTH } from "../../lib/tokenStorage";

export interface TokenModalProps {
  open: boolean;
  initialToken: string;
  onSave: (token: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Modal acessível para configuração do Bearer Token NASA Earthdata (`R-F3`).
 * Utiliza `<dialog>` nativo com `showModal()`, `closedby="any"` e fallback de
 * light-dismiss para navegadores sem suporte a `HTMLDialogElement.prototype.closedBy`.
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

  // Fallback para light-dismiss quando closedBy não é suportado nativamente
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

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    };

    if (!supportsClosedBy) {
      dialog.addEventListener("click", handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      if (!supportsClosedBy) {
        dialog.removeEventListener("click", handleBackdropClick);
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
      className="bg-slate-900 text-slate-100 border border-amber-500/50 rounded-xl p-5 w-full max-w-xl shadow-2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-bold text-amber-300 font-mono">
              🔑 Conexão Autenticada NASA Earthdata Cloud (urs.earthdata.nasa.gov)
            </h2>
            <p id={descId} className="text-xs text-slate-300 mt-1">
              Cole aqui o seu Bearer Token gerado no perfil Earthdata para leitura direta de granules{" "}
              <code className="text-sky-300">.h5</code> da NASA via stream remoto.
            </p>
          </div>
          <button
            type="button"
            data-testid="close-token-modal-btn"
            aria-label="Fechar modal"
            onClick={onClose}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
          >
            ✕ Esc
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-200 leading-relaxed">
          ⚠️ <b>Aviso de Segurança:</b> O token fica salvo em <code>localStorage</code> neste navegador
          e é enviado no corpo da requisição ao backend apenas durante análises customizadas. O backend
          aplica <i>redact</i> automático e jamais registra o token em logs ou erros.
        </div>

        <div className="space-y-1.5">
          <label htmlFor="earthdata-token-input" className="block text-xs font-mono text-slate-300">
            Bearer Token (mínimo de {MIN_TOKEN_LENGTH} caracteres):
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
              className="px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 w-full focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={() => setShowSecret((prev) => !prev)}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono shrink-0"
            >
              {showSecret ? "🙈 Ocultar" : "👁️ Mostrar"}
            </button>
          </div>
          {showValidationError && (
            <p role="alert" className="text-xs text-rose-400 font-mono">
              O token deve ter mais de 20 caracteres (atual: {trimmed.length}).
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            data-testid="remove-token-btn"
            onClick={handleRemove}
            className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-bold"
          >
            🗑️ Remover token
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="save-token-btn"
              disabled={!isValid}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold"
            >
              Salvar &amp; Aplicar
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

