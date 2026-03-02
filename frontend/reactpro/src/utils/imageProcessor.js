/**
 * Image Processing Utilities
 *
 * Handles resizing and format conversion for photos.
 * Works with both uploaded and captured images.
 */

/**
 * Convert a data URL to a Blob
 * @param {string} dataURL - Base64 data URL
 * @returns {Blob} Blob object ready for upload
 */
export function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Resize an image to fit within specified dimensions while maintaining aspect ratio
 *
 * @param {string} dataUrl - Image data URL
 * @param {number} maxWidth - Maximum width in pixels (default 600)
 * @param {number} maxHeight - Maximum height in pixels (default 600)
 * @returns {Promise<string>} Resized image as data URL
 */
export function resizeImage(dataUrl, maxWidth = 600, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}

/**
 * Validate image before processing
 *
 * @param {File} file - Image file
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Allowed: JPEG, PNG. Got: ${file.type}`
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 5MB. Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }

  return { valid: true };
}

/**
 * Process image: validate, read, and resize
 *
 * @param {File} file - Image file from input or capture
 * @returns {Promise<string>} Processed image as data URL
 */
export async function processImage(file) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const resized = await resizeImage(evt.target.result);
        resolve(resized);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(file);
  });
}
