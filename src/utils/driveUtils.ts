export const getDriveImageUrl = (url?: string): string => {
  if (!url) return "";
  
  // Clean the URL
  const cleanUrl = url.trim();

  // Pattern for: drive.google.com/file/d/ID/view
  // Pattern for: drive.google.com/open?id=ID
  // Pattern for: drive.google.com/file/d/ID/edit
  // Pattern for: docs.google.com/file/d/ID/edit
  
  const idMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                  cleanUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
                  cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (idMatch && idMatch[1]) {
    const id = idMatch[1];
    // Using drive.google.com/thumbnail?id=ID&sz=w500 is often the most reliable way to show Drive images in 3rd party apps
    return `https://drive.google.com/thumbnail?id=${id}&sz=w500`;
  }
  
  return cleanUrl;
};
