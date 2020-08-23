const RENDER_TO_DOM = Symbol('render to dom'); // 渲染节点
const RANGE = Symbol('range'); // range

/**
 * @description 处理元素节点
 * @data 2020/8/22
 * @param {*}
 */
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type)
  }

  /**
   * @description 原生属性设置
   * @data 2020/8/23
   * @param {*}
   */
  setAttribute(name, value) {
    // 过滤onClick属性，绑定原生事件
    if (name.match(/on([\s\S]+)$/)) {
      let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLocaleLowerCase())
      this.root.addEventListener(eventName, value)
    } else if (name === 'className') this.root.setAttribute('class', value)
    else this.root.setAttribute(name, value)
  }

  /**
   * @description 拼接字节点
   * @data 2020/8/23
   * @param {Element ｜ ReactElement} component 字节点
   */
  appendChild(component) {
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length)
    range.setEnd(this.root, this.root.childNodes.length)
    component[RENDER_TO_DOM](range)
  }

  /**
   * @description 渲染dom
   * @data 2020/8/23
   * @param {Range} range 渲染范围区间
   */
  [RENDER_TO_DOM](range) {
    // 清空内容
    range.deleteContents()
    // 重新绘制
    range.insertNode(this.root)
  }
}

/**
 * @description  处理文本节点
 * @data 2020/8/22
 * @param {*}
 */
class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content)
  }

  /**
   * @description 渲染dom
   * @data 2020/8/23
   * @param {Range} range 渲染范围区间
   */
  [RENDER_TO_DOM](range) {
    range.deleteContents()
    range.insertNode(this.root)
  }
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

  /**
   * @description 渲染实体dom
   * @data 2020/8/23
   * @param {Range} range
   */
  [RENDER_TO_DOM](range) {
    this[RANGE] = range;
    this.render()[RENDER_TO_DOM](range);
  }

  /**
   * @description 更新渲染
   * @data 2020/8/23
   */
  rerender() {
    const oldRange = this[RANGE]; // 原组件在父组件中的所在位置区间
    const newRange = document.createRange(); // 新区间用于保存新节点

    // 在原oldRange初始点，插入一个区间，开始和结束位置都是oldRange的起始点
    newRange.setStart(oldRange.startContainer, oldRange.startOffset)
    newRange.setEnd(oldRange.startContainer, oldRange.startOffset)

    // 渲染新节点，此时新旧节点共存，通过debugger可看出
    this[RENDER_TO_DOM](newRange)

    // 将就区间oldRange起始点改为newRange的结束为止，防止将新节点删除
    oldRange.setStart(newRange.endContainer, newRange.endOffset)
    // 删除旧节点
    oldRange.deleteContents();
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
    this.rerender()
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
