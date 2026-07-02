export const BUTTON_GRADIENTS = {
  blue: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)',
  green: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)',
  purple: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)',
  orange: 'linear-gradient(135deg, #FF9600 0%, #e08000 100%)',
  red: 'linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)',
  yellow: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)',
  pink: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)'
} as const;

export type ButtonGradientColor = keyof typeof BUTTON_GRADIENTS;

export const SHARED_ACTION_BUTTON_CLASSES = "flex-1 rounded-xl font-bold text-white px-2 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2 btn-3d-effect";
