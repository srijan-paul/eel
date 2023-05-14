import { Block } from "./block";
import { BlockList } from "./block-list";
import Input, { Modifier } from "./input";

// Configuration options for the editor.
// When an editor is initialized, it must be passed
// an `EditorConfig` object.
type EditorConfig = {
  // id of the DOM node where the editor will mount.
  // This should be a regular div.
  root: string;
};

// A class that exposes the editor functionality.
// An editor is a wrapper around a list of blocks.
// A document is broken down into blocks, each of which
// can be edited independently.
export class Editor {
  // The DOM node that represent the editor.
  // It holds all the blocks inside it.
  private readonly mountElement: HTMLElement;

  // All major browsers have a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) API.
  // This API allows us to observe any changes made to a DOM node (or its children), and react
  // to these changes with a callback function.
  private readonly mutationObserver: MutationObserver = new MutationObserver(
    (mutationList) => {
      for (const mut of mutationList) {
        if (mut.type === "characterData") {
          const { target } = mut;
          this.blockList.handleMutation(target);
        }
      }
    }
  );

  // An editor is essentially a list of blocks
  // A "block" can contain things like heading, text, list etc.
  private readonly blockList: BlockList;

  private inputHandler: Input;

  constructor({ root }: EditorConfig) {
    const el = document.getElementById(root);
    if (!el)
      throw new Error(`Could not find element with id "${root}" to mount on.`);
    this.mountElement = el;
    this.inputHandler = new Input(this.mountElement);

    this.blockList = new BlockList(this.mountElement);
    this.addEventListeners();

    this.mutationObserver.observe(this.mountElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private handleEnterKeyPress(event: KeyboardEvent) {
    // If the 'enter' key is pressed when we're inside a block, we
    // should enter into a new block
    event.preventDefault();
    this.blockList.addBlockBelowCurrent();
  }

  // Initialize all the event handlers for the editor.
  // This MUST only be called *once*, after the editor has been created.
  private addEventListeners() {
    this.mountElement.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.handleEnterKeyPress(event);
      }
    });

    this.mountElement.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowUp":
          this.blockList.arrowUp();
          break;
        case "ArrowDown":
          this.blockList.arrowDown();
          break;
        case "Backspace": {
          const { target } = event;
          if (!target) break;
          this.blockList.backspace(target as Node);
          break;
        }
        default:
          break;
      }
    });

    this.mountElement.addEventListener("click", (event) => {
      const { target } = event;
      if (target instanceof HTMLElement) {
        const nearestBlock = this.blockList.findNearestBlockOfDOMNode(target);
        if (nearestBlock) this.blockList.setActiveBlock(nearestBlock);
      }
    });

    this.addHotkey("b", Modifier.cmd, () => document.execCommand("bold"));
    this.addHotkey("i", Modifier.cmd, () => document.execCommand("italic"));
    this.addHotkey("u", Modifier.cmd, () => document.execCommand("underline"));
  }

  addHotkey(
    key: string,
    modifiers: Modifier,
    callback: (event: KeyboardEvent, block: Block) => void
  ) {
    this.inputHandler.addHotKey(key, modifiers, (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const { target } = event;
      if (target instanceof HTMLElement) {
        const nearestBlock = this.blockList.findNearestBlockOfDOMNode(target);
        if (nearestBlock) callback(event, nearestBlock);
      }
    });
  }
}

const _editor = new Editor({ root: "editor-root" });
export default _editor;
