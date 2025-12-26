
export const uploadImage = async (base64Data: string, projectId: string): Promise<string> => {
  try {
    // 1. Convert Base64 to Blob
    const byteString = atob(base64Data.split(',')[1]);
    const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });

    // 2. Generate UUID Filename
    const filename = crypto.randomUUID();

    // 3. Send PUT Request
    // We send the raw blob as the body for efficient streaming
    const res = await fetch(`/api/images/${filename}?project=${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeString,
      },
      body: blob
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.url; // Expected format: /api/images/<uuid>?project=<id>
  } catch (e) {
    console.error("Storage Service Error:", e);
    throw e;
  }
};
