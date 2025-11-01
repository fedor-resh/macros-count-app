const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function uploadPhoto(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('photo', file);

  try {
    const response = await fetch(`${API_URL}/api/analyze-photo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
    throw new Error('Failed to upload photo: Unknown error');
  }
}
