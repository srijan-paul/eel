// Configuration options for the editor.
// When an editor is initialized, it must be passed
// an `EditorConfig` object.
type EditorConfig = {
  // id of the DOM node where the editor will mount.
  // This should be a regular div.
  root: string
}


const enum NodeType {
  'Block',
  'Text'
}

interface INode {
  type: NodeType
}

const enum Direction {
  up,
  down,
  left,
  right
}

/**
 * Create a DOM node with a specified classLista and attribute set.
 * @param type Type of DOM node to create
 * @param classes A list of classes to add to the dom node
 * @param attrs record of attributes (like `{ contenteditable: "true" }`)
 */
function makeNode(type: string, classes?: string[], attrs?: Record<string, string>): HTMLElement {
  const node = document.createElement(type)
  classes?.forEach(class_ => node.classList.add(class_))
  if (!attrs) return node
  Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val))
  return node
}

/**
 * Create a <div> node.
 * @param classes List of classes to add to the div
 * @param attrs A record that maps attribute names to attribute values for the div.
 */
function div(classes?: string[], attrs?: Record<string, string>): HTMLDivElement {
  return makeNode('div', classes, attrs) as HTMLDivElement
}


class Block implements INode {
  type: NodeType.Block = NodeType.Block
  domNode: HTMLDivElement = div(['eelBlock'])
  child: Text

  // Since blocks are always ordered, we maintain a linked list.
  next: Block | null = null
  prev: Block | null = null

  // CSS classes for a block
  public static readonly Style = {
    active: 'eelBlock--active'
  }

  constructor() {
    this.child = new Text(this)
    this.domNode.appendChild(this.child.domNode)
  }

  // Set this block as the currently active block
  setActive(isActive: boolean) {
    if (isActive) {
      this.domNode.classList.add(Block.Style.active)
    } else {
      this.domNode.classList.remove(Block.Style.active)
    }
  }
}

// TODO: bold, italics, underline, links, etc.

// A "Text" contains plain text that may be bold, italic or underlined.
class Text implements INode {
  type: NodeType.Text = NodeType.Text
  domNode: HTMLDivElement = div(['eelText'], { contenteditable: "true" })
  parent: Block;

  constructor(parent_: Block) {
    this.parent = parent_
  }
}

export class Editor {
  // The DOM node that represent the editor.
  // It holds all the blocks inside it.
  private readonly mountElement: HTMLElement

  // The block being currently edited. 
  private currentActiveBlock: Block

  // Maps a DOM element to its nearest parent block.
  private blockOfDomNode = new WeakMap<Node, Block>()


  // All major browsers have a [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) API.
  // This API allows us to observe any changes made to a DOM node (or its children), and react
  // to these changes with a callback function.
  private readonly mutationObserver: MutationObserver = new MutationObserver(() => {
    // empty because reasons 
  })

  // An editor is essentially a list of blocks
  // A "block" can contain things like heading
  private readonly blocks: Block[] = []

  constructor({ root }: EditorConfig) {
    const el = document.getElementById(root)
    if (!el) throw new Error(`Could not find element with id "${root}" to mount on.`)
    this.mountElement = el
    this.addEventListeners()
    this.currentActiveBlock = this.addBlockAtEnd()
    this.mutationObserver.observe(this.mountElement, { childList: true, subtree: true, characterData: true })
  }

  handleEnterKeyPress(event: KeyboardEvent) {
    // If the 'enter' key is pressed when we're inside a block, we
    // should enter into a new block
    event.preventDefault()
    this.addBlockBelowCurrent()
  }

  /**
   * @param node A node in the DOM.
   * @returns The enclosing block inside which the node exists.
   */
  findNearestBlockOfDOMNode(node: Node): Block | null {
    let block = this.blockOfDomNode.get(node)
    if (block) return block

    while (node.parentNode) {
      node = node.parentNode
      // ELEMENT_NODE is for `div`s, `p`s etc.
      // Ref: https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
      if (node.nodeType === Node.ELEMENT_NODE && this.blockOfDomNode.has(node)) {
        return this.blockOfDomNode.get(node) ?? null
      }
    }

    return null
  }

