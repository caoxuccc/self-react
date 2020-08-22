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

    setAttribute(name, value) {
        // 过滤onClick属性，绑定原生事件
        if (name.match(/on([\s\S]+)$/)) {
            let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLocaleLowerCase())
            this.root.addEventListener(eventName, value)
        }
        else this.root.setAttribute(name, value)
    }

    appendChild(component) {
        let range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length)
        range.setEnd(this.root, this.root.childNodes.length)
        component[RENDER_TO_DOM](range)
    }

    [RENDER_TO_DOM](range) {
        range.deleteContents()
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

    [RENDER_TO_DOM](range) {
        range.deleteContents()
        range.insertNode(this.root)
    }
}

export class Component {
    constructor() {
        // this.props = {} 生成的空对象并不"空"，所以才用Object.create(null)
        this.props = Object.create(null)
        this.children = [];
        this[RANGE] = null;
        console.log('Component this', this)
    }

    setAttribute(name, value) {
        this.props[name] = value;
    }

    appendChild(component) {
        this.children.push(component);
    }

    [RENDER_TO_DOM](range) {
        this[RANGE] = range;
        this.render()[RENDER_TO_DOM](range);
    }

    rerender() {
        this[RANGE].deleteContents();
        this[RENDER_TO_DOM](this[RANGE])
    }

    setState(newState) {
        // 排除初始state为null 或 非object
        if (Object.prototype.toString.call(this.state) !== '[object Object]') {
            this.state = newState
        }
        // 合并新旧state
        let merge = (oldState, newState) => {
            for(let key in newState) {
                if (Object.prototype.toString.call(oldState[key]) !== '[object Object]') {
                    oldState[key] = newState[key]
                } else merge(oldState[key], newState[key])
            }
        }

        merge(this.state, newState)
        this.rerender()

    }

}

export function createElement(type, attributes, ...children) {
    let element;
    if (typeof type === 'string') element = new ElementWrapper(type)
    else element = new type
    // 添加元素属性
    for (let attrKey in attributes) {
        element.setAttribute(attrKey, attributes[attrKey])
    }
    // 递归字节点
    let insertChidren = children => {

        for (let child of children) {
            if (typeof child === 'string' || typeof child === 'number') child = new TextWrapper(child);
            if (Object.prototype.toString.call(child) === '[object Array]') {
                insertChidren(child)
            } else element.appendChild(child)
        }
    }

    insertChidren(children)

    return element
}

/**
 * @description 初始渲染
 * @data 2020/8/22
 * @param {*}
 */
export function render(component, parentComponent) {
    let range = document.createRange()
    range.setStart(parentComponent, 0)
    range.setEnd(parentComponent, parentComponent.childNodes.length)
    range.deleteContents()
    component[RENDER_TO_DOM](range)
}

export default {
    createElement,
    Component,
    render
}