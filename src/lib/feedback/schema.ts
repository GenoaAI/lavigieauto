import { z } from "zod";

const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const feedbackFormSchema = z.object({
  text: z
    .string()
    .min(3, "Le message doit contenir au moins 3 caractères.")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères.")
    .trim(),
  image: z
    .object({
      base64Data: z.string().refine((data) => {
        if (!data) return true;
        // Verify base64 image pattern
        const match = data.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return false;
        const mime = match[1].toLowerCase();
        if (mime.includes("svg") || mime.includes("xml")) return false;
        return ALLOWED_IMAGE_MIMES.includes(mime);
      }, "Format d'image non supporté (seuls PNG, JPEG, WEBP et GIF sont acceptés)."),
      fileName: z.string().max(255).default("capture.png"),
    })
    .optional()
    .refine((img) => {
      if (!img?.base64Data) return true;
      try {
        const match = img.base64Data.match(/^data:[^;]+;base64,(.+)$/);
        if (!match) return true;
        const binaryLength = (match[1].length * 3) / 4;
        return binaryLength <= MAX_IMAGE_SIZE_BYTES;
      } catch {
        return false;
      }
    }, "L'image ne doit pas dépasser 5 Mo."),
});

export type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;

export interface FeedbackResult {
  success: boolean;
  message?: string;
  error?: string;
  ticketsCreated?: Array<{ id: string; title: string; type: string }>;
}
