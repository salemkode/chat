import { withMediaPickerLock } from "@/lib/media-picker-lock";
import * as ImagePicker from "expo-image-picker";

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  mimeType: string | undefined;
  fileSize: number | undefined;
  fileName?: string | null;
};

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    fileName: asset.fileName,
  };
}

/** Pick a single image from the library (no media-library permission pre-prompt). */
export async function pickOneImage(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
}): Promise<PickedImage | null> {
  const picked = await withMediaPickerLock(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return toPickedImage(result.assets[0]);
  });

  return picked ?? null;
}

/** Pick multiple images from the library (no media-library permission pre-prompt). */
export async function pickMultipleImages(
  maxCount: number,
): Promise<PickedImage[]> {
  const picked = await withMediaPickerLock(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
      quality: 0.8,
    });

    if (result.canceled) {
      return [];
    }

    return result.assets.map(toPickedImage);
  });

  return picked ?? [];
}

export type TakePhotoResult =
  | { ok: true; image: PickedImage }
  | { ok: false; reason: "permission-denied" | "cancelled" };

/** Take a photo with the camera (requests camera permission first). */
export async function takePhoto(): Promise<TakePhotoResult> {
  const picked = await withMediaPickerLock(async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      return { ok: false as const, reason: "permission-denied" as const };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return { ok: false as const, reason: "cancelled" as const };
    }

    return { ok: true as const, image: toPickedImage(result.assets[0]) };
  });

  return picked ?? { ok: false, reason: "cancelled" };
}
