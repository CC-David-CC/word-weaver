export function computeLayout(width, height, dpr = 1) {
  const w = Math.max(320, width || 840);
  const h = Math.max(360, height || 600);
  const safeDpr = Math.max(1, Math.min(4, dpr || 1));

  let tier = 'desktop';
  if (w < 768) {
    tier = 'phone';
  } else if (w >= 2560) {
    tier = '4k';
  }

  const isPhone = tier === 'phone';
  const is4K = tier === '4k';

  const minTouchTarget = isPhone ? 48 : is4K ? 56 : 40;
  const padding = isPhone ? 8 : is4K ? 24 : 16;
  const gap = isPhone ? 8 : is4K ? 20 : 12;

  return {
    tier,
    isPhone,
    is4K,
    w,
    h,
    targetBufferW: Math.round(w * safeDpr),
    targetBufferH: Math.round(h * safeDpr),
    safeDpr,
    minTouchTarget,
    padding,
    gap
  };
}
