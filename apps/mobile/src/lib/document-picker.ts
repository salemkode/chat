import { withMediaPickerLock } from "@/lib/media-picker-lock";
import * as DocumentPicker from "expo-document-picker";

export async function pickDocuments(options: {
  type: string | string[];
  multiple?: boolean;
}): Promise<DocumentPicker.DocumentPickerResult | undefined> {
  return withMediaPickerLock(() =>
    DocumentPicker.getDocumentAsync({
      type: options.type,
      multiple: options.multiple ?? true,
      copyToCacheDirectory: true,
    }),
  );
}
