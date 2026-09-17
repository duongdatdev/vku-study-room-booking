import { useWindowDimensions } from 'react-native';

/**
 * Custom Hook: useResponsiveLayout (Slide 26 & 27)
 * Automatically adapts layout columns and card widths dynamically when device rotates or runs on tablet.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= 768;

  // Determine number of grid columns: 3 on tablet, 2 on landscape/large screens, 1 on standard phone portrait
  const columns = width >= 768 ? 3 : width >= 500 ? 2 : 1;

  // Calculate card width taking padding and inter-column gaps into consideration
  let cardWidth = width - 32; // Default single column (16px margin on each side)
  if (columns === 3) {
    // 3 columns: 32px outer padding + 2x16px gaps = 64px
    cardWidth = Math.floor((width - 64) / 3);
  } else if (columns === 2) {
    // 2 columns: 32px outer padding + 16px gap = 48px
    cardWidth = Math.floor((width - 48) / 2);
  }

  return {
    width,
    height,
    isLandscape,
    isTablet,
    columns,
    cardWidth,
  };
}
