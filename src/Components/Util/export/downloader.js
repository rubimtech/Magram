import JSZip from 'jszip';

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function saveToDirectory(files, dirHandle) {
  for (const [filename, blob] of Object.entries(files)) {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}

export async function saveAsZip(files, filename = 'export.zip') {
  const zip = new JSZip();
  for (const [name, blob] of Object.entries(files)) {
    zip.file(name, blob);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, filename);
}

export function isFileSystemAccessSupported() {
  return 'showDirectoryPicker' in window;
}

export default { downloadBlob, saveToDirectory, saveAsZip, isFileSystemAccessSupported };
