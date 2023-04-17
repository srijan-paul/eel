// Every hotkey must have a "modifier".
// For example, the key combination "Ctrl + Shift + X"
// Will have a modifier value of `Modifier.ctrl | Modifier.shift`
export const enum Modifier {
  none = 0b0000,
  ctrl = 0b0001,
  shift = 0b0010,
  alt = 0b0100,
  cmd = 0b1000,
}

export type KeyboardCallback = (event: KeyboardEvent) => void;

// TODO: remove event listeners

/**
 * A helper class to handle keyboard shortcuts.
 */
export default class Input {
  // The DOM node on which the editor has been mounted.
  // All event listeners are attached to this element.
  private readonly mountElement: HTMLElement;

  constructor(mountElement: HTMLElement) {
    this.mountElement = mountElement;
  }

  /**
   * Get a bit-set representing all the modifier keys that have been pressed in `event`.
   * @param event a keyboard event
   */
  static getModifiersInEvent(event: KeyboardEvent): Modifier {
    let modifierMask = Modifier.none;
    if (event.ctrlKey) modifierMask |= Modifier.ctrl;
    if (event.altKey) modifierMask |= Modifier.alt;
    if (event.metaKey) modifierMask |= Modifier.cmd;
    if (event.shiftKey) modifierMask |= Modifier.shift;
    return modifierMask;
  }

  // Add a hotkey for the editor.
  addHotKey(key: string, modifiers: Modifier, callback: KeyboardCallback) {
    return Input.addHotKeyTo(this.mountElement, key, modifiers, callback);
  }

  // Add a hotkey event listener for [node].
  static addHotKeyTo(
    node: HTMLElement,
    key: string,
    modifiers: number,
    callback: KeyboardCallback
  ) {
    return node.addEventListener("keydown", (event) => {
      if (event.key !== key) return;
      const modifierMask = Input.getModifiersInEvent(event);
      if (modifierMask === modifiers) {
        callback(event);
      }
    });
  }
}
