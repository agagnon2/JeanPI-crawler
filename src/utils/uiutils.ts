const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitForMs: number
) => {
  let timeout: any;

  return (...args: Parameters<F>): Promise<F> =>
    new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitForMs);
    });
};

export const uiUtils = {
  debounce,
};
