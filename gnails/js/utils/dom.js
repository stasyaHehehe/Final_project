export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  const { class: className, text, attrs, dataset, on, ...rest } = props;

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : value);
    }
  }
  if (dataset) Object.assign(node.dataset, dataset);
  if (on) {
    for (const [event, handler] of Object.entries(on)) node.addEventListener(event, handler);
  }
  Object.assign(node, rest);

  node.append(...children.flat().filter(Boolean));
  return node;
}

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
