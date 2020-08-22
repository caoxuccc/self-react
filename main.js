import SelfReact, { Component, render } from './self-react'

class MyComponent extends Component{
    constructor() {
        super();
        this.state = {
            num: 1,
        }
    }
    add() {
        this.setState({
            num: this.state.num + 1
        })
    }
    render() {
        return (
            <div>
                <h1>MyComponent</h1>
                <span>{this.state.num}</span>
                <button onClick={this.add.bind(this)}>add</button>
                <div>{this.children}</div>
            </div>
        )
    }
}

render(
    <MyComponent id={'a'} className={'b'} />,
    document.querySelector('#app')
)