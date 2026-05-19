let pickerInFlight = false;

/** Run one system picker at a time (document, photo library, camera). */
export async function withMediaPickerLock<T>(
  fn: () => Promise<T>,
): Promise<T | undefined> {
  if (pickerInFlight) {
    return undefined;
  }

  pickerInFlight = true;
  try {
    return await fn();
  } finally {
    pickerInFlight = false;
  }
}

export function isMediaPickerInFlight() {
  return pickerInFlight;
}
