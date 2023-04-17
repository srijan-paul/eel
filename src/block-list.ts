import { Block, INode, H1, H2, H3, Text, NodeType } from "./block";

/**
 * State manager for the blocks inside an editor
 */
export class BlockList {
  // List of blocks from top to bottom.
  private readonly blocks: Block[] = [];

  // The 'active' block is the block under focus in the DOM,
  // and receives all keyboard and mouse events.
  private activeBlock: Block;

  // The DOM Node on which the editor has been mounted.
  // This is the immediate parent of every block's dom node.
  private mountElement: HTMLElement;

  // Maps a DOM node to it's nearest enclosing block.
  private readonly blockOfDOMNode = new WeakMap<Node, Block>();

  constructor(mountElement: HTMLElement) {
    // 1. create the first block and add it to the block list.
    this.activeBlock = this.createActiveBlock();
    this.blocks.push(this.activeBlock);

    // 2. append the block's DOM Node onto the editor.
    this.mountElement = mountElement;
    this.mountElement.appendChild(this.activeBlock.domNode);
  }

  /**
   * @param node A node in the DOM.
   * @returns The nearest enclosing block inside which the node exists.
   */
  findNearestBlockOfDOMNode(node: Node): Block | null {
    const block = this.blockOfDOMNode.get(node);
    if (block) return block;

    // find the nearest parent that has a "block"
    // associated with it.
    while (node.parentNode) {
      node = node.parentNode;
      // ELEMENT_NODE is for `div`s, `p`s etc.
      // Ref: https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        this.blockOfDOMNode.has(node)
      ) {
        return this.blockOfDOMNode.get(node) ?? null;
      }
    }

    // must a DOM node outside the editor.
    return null;
  }

  /**
   * Set [block] as the currently active block.
   */
  setActiveBlock(block: Block) {
    this.activeBlock?.setActive(false);
    this.activeBlock = block;
    block.setActive(true);

    // focus on the active block.
    const text = block.child;
    setTimeout(() => {
      text.domNode.focus();
    }, 20);
  }

  /**
   * Create a new block and set it as the currently active block.
   * WARNING: All blocks must be created using this method.
   * Using the block constructor will lead to undefined behavior in the editor.
   */
  createActiveBlock() {
    const newBlock = new Block();
    this.setActiveBlock(newBlock);
    // Map the new block's DOM node to its parent block
    this.blockOfDOMNode.set(newBlock.domNode, newBlock);
    return newBlock;
  }

  /**
   * Insert a new block below the currently active block
   */
  addBlockBelowCurrent() {
    const previouslyActiveBlock = this.activeBlock;
    const indexOfActiveBlock = this.blocks.indexOf(previouslyActiveBlock);
    const newBlock = this.createActiveBlock();

    // If the active block is the last block in the list,
    // then simply use `appendChild`.
    if (previouslyActiveBlock === this.blocks[this.blocks.length - 1]) {
      this.mountElement.appendChild(newBlock.domNode);
    } else {
      this.mountElement.insertBefore(
        newBlock.domNode,
        this.blocks[indexOfActiveBlock + 1]?.domNode ?? null
      );
    }

    if (indexOfActiveBlock === this.blocks.length - 1) {
      this.blocks.push(newBlock);
    } else {
      // insert the new block after the old active block index.
      this.blocks.splice(indexOfActiveBlock + 1, 0, newBlock);
    }
  }

  // Handle an arrow key up keyboard event
  arrowUp() {
    const activeBlockIndex = this.blocks.indexOf(this.activeBlock);
    if (activeBlockIndex >= 1) {
      this.setActiveBlock(this.blocks[activeBlockIndex - 1]);
    }
  }

  // Handle an arrow key down keyboard event
  arrowDown() {
    const activeBlockIndex = this.blocks.indexOf(this.activeBlock);
    if (activeBlockIndex < this.blocks.length - 1) {
      this.setActiveBlock(this.blocks[activeBlockIndex + 1]);
    }
  }

  // handle the backspace keypress
  backspace(target: Node) {
    const block = this.findNearestBlockOfDOMNode(target);
    if (!block) return;

    const { textContent } = target;
    if (textContent !== "") return

    // if block is empty and it's an heading, make it a text block
  
    const { child } = block;
    if (child.type === NodeType.Heading) {
      this.replaceBlockChild(block, new Text(block))
    } else if (child.type === NodeType.Text) {
      this.deleteBlockIfNotLast(block) 
    }
  }
  
  // If [block] is not the only block left, then delete it.
  private deleteBlockIfNotLast(block: Block) {
    if (this.blocks.length <= 1) return;
    const index = this.blocks.indexOf(block);
    block.domNode.remove()
    if (index === 0) {
      // remove the first item, and set the next item as the currently active block
      this.blocks.shift();
      this.setActiveBlock(this.blocks[0])
    } else if (index === this.blocks.length - 1) {
      // remove the last item, and set the previous item as the currently active block
      this.blocks.pop()
      this.setActiveBlock(this.blocks[index - 1])
    } else {
      // remove the item at [index] and set the previous item as active
      this.blocks.splice(index, 1)
      this.setActiveBlock(this.blocks[index - 1])
    }
  }

  private replaceBlockChild(block: Block, child: INode) {
    const oldChild = block.child.domNode;
    block.child = child;
    block.domNode.replaceChild(child.domNode, oldChild);
    // focus on new child
    setTimeout(() => {
      child.domNode.focus();
    }, 20);
  }

  handleMutation(target: Node) {
    const block = this.findNearestBlockOfDOMNode(target);
    if (!block) return;

    const { textContent } = target;

    let newNode: INode | null = null;
    if (textContent === "# ") {
      newNode = new H1(block);
    } else if (textContent === "## ") {
      newNode = new H2(block);
    } else if (textContent === "### ") {
      newNode = new H3(block);
    } else {
      return;
    }

    if (newNode) {
      this.replaceBlockChild(block, newNode);
    }
  }
}

