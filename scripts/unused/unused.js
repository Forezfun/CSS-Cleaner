if (!window.hasInitializedListenersUnused){
window.hasInitializedListenersUnused = true;
browser.runtime.onMessage.addListener(async(message) => {
    console.log(message)
    switch (message.type) {
        case "highlightElementsWithUnusedStyles":
            highlightElementsWithUnusedStyles(message.settingsObject)
            break
        case "fetchRules":
            rulesObject = await getRulesObject()
            break   
        case "tohighlightDOMElements":
            browser.runtime.sendMessage({ type: "highlightDOMElements",DOMTreeUpdateObject:message.DOMTreeUpdateObject,settingsObject:message.settingsObject })
            break
    }
});
}
async function highlightElementsWithUnusedStyles(settingsObject) {
    try {
        let DOMUpdateArray = []
        DOMElementsArray = await browser.runtime.sendMessage({ type: "getDOMTree" })
        stylesObject = await browser.runtime.sendMessage({ type: "getStyles" })
        console.log(DOMElementsArray, stylesObject)
        DOMElementsArray.forEach(elementObject => {
            const skipedHtmlTagsArray = ['HTML', 'SCRIPT', 'META', 'LINK', 'HEAD', 'STYLE', 'APP-LS-CONTENT'];
            if (skipedHtmlTagsArray.includes(elementObject.tagName)) return;
            const elementAllStylesLength = findAllElementStylesLength(elementObject)
            const elementUniqueStyles = findUniqueElementStyles(elementObject)
            const misusedStylesCount = findLengthMisusedStyles(elementObject, elementUniqueStyles)
            let elementInformationObject = {
                elementObject: elementObject,
                unusedStylesCount: (elementAllStylesLength - Object.keys(elementUniqueStyles).length) + misusedStylesCount
            }
            if (elementInformationObject.unusedStylesCount > 0) DOMUpdateArray.push(elementInformationObject)
        })
        DOMUpdateArray.sort((a, b) => b.unusedStylesCount - a.unusedStylesCount)
        DOMUpdateArray.length = Math.min(DOMUpdateArray.length,settingsObject.maxQuantity)
        DOMUpdateArray = repaintDOMArray(DOMUpdateArray)
        console.log(DOMUpdateArray)
        browser.runtime.sendMessage({ type: "highlightDOMElements",DOMTreeUpdateObject:DOMUpdateArray,settingsObject:settingsObject })
    } catch (error) {
        console.log(error)
    }
}
// Variables
let rulesObject, stylesObject, DOMElementsArray
// Emergency call functions(calculations) 
async function getRulesObject() {
    const rulesObjectResponse = await fetch('/scripts/unused/rules.json');
    const rulesObject = await rulesObjectResponse.json();
    return rulesObject;
}
function repaintDOMArray(DOMElementsArray) {
    const maxPoint = DOMElementsArray[0].unusedStylesCount
    return DOMElementsArray.map(elementObject => {
        return {
            elementObject: elementObject.elementObject,
            opacity: (elementObject.unusedStylesCount / maxPoint).toFixed(2) - 0.01
        }
    })
    
}
function findLengthMisusedStyles(elementObject, elementUniqueStyles) {
    let misusedStylesCounter = 0
    const parentUniqueStyles = findUniqueElementStyles(DOMElementsArray[elementObject.parentListId])
    for (let rulePropertyName in elementUniqueStyles) {
        const styleParentRulesObject = rulesObject.parent[rulePropertyName]
        if (styleParentRulesObject && elementObject.parentListId) {
            if (!styleParentRulesObject.parentValue.includes(parentUniqueStyles[styleParentRulesObject.parentProperty])) misusedStylesCounter++
        }
        const styleSelfRulesObject = rulesObject.self[rulePropertyName]
        if (styleSelfRulesObject) {
            if (!styleSelfRulesObject.selfValue.includes(elementUniqueStyles[styleSelfRulesObject.selfProperty])) misusedStylesCounter++
        }
    }
    return misusedStylesCounter
}
function findAllElementStylesLength(elementObject) {
    let elementAllStylesLength = 0
    const tagStyles = stylesObject[elementObject.tagName.toLowerCase()]
    if (tagStyles) {
        elementAllStylesLength += Object.keys(tagStyles).length
    } 
    Array.from(elementObject.classList).forEach(styleName => {
        const classStyles = stylesObject[('.' + styleName)]
        if (classStyles) {
            elementAllStylesLength += Object.keys(classStyles).length
        }
    })
    const idStyles = stylesObject[('#' + elementObject.id)]
    if (idStyles) {
        elementAllStylesLength += Object.keys(idStyles).length
    }
    return elementAllStylesLength
}
function findUniqueElementStyles(elementObject) {
    let elementUniqueStylesObject = {}

    let selector = elementObject.tagName.toLowerCase()
    let styles = stylesObject[selector]
    if (stylesObject) {
        elementUniqueStylesObject = { ...elementUniqueStylesObject, ...styles }
    }
    Array.from(elementObject.classList).forEach(styleName => {
        selector = ('.' + styleName)
        styles = stylesObject[selector]
        if (stylesObject) {
            elementUniqueStylesObject = { ...elementUniqueStylesObject, ...styles }
        }
    })
    selector = ('#' + elementObject.id)
    styles = stylesObject[selector]
    if (stylesObject) {
        elementUniqueStylesObject = { ...elementUniqueStylesObject, ...styles }
    }

    return elementUniqueStylesObject
}
// Start script
