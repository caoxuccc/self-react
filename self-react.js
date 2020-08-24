const RENDER_TO_DOM = Symbol('render to dom'); // 渲染节点
const RANGE = Symbol('range'); // range


function repalceContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();
  range.setStartBefore(node);
  range.setEndAfter(node);
}

export class Component {
  constructor() {
    // this.props = {} 生成的空对象并不"空"，所以才用Object.create(null)
    this.props = Object.create(null);
    this.children = [];
    this[RANGE] = null;
  }

  /**
   * @description props传参
   * @data 2020/8/23
   * @param {string} name 属性名
   * @param {*} value 属性值
   */
  setAttribute(name, value) {
    this.props[name] = value;
  }

  /**
   * @description 拼接字节点
   * @data 2020/8/23
   * @param {Element | ReactElement} component
   */
  appendChild(component) {
    this.children.push(component);
  }

  get vdom() {
    return this.render().vdom
  }

  /**
   * @description 渲染实体dom
   * @data 2020/8/23
   * @param {Range} range
   */
  [RENDER_TO_DOM](range) {
    this[RANGE] = range;
    this.oldVdom = this.vdom
    this.oldVdom[RENDER_TO_DOM](range);
  }

  update() {
    // 判断新旧vdom是否一致
    let isSameNode = (oldNode, newNode) => {
      // 类型不同
      if (oldNode.type !== newNode.type) return false;
      // 新旧节点属性数量不同
      if (Object.keys(newNode.props).length  !== Object.keys(oldNode.props).length) return false;
      // 新旧节点属性值不同
      for (let name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) return false;
      }
      // 文本节点内容不同
      if (newNode.type === '#text' && newNode.content !== oldNode.content)  return false;

      return true
    }

    let update = (oldNode, newNode) => {
      // 简易diff算法，比较type、props（值和长度）、textNode的content

      // 不同则全量更新
      if (!isSameNode(oldNode, newNode)) return newNode[RENDER_TO_DOM](oldNode[RANGE])
      // 一样则将oldNode的range（渲染范围）赋给newNode
      newNode[RANGE] = oldNode[RANGE]

      // 处理children
      let newChildren = newNode.vchildren
      let oldChildren = oldNode.vchildren

      // 无新节点弹出
      if (!newChildren || !newChildren.length) return;

      // oldNode 最后节点记录，用于追加节点
      let tailRnage = oldChildren[oldChildren.length - 1][RANGE]

      for(let i = 0; i < newChildren.length; i ++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];

        if (i < oldChildren.length) {
          update(oldChild, newChild)
        } else {
          let insertRange = document.createRange();
          insertRange.setStart(tailRnage.endContainer, tailRnage.endOffset);
          insertRange.setEnd(tailRnage.endContainer, tailRnage.endOffset);
          newChild[RENDER_TO_DOM](insertRange)
          // 更新最后节点位置，可以继续拼接节点
          tailRnage = insertRange
        }
      }

    }
    // 新虚拟dom
    let vdom = this.vdom;
    // 更新
    update(this.oldVdom, vdom);
    // 更新完成 替换原 oldVdom
    this.oldVdom = vdom

  }

  /**
   * @description 更新状态
   * @data 2020/8/23
   * @param {state} newState 新状态
   */
  setState(newState) {
    // 排除初始state为null 或 非object
    if (Object.prototype.toString.call(this.state) !== '[object Object]') this.state = newState;
    // 合并新旧state
    let merge = (oldState, newState) => {
      for (let key in newState) {
        if (Object.prototype.toString.call(oldState[key]) !== '[object Object]') {
          oldState[key] = newState[key]
        } else merge(oldState[key], newState[key])
      }
    }
    // 合并
    merge(this.state, newState)
    // 重新渲染
    this.update()
  }
}

/**
 * @description 处理元素节点
 * @data 2020/8/22
 * @param {*}
 */
class ElementWrapper extends Component {
  constructor(type) {
    super()
    this.type = type
  }

  get vdom() {
    this.vchildren = this.children.map(child => child.vdom)
    return this
  }

  // get vchildren() {
  //   return this.children.map(child => child.vdom)
  // }

  /**
   * @description 渲染dom
   * @data 2020/8/23
   * @param {Range} range 渲染范围区间
   */
  [RENDER_TO_DOM](range) {
    this[RANGE] = range;

    let root = document.createElement(this.type);

    for (let name in this.props) {
      let value = this.props[name];
      // 过滤onClick属性，绑定原生事件
      if (name.match(/on([\s\S]+)$/)) {
        let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLocaleLowerCase())
        root.addEventListener(eventName, value)
      } else if (name === 'className') root.setAttribute('class', value)
      else root.setAttribute(name, value);
    }

    if (!this.vchildren) this.vchildren = this.children.map(child => child.vdom);

    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }
    // 重新绘制
    repalceContent(range, root)
  }
}

/**
 * @description  处理文本节点
 * @data 2020/8/22
 * @param {*}
 */
class TextWrapper extends Component {
  constructor(content) {
    super()
    this.content = content
    this.type = '#text'
  }

  get vdom() {
    return this
  }

  /**
   * @description 渲染dom
   * @data 2020/8/23
   * @param {Range} range 渲染范围区间
   */
  [RENDER_TO_DOM](range) {
    this[RANGE] = range;
    let root = document.createTextNode(this.content)
    repalceContent(range, root)
  }
}

/**
 * @description jsx处理
 * @data 2020/8/23
 * @param {string | class} type 原生dom string，react组件
 * @param {Object} attributes 属性map
 * @param {(Element| ReactElement)[]} children 字节点数组
 */
export function createElement(type, attributes, ...children) {
  let element;
  if (typeof type === 'string') element = new ElementWrapper(type); // 生成元素节点
  else element = new type; // react组件实例化
  // 添加元素属性
  for (let attrKey in attributes) {
    element.setAttribute(attrKey, attributes[attrKey])
  }
  // 递归字节点
  let insertChidren = children => {

    for (let child of children) {
      // 排除字节点为空
      if (child === null) continue;
      // 排除文本节点（number ｜ string）
      if (typeof child === 'string' || typeof child === 'number') child = new TextWrapper(child);
      // 递归
      if (Object.prototype.toString.call(child) === '[object Array]') insertChidren(child);
      // 拼接
      else element.appendChild(child);
    }
  }

  insertChidren(children)

  return element
}

/**
 * @description 初始渲染
 * @data 2020/8/22
 * @param {ReactElement} component react组件
 * @param {Element} parentComponent 容器节点
 */
export function render(component, parentComponent) {
  // dom范围
  let range = document.createRange();
  // 设置起始位置
  range.setStart(parentComponent, 0);
  // 设置结束位置
  range.setEnd(parentComponent, parentComponent.childNodes.length);
  // 清空字节点
  range.deleteContents();
  // dom渲染
  component[RENDER_TO_DOM](range)
}
