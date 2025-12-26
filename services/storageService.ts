
export const uploadImage = async (base64Data: string, projectId: string): Promise<string> => {
  try {
    // 1. Convert Base64 to Blob/ArrayBuffer
    const parts = base64Data.split(',');
    const meta = parts[0];
    const rawData = parts[1];
    
    const byteString = atob(rawData);
    const mimeString = meta.split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });

    // 2. Generate SHA-256 Hash as Filename (Deduplication Logic)
    // Instead of randomUUID, we use the hash of the content. 
    // If the same image is uploaded again, it overwrites the existing one, saving space.
    const hashBuffer = await crypto.subtle.digest('SHA-256', ab);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Determine extension
    const ext = mimeString.split('/')[1] || 'jpg';
    const filename = `${hashHex}.${ext}`;

    // 3. Send PUT Request
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
    return data.url; // Expected format: /api/images/<hash>.<ext>?project=<id>
  } catch (e) {
    console.error("Storage Service Error:", e);
    throw e;
  }
};
