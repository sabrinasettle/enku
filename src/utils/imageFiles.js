import heic2any from "heic2any";

export function isHeicFile(file) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export function isUploadableImageFile(file) {
  return file.type.startsWith("image/") || isHeicFile(file);
}

async function convertHeicToPng(file) {
  const result = await heic2any({
    blob: file,
    toType: "image/png",
  });

  return Array.isArray(result) ? result[0] : result;
}

export async function fileToPngBlob(file) {
  const source = isHeicFile(file) ? await convertHeicToPng(file) : file;
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

export async function fileToDisplayBlob(file) {
  try {
    return await fileToPngBlob(file);
  } catch {
    return file;
  }
}
