"use client";

import { useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Vahvista",
  cancelLabel = "Peruuta",
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 font-medium text-white transition-colors sm:w-auto ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    resolve: ((value: boolean) => void) | null;
    danger?: boolean;
  }>({ isOpen: false, title: "", message: "", resolve: null });

  const confirm = (title: string, message: string, danger = false): Promise<boolean> =>
    new Promise((resolve) => setState({ isOpen: true, title, message, resolve, danger }));

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((current) => ({ ...current, isOpen: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((current) => ({ ...current, isOpen: false }));
  };

  const dialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
