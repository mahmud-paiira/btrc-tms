import api from './api';

export const checkOCRStatus = async () => {
    try {
        const response = await api.get('/public/ocr/status/');
        return response.data;
    } catch (error) {
        return { available: false, message: 'OCR service unavailable' };
    }
};

export const extractNID = async (formData) => {
    try {
        const response = await api.post('/public/ocr/extract/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return { success: false, error: 'OCR processing timeout' };
        }
        return { success: false, error: error.response?.data?.error || 'OCR failed' };
    }
};
