/**
 * Photo API Service
 *
 * Handles communication with Django backend for photo uploads.
 */

import axiosInstance from './axios';

/**
 * Upload a client photo using FormData (multipart)
 * This allows sending binary image data efficiently
 *
 * @param {number} clientId - Client ID
 * @param {File} photoFile - Image file object
 * @returns {Promise<Object>} Response containing client data with photo URL
 */
export async function uploadClientPhotoFile(clientId, photoFile) {
  const formData = new FormData();
  formData.append('photo', photoFile);

  try {
    const response = await axiosInstance.post(
      `/clients/${clientId}/kyc/upload-documents/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to upload photo';
    throw new Error(message);
  }
}

/**
 * Upload a client photo from base64 data URL
 * Converts data URL to Blob before uploading
 *
 * @param {number} clientId - Client ID
 * @param {string} dataUrl - Base64 image data URL
 * @returns {Promise<Object>} Response containing client data with photo URL
 */
export async function uploadClientPhotoDataUrl(clientId, dataUrl) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `client-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

  return uploadClientPhotoFile(clientId, file);
}

/**
 * Fetch client details including photo URL
 *
 * @param {number} clientId - Client ID
 * @returns {Promise<Object>} Client data including photo_url
 */
export async function getClientPhoto(clientId) {
  try {
    const response = await axiosInstance.get(`/clients/${clientId}/`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to fetch client';
    throw new Error(message);
  }
}
