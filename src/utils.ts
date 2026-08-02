export const shuffle = <T>(array: T[]): T[] => {
  let currentIndex = array.length;
  const newArray = [...array];
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

export const generateUUID = (): string =>
  Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const pickRandom = <T>(arr: T[], count: number = 1): T[] => {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, count);
};
