export async function processAndCompressFile(file: File): Promise<{ base64: string; mimeType: string }> {
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|bmp)$/i.test(file.name);

  if (!isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          base64: reader.result as string,
          mimeType: file.type || 'application/pdf',
        });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({
            base64: compressedDataUrl,
            mimeType: 'image/jpeg',
          });
          return;
        }

        resolve({
          base64: e.target?.result as string,
          mimeType: file.type || 'image/jpeg',
        });
      };
      img.onerror = () => {
        resolve({
          base64: e.target?.result as string,
          mimeType: file.type || 'image/jpeg',
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
