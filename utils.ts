export const safeStringify = (obj: any) => {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '[Circular]';
  }
};
