const RENDER_URL = process.env.EXPO_PUBLIC_RENDER_URL || 'https://lu-connect-backend-ink3.onrender.com';

export const api = {
  getTestDb: async () => {
    const res = await fetch(`${RENDER_URL}/api/test-db`);
    return res.json();
  }
};
