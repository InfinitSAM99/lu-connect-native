export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Instagram',
    isGradient: false,
    bg: '#000000',
    myBubble: 'gradient',
    myGradient: ['#833AB4', '#E1306C', '#F77737'],
    theirBubble: '#262626',
    text: '#ffffff',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    isGradient: true,
    colors: ['#0f172a', '#1e1b4b'],
    myBubble: '#6366f1',
    theirBubble: '#1e293b',
    text: '#ffffff',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    isGradient: true,
    colors: ['#450a0a', '#7c2d12'],
    myBubble: '#f97316',
    theirBubble: '#291c14',
    text: '#ffffff',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    isGradient: true,
    colors: ['#022c22', '#064e3b'],
    myBubble: '#10b981',
    theirBubble: '#1a2e25',
    text: '#ffffff',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    isGradient: true,
    colors: ['#082f49', '#0c4a6e'],
    myBubble: '#0ea5e9',
    theirBubble: '#0f2a3b',
    text: '#ffffff',
  },
  mess: {
    id: 'mess',
    name: 'Messenger',
    isGradient: true,
    colors: ['#ffffff', '#e5e7eb'],
    myBubble: '#0084ff',
    theirBubble: '#e4e6eb',
    text: '#000000',
  }
};

export function getChatTheme(id: string) {
  return THEMES[id as keyof typeof THEMES] || THEMES.classic;
}
