const workModeButtons = document.querySelectorAll('.workButton');
const viewModeButtons = document.querySelectorAll('.viewButton');
const constantViewModeSettingsSpan = document.querySelector('.constantViewModeSettingsSpan');
const temporaryViewModeSettingsSpan = document.querySelector('.temporaryViewModeSettingsSpan');
const colorInput = document.getElementById('colorHightlight')
colorInput.value='#fc0320'
const quantityInput = document.getElementById('maxElements')
const intervalInput = document.getElementById('reduceInterval')
const percentInput = document.getElementById('reducePercent')
const findButton = document.querySelector('.findBtn')
const clearButton = document.getElementById('clearBtn')
const updateButton = document.getElementById('updateBtn')
let extensionSettings = {
    workMode:'loaded',
    viewMode:'fade',
    highlightColor:'red',
    maxQuantity:20,
    fadeInterval:100,
    fadePercentage:1
}
workModeButtons.forEach(button => {
    button.addEventListener('click', () => {
        workModeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (button.id === 'workMode1') {
            extensionSettings.workMode='loaded'
        } else {
            extensionSettings.workMode='unused'
        }
    });
});
viewModeButtons.forEach(button => {
    button.addEventListener('click', () => {
        viewModeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (button.id === 'viewMode1') {
            constantViewModeSettingsSpan.classList.remove('disabled')
            temporaryViewModeSettingsSpan.classList.add('disabled')
            extensionSettings.viewMode='constant'
        }
        if(button.id === 'viewMode2') {
            constantViewModeSettingsSpan.classList.add('disabled')
            temporaryViewModeSettingsSpan.classList.remove('disabled')
            extensionSettings.viewMode='fade'
        }
    });
});
function fixAndCheckInputValues(){
    console.log('fix')
    extensionSettings.highlightColor=colorInput.value||extensionSettings.highlightColor
    extensionSettings.maxQuantity=Math.min(Math.max(+quantityInput.value||extensionSettings.maxQuantity,5),100)
    extensionSettings.fadeInterval=Math.min(Math.max(+intervalInput.value||extensionSettings.fadeInterval,100),10000)
    extensionSettings.fadePercentage=Math.min(Math.max(+percentInput.value||extensionSettings.fadePercentage,1),25)
    
    quantityInput.value=extensionSettings.maxQuantity
    intervalInput.value=extensionSettings.fadeInterval
    percentInput.value=extensionSettings.fadePercentage
}
clearButton.addEventListener('click',()=>{
    browser.runtime.sendMessage({ type: "cleanHighlightedElements" })
})
updateButton.addEventListener('click',()=>{
    browser.runtime.sendMessage({ type: "recalculateParams" })
})
findButton.addEventListener('click',()=>{
    fixAndCheckInputValues()
    let finalSettingsObject = {
        highlightColor:extensionSettings.highlightColor,
        maxQuantity:extensionSettings.maxQuantity
    }
    if(extensionSettings.viewMode === 'fade'){
        finalSettingsObject.fadeInterval=extensionSettings.fadeInterval
        finalSettingsObject.fadePercentage=extensionSettings.fadePercentage
    }
    if(extensionSettings.workMode ==='loaded'){
        return
    }
    browser.runtime.sendMessage({ type: "highlightElementsWithUnusedStyles",settingsObject:finalSettingsObject })
})

