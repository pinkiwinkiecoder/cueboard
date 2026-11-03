/**
 * Verkleint een foto in de browser naar maximaal `maxSide` pixels en JPEG.
 * Wordt gebruikt voor achtergrondfoto's en later voor foto's bij meldingen,
 * zodat we zuinig blijven met opslag en mobiele data.
 */
export async function compressImage(
  file: Blob,
  maxSide = 1600,
  quality = 0.8,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas niet beschikbaar');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Foto omzetten mislukt'))),
      type,
      quality,
    ),
  );
}
