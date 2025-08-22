function $(id) { return document.getElementById(id); }
function $new(elemType, attr) { var e = document.createElement(elemType);if (attr) for(var k in attr) e.setAttribute(k,attr[k]);return e;}
function $clear(element) { while (element && element.firstChild) element.removeChild(element.firstChild); return element; }
function $text(text) { return document.createTextNode(text); }
function $texts(parent, tagName, arr) { for(var i in arr) parent.appendChild($new(tagName)).appendChild($text(arr[i])); }
function $br(parent) { parent.appendChild($new('br')); }
function $add(elem, type, attr) { return elem.appendChild($new(type, attr)); }

class DOMWrapper {
    constructor(elem) {
        this.elem = elem;
    }

    addChild(elemType, attr) { return new DOMWrapper(this.elem.appendChild($new(elemType, attr))); }
    addSibling(elemType, attr){
        return new DOMWrapper(this.elem.parentNode.appendChild($new(elemType, attr)))
    }
    addText(text) { return new DOMWrapper(this.elem.appendChild($text(text))); }
    addTextChildren(elemType, texts) {
        for (let t of texts) {
            this.addChild(elemType).addText(t);
        }
    }
    addTextSibling(text){
        this.elem.parentNode.appendChild($text(text))
        return this
    }
    parent() { return new DOMWrapper(this.elem.parentNode);}
}

function $$(elem)  {
    if (typeof elem === 'string')
        elem = $(elem);
    return new DOMWrapper(elem);
}
