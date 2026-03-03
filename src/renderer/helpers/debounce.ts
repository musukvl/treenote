/** Create a debounced version of a function. Includes a cancel() method. */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
): T & { cancel(): void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(this, args);
    }, delay);
  } as T & { cancel(): void };

  debounced.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}
