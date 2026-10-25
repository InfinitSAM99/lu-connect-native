export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    isGradient: false,
    bg: '#000000',
    myBubble: '#ef4444',
    theirBubble: '#141414',
    text: '#ffffff',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    isGradient: true,
    colors: ['#0f172a', '#1e1b4b'], // Deep blue gradient
    myBubble: '#6366f1', // Indigo
    theirBubble: '#1e293b',
    text: '#ffffff',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    isGradient: true,
    colors: ['#450a0a', '#7c2d12'], // Dark red to orange
    myBubble: '#f97316', // Orange
    theirBubble: '#291c14',
    text: '#ffffff',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    isGradient: true,
    colors: ['#022c22', '#064e3b'], // Deep green
    myBubble: '#10b981', // Emerald
    theirBubble: '#1a2e25',
    text: '#ffffff',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    isGradient: true,
    colors: ['#082f49', '#0c4a6e'], // Deep cyan/blue
    myBubble: '#0ea5e9', // Sky blue
    theirBubble: '#0f2a3b',
    text: '#ffffff',
  },
  mess: {
    id: 'mess',
    name: 'Messenger',
    isGradient: true,
    colors: ['#ffffff', '#e5e7eb'], // Light mode
    myBubble: '#0084ff', // FB Messenger Blue
    theirBubble: '#e4e6eb', // FB Grey
    text: '#000000',
  }
};

export function getChatTheme(id: string) {
  return THEMES[id as keyof typeof THEMES] || THEMES.classic;
}
