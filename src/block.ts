export const enum NodeType {
  "Block",
  "Text",
  "Heading",
}

// Everything contained in the text editing area
// is represented by a "node".
// A Node can be either a block, or the child of a block.
// Every has a DOM Node associated with it.
export interface INode {
  type: NodeType;
  domNode: HTMLElement;
}

/**
 * Create a DOM node with a specified classLista and attribute set.
 * @param type Type of DOM node to create
 * @param classes A list of classes to add to the dom node
 * @param attrs record of attributes (like `{ contenteditable: "true" }`)
 */
function makeNode(
  type: string,
  classes?: string[],
  attrs?: Record<string, string>
): HTMLElement {
  const node = document.createElement(type);
  classes?.forEach((class_) => node.classList.add(class_));
  if (attrs) {
    Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val));
  }
  return node;
}

/**
 * Create a <div> node.
 * @param classes List of classes to add to the div
 * @param attrs A record that maps attribute names to attribute values for the div.
 */
function div(
  classes?: string[],
  attrs?: Record<string, string>
): HTMLDivElement {
  return makeNode("div", classes, attrs) as HTMLDivElement;
}

// A block is the building block of our editor (heh).
// The entire editing area is a linear list of blocks.
// Every block contains exactly one child (may change later).
// A block can contain:
// - A text
// - A heading
// - (more to come)
export class Block implements INode {
  type: NodeType.Block = NodeType.Block;
  domNode: HTMLDivElement = div(["eelBlock"]);
  child: INode;

  // CSS classes for a block
  public static readonly Style = {
    active: "eelBlock--active",
  };

  constructor() {
    this.child = new Text(this);
    this.domNode.appendChild(this.child.domNode);
  }

  // Set this block as the currently active block
  setActive(isActive: boolean) {
    if (isActive) {
      this.domNode.classList.add(Block.Style.active);
    } else {
      this.domNode.classList.remove(Block.Style.active);
    }
  }
}

// A "Text" contains plain text that may be bold, italic or underlined.
export class Text implements INode {
  type: NodeType.Text = NodeType.Text;
  domNode: HTMLDivElement = div(["eelText"], { contenteditable: "true" });

  // the editor block wrapping this text node.
  parent: Block;

  constructor(parent_: Block) {
    this.parent = parent_;
  }
}

// A helper function to dynamically create a class
// for a heading node.
function makeHeadingClass(divClassName: string) {
  return class implements INode {
    type = NodeType.Heading;
    domNode: HTMLDivElement = div([divClassName], { contenteditable: "true" });
    parent: Block;

    constructor(parent_: Block) {
      this.parent = parent_;
    }
  };
}

export const H1 = makeHeadingClass("eelH1");
export const H2 = makeHeadingClass("eelH2");
export const H3 = makeHeadingClass("eelH3");