  // Initialize all the event handlers for the editor.
  // This MUST only be called *once*, after the editor has been created.
  private addEventListeners() {
    this.mountElement.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.handleEnterKeyPress(event)
      }
    })

    this.mountElement.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp': this.arrowUp(); break;
        case 'ArrowDown': this.arrowDown(); break;
        default: break;
      }
    })

    this.mountElement.addEventListener('click', (event) => {
      const { target } = event
      if (target instanceof HTMLElement) {
        const nearestBlock = this.findNearestBlockOfDOMNode(target)
        if (nearestBlock) this.setActiveBlock(nearestBlock)
      }
    })
  }

  arrowUp() {
    const activeBlockIndex = this.blocks.indexOf(this.currentActiveBlock)
    if (activeBlockIndex >= 1) {
      this.setActiveBlock(this.blocks[activeBlockIndex - 1])
    }
  }

  arrowDown() {
    const activeBlockIndex = this.blocks.indexOf(this.currentActiveBlock)
    if (activeBlockIndex < this.blocks.length - 1) {
      this.setActiveBlock(this.blocks[activeBlockIndex + 1])
    }
  }

  /**
   * Set `block` as the currently active block in the editor.
   * @param block 
   */
  setActiveBlock(block: Block) {
    this.currentActiveBlock?.setActive(false)
    block.setActive(true)

    // Shift focus to the currently active block
    const text = block.child

    // Only nodes that are present in the DOM
    // can be `focus()`ed. Unfortunately,
    // the only way I could find to do thi was add an
    // arbitrary timeout.
    setTimeout(() => {
      text.domNode.focus()
    }, 20)
    this.currentActiveBlock = block
  }

  /**
   * Create a new block and set it as the currently active block.
   * WARNING: All blocks must be created using this method.
   * Using the block constructor will lead to undefined behavior in the editor.
   */
  public createActiveBlock() {
    const newBlock = new Block()
    this.setActiveBlock(newBlock)
    // Map the block's children node to itself.
    this.blockOfDomNode.set(newBlock.domNode, newBlock)
    return newBlock
  }

  // Add a new block at the end. 
  addBlockAtEnd(): Block {
    const newBlock = this.createActiveBlock()
    this.blocks.push(newBlock)
    this.mountElement.appendChild(newBlock.domNode)
    return newBlock
  }

  /**
   * Inserts a new block at the given position.
   * @param index The index in the block list after which the new block will be inserted.
   */
  addBlockAt(index: number) {
    if (index < 0 || index >= this.blocks.length) {
      throw new Error("Block index out of range")
    }
  }

  /**
   * Insert a new block below the currently active block
   */
  addBlockBelowCurrent() {
    const previouslyActiveBlock = this.currentActiveBlock
    const indexOfActiveBlock = this.blocks.indexOf(previouslyActiveBlock)
    const newBlock = this.createActiveBlock()

    // if the active block is the last block in the list,
    // then simply use `appendChild`.
    if (previouslyActiveBlock === this.blocks[this.blocks.length - 1]) {
      this.mountElement.appendChild(newBlock.domNode)
    } else {
      this.mountElement.insertBefore(newBlock.domNode, this.blocks[indexOfActiveBlock + 1]?.domNode ?? null)
    }

    if (indexOfActiveBlock === this.blocks.length - 1) {
      this.blocks.push(newBlock)
    } else {
      // insert the new block after the old active block index.
      this.blocks.splice(indexOfActiveBlock + 1, 0, newBlock)
    }

    console.log('after:', this.blocks.map(bl => bl.child.domNode))
  }
}

new Editor({ root: 'editor-root' })

