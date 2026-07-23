import JSZip from 'jszip';
import { AttachedFile } from '../types';

export const downloadSingleFile = (file: AttachedFile) => {
  try {
    if (file.dataUrl && file.dataUrl.startsWith('data:')) {
      const parts = file.dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }

    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Download single file error:', e);
    window.open(file.dataUrl, '_blank');
  }
};

export const downloadAllFilesZip = async (files: AttachedFile[], companyName: string) => {
  if (!files || files.length === 0) return;

  const zip = new JSZip();
  const folderName = `${companyName || 'Cari'}_Ek_Belgeler`.replace(/[^a-zA-Z0-9_\-ĞÜŞİÖÇğüşiöç]/g, '_');
  const folder = zip.folder(folderName) || zip;

  files.forEach((file, index) => {
    // Extract base64 part
    const base64Data = file.dataUrl.split(',')[1];
    if (base64Data) {
      const safeName = `${index + 1}_${file.category}_${file.name}`.replace(/[^a-zA-Z0-9_\-\.ĞÜŞİÖÇğüşiöç]/g, '_');
      folder.file(safeName, base64Data, { base64: true });
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
