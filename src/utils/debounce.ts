/**
 * 防抖函数 debounce
 *
 * 在事件被频繁触发时，只在"停止触发一段时间后"才执行回调
 *
 * @param {Function} fn 需要被防抖的函数
 * @param {number} wait 防抖等待时间，单位毫秒，默认 300ms
 * @param {Object} options 配置项
 * @param {boolean} options.leading 是否在第一次触发时立即执行，默认 false
 * @param {boolean} options.trailing 是否在停止触发后再执行一次，默认 true
 * @returns {Function} 返回带有 cancel / flush / pending 方法的防抖函数
 */
type Debounced<T extends (...args: any[]) => any> = ((
  ...args: Parameters<T>
) => ReturnType<T> | undefined) & {
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
};

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
  options: { leading?: boolean; trailing?: boolean } = {}
): Debounced<T> {
  const leading = !!options.leading;
  const trailing = options.trailing !== false;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | undefined;
  let lastResult: ReturnType<T> | undefined;

  function invoke() {
    const args = lastArgs as Parameters<T>;
    const result = fn.apply(lastThis, args);
    lastResult = result;
    lastArgs = null;
    lastThis = undefined;
    return result;
  }

  function timerExpired() {
    timerId = null;
    if (trailing && lastArgs) return invoke();
    lastArgs = null;
    lastThis = undefined;
  }

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const shouldCallNow = leading && timerId === null;

    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(timerExpired, wait);

    if (shouldCallNow) return invoke();
    return lastResult;
  } as Debounced<T>;

  debounced.cancel = () => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = null;
    lastArgs = null;
    lastThis = undefined;
  };

  debounced.flush = () => {
    if (timerId === null) return lastResult;
    clearTimeout(timerId);
    timerId = null;
    if (lastArgs) return invoke();
    return lastResult;
  };

  debounced.pending = () => timerId !== null;

  return debounced;
}

export default debounce;
