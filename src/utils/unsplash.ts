// Utility function to get images from Unsplash
export async function getUnsplashImage(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`
    );
    return response.url;
  } catch (error) {
    console.error("Error fetching image:", error);
    return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
  }
}
