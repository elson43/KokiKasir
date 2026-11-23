/**
 * Mengubah file gambar yang diupload menjadi string Base64 yang sudah dikompresi
 * agar hemat penyimpanan di LocalStorage dan cepat dimuat secara offline.
 * 
 * @param {File} file - File objek dari input type="file"
 * @param {number} maxWidth - Lebar maksimal gambar (default: 500px)
 * @param {number} quality - Kualitas kompresi JPEG (0.1 - 1.0, default: 0.75)
 * @returns {Promise<string>} Base64 data URL
 */
export function compressImageToBase64(file, maxWidth = 500, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File tidak ditemukan'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        // Hitung aspek rasio baru
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke Base64 JPEG dengan kompresi
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = (err) => {
        reject(err);
      };
    };

    reader.onerror = (err) => {
      reject(err);
    };
  });
}
