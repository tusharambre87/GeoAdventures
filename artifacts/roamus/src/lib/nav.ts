type SetLocation = (path: string) => void;

export function navPush(setLocation: SetLocation, path: string): void {
  setLocation(path);
}

export function navReplace(setLocation: SetLocation, path: string): void {
  window.history.replaceState(null, "", path);
  setLocation(path);
}
