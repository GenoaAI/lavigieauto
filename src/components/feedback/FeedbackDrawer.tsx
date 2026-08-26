"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, UploadCloud, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { sendFeedbackAction } from "@/app/actions/feedback";

export function FeedbackDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdTickets, setCreatedTickets] = useState<Array<{ id: string; title: string; type: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fermeture via la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fermeture lors d'un clic en dehors du volet
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".feedback-trigger-btn")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptées (PNG, JPEG, WEBP, GIF).");
      return;
    }
    if (file.type.includes("svg") || file.type.includes("xml")) {
      setError("Le format SVG n'est pas autorisé pour des raisons de sécurité.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image dépasse la taille maximale autorisée de 5 Mo.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
      setFileName(file.name || "capture.png");
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setCreatedTickets([]);

    try {
      const res = await sendFeedbackAction(
        text.trim(),
        attachedImage ? { base64Data: attachedImage, fileName } : undefined
      );

      if (res.success) {
        setSuccess(res.message || "Votre feedback a bien été envoyé à MicroKanban !");
        if (res.ticketsCreated && res.ticketsCreated.length > 0) {
          setCreatedTickets(res.ticketsCreated);
        }
        setText("");
        handleRemoveImage();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
          setCreatedTickets([]);
        }, 3500);
      } else {
        setError(res.error || "Une erreur est survenue lors de l'envoi.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Bouton Flottant (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="feedback-trigger-btn fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95 transition duration-200 border border-blue-400/30 touch-manipulation"
        title="Donner un avis / Signaler un bug"
        aria-label="Ouvrir le formulaire de feedback"
      >
        <MessageSquare className="w-5 h-5 text-white" />
      </button>

      {/* Voile d'arrière-plan */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Volet coulissant (Drawer) */}
      <div
        ref={drawerRef}
        onPaste={handlePaste}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] border-l border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Donner un feedback</h2>
              <p className="text-xs text-slate-500">
                Remarque ou bug ? Vos retours améliorent LaVigieAuto.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu du formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-6 overflow-y-auto gap-4">
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{success}</span>
                </div>
                {createdTickets.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-900">
                      🎟️ Tickets créés dans MicroKanban :
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-emerald-700">
                      {createdTickets.map((t) => (
                        <li key={t.id}>
                          <span className="font-semibold">[{t.type}]</span> {t.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Champ texte */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Votre retour / Description
              </label>
              <textarea
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Expliquez ce qui s'est passé, l'anomalie constatée ou l'amélioration souhaitée..."
                className="h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>

            {/* Zone de téléversement et collage d'image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Capture d&apos;écran (optionnelle)</span>
                <span className="text-[10px] text-slate-400 font-normal">Max 5 Mo</span>
              </label>

              {!attachedImage ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <UploadCloud className="w-7 h-7 text-slate-400 mb-1.5" />
                  <p className="text-xs text-slate-700 font-medium">
                    Glissez une image ou <span className="text-blue-600">parcourez</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Astuce : collez directement avec <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[10px] font-mono text-slate-700">Ctrl+V</kbd>
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-900 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachedImage}
                      alt="Capture jointe"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {fileName || "Capture d'écran jointe"}
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold mt-0.5 block"
                    >
                      Supprimer la capture
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Note d'information */}
            <div className="rounded-lg bg-blue-50/60 p-2.5 border border-blue-100 text-[11px] text-slate-600">
              <span className="font-semibold text-blue-800">Auto-rédaction MicroKanban :</span> Votre retour est automatiquement qualifié par l&apos;assistant pour créer un ticket actionnable avec prompt de correctif dans le projet LaVigieAuto.
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="border-t border-slate-200 pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 py-2.5 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <span>Envoyer le feedback</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
