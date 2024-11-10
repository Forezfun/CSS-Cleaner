if (!window.hasInitializedListenersDevTools) {
  browser.devtools.panels.create(
    "CSS Cleaner",
    "/skin/icons/64.png",
    "/devtools/panel/panel.html"
  ).then((newPanel) => {
    newPanel.onShown.addListener(handleShown);
    newPanel.onHidden.addListener(handleHidden);
  })
  window.hasInitializedListenersDevTools = true;
  browser.runtime.onMessage.addListener((message) => {
    console.log(message)
    switch (message.type) {
      case "recalculateParams":
        recalculateParams();
        break;
      case "getStyles":
        return Promise.resolve(getStyles());
      case "getDOMTree":
        return Promise.resolve(getDOMTree());
      case "highlightDOMElements":
        highlightDOMElements(message.DOMTreeUpdateObject, message.settingsObject)
        break
      case "cleanHighlightedElements":
        cleanHighlightedElements()
    }
  });

  async function handleShown() {
    await recalculateParams()
    browser.runtime.sendMessage({ type: "fetchRules" })
  }
  let opacityReduceIntervalMS = 500
  function handleHidden() {
    console.log('hide')
  }
  let DOMTree = [], allStylesObject = {}
  async function recalculateParams() {
    try {
      await calculateDOMTree();
      await calculateAllStylesObject();
      console.log(DOMTree, allStylesObject)
    } catch (error) {
      console.error("Error during restartCalculation:", error);
    }
  }

  function getStyles() {
    console.log(allStylesObject)
    return allStylesObject
  }
  function getDOMTree() {
    console.log(DOMTree)
    return DOMTree
  }
  async function highlightDOMElements(DOMTreeUpdateObject, settingsObject) {
    try {
      const jsonDOMTreeUpdateObject = JSON.stringify(DOMTreeUpdateObject)
      const jsonSettingsObject = JSON.stringify(settingsObject)
      console.log(DOMTreeUpdateObject, settingsObject)
      const [result, exception] = await browser.devtools.inspectedWindow.eval(`
          (function() {
            try {
              const DOMTreeUpdateObject = JSON.parse('${jsonDOMTreeUpdateObject}');
              const settingsObject = JSON.parse('${jsonSettingsObject}');
              const elementsArray = Array.from(document.querySelectorAll('*'));

              function hexToRgbWithOpacity(hex, opacity) {
                hex = hex.replace("#", "");
                let r = parseInt(hex.substring(0, 2), 16);
                let g = parseInt(hex.substring(2, 4), 16);
                let b = parseInt(hex.substring(4, 6), 16);
                return \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
              }

              function reduceHighlightedElementsOpacity(opacityPercent) {
                let clearIntervalCheck = true;
                document.querySelectorAll('.csscleaner').forEach(element => {
                  const rgbaArray = element.style.background.replace(/rgba\\(|\\)/g, '').split(', ');
                  if ((+rgbaArray[3] - opacityPercent / 100) > 0) {
                    rgbaArray[3] = (+rgbaArray[3]) - opacityPercent / 100;
                    element.style.background = \`rgba(\${rgbaArray.join(', ')})\`;
                    clearIntervalCheck = false;
                    return;
                  }
                  element.style.removeProperty('background');
                  setTimeout(() => {
                    element.classList.remove('csscleaner');
                  }, settingsObject.fadeInterval);
                });
                if (clearIntervalCheck) clearInterval(window.reduceOpacityInterval);
              }
  
                const style = document.createElement('style');
                style.id = 'ccsCleanerStyle';
                const opacityReduceIntervalMS = settingsObject.fadeInterval?settingsObject.fadeInterval:500
                style.textContent = \`
                    .csscleaner {
                        transition: background \${opacityReduceIntervalMS/1000}s ease-in-out;
                    }
                    .csscleaner:hover{
                    background:none;
                    }
                \`;
                document.head.appendChild(style);
              
              console.log('%cCSS CLEANER', 'padding: 5px; border-radius: 7px;background-color:#4CAF50;font-size:20px;color:white;margin-left:50%');
              DOMTreeUpdateObject.forEach(highlightObject => {
                const element = elementsArray[highlightObject.elementObject.listId];
                if (element) {
                  console.log(element)
                  element.style.background = hexToRgbWithOpacity(settingsObject.highlightColor, highlightObject.opacity);
                  element.classList.add('csscleaner');
                }
              });

                         
              
              if (settingsObject.fadeInterval) {
                window.reduceOpacityInterval = setInterval(() => {
                  reduceHighlightedElementsOpacity(settingsObject.fadePercentage);
                }, settingsObject.fadeInterval);
                setTimeout(()=>{
                  const styleElement = document.getElementById('ccsCleanerStyle')
                  if(styleElement){
                  styleElement.remove()
                  }
                  },100/settingsObject.fadePercentage)
              }
              return opacityReduceIntervalMS
            } catch (error) {
              console.error('Error in evaluated function:', error);
              throw error;
            }
          })();
        `);

      if (exception) {
        throw new Error(exception);
      }
      opacityReduceIntervalMS = result
      browser.runtime.sendMessage({ type: "changeDelay",delay:result})
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  
  async function calculateDOMTree() {
    try {
      const [result, exception] = await browser.devtools.inspectedWindow.eval(`
      (function() {
        const elementsArray = Array.from(document.querySelectorAll('*'))
          return elementsArray.map((element,index) => {
            element.setAttribute('listId',index)
              let returnObject = {
                  tagName: element.tagName,
                  classList: Array.from(element.classList),
                  listId:index
              };
              if (element.id) returnObject.id = element.id;
              if(element.parentElement)returnObject.parentListId=element.parentElement.getAttribute('listId')
              return returnObject;
          });
      })();
    `);

      if (exception) {
        throw new Error(exception);
      }
      DOMTree = result

    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async function cleanHighlightedElements() {
    try {
      const [result, exception] = await browser.devtools.inspectedWindow.eval(`
        (function() {
          const opacityReduceIntervalMS = ${opacityReduceIntervalMS}
          console.log(opacityReduceIntervalMS)
          const elements = document.querySelectorAll('.csscleaner');
          elements.forEach(element => {
            element.style.removeProperty('background');
            setTimeout(() => {
              element.classList.remove('csscleaner');
            }, opacityReduceIntervalMS);
          });
          setTimeout(() => {
          const styleElement = document.getElementById('ccsCleanerStyle');
          if (styleElement) {
            styleElement.remove();
          }
          }, opacityReduceIntervalMS);

        })();
      `);
  
      if (exception) {
        throw new Error(exception);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  
  async function calculateAllStylesObject() {
    try {
      const [result, exception] = await browser.devtools.inspectedWindow.eval(`
      (function() {
          const allStylesObject = {};
          const cssRulesArray = Array.from(document.styleSheets);

          cssRulesArray.forEach(cssRulesList => {
              try {
                  Array.from(cssRulesList.cssRules).forEach(ruleObject => {
                      if (ruleObject.type !== 1) return;
                      let cssArray = ruleObject.style.cssText.split('; ');
                      cssArray[cssArray.length - 1] = cssArray[cssArray.length - 1].slice(0, -1);

                      if (filterClass(ruleObject.selectorText)) return;
                      let rulePropertyName = ruleObject.selectorText;

                      if (!(/[.#]/.test(ruleObject.selectorText))) {
                          rulePropertyName = rulePropertyName.toLowerCase();
                      }

                      allStylesObject[rulePropertyName] = {};
                      cssArray.forEach(style => {
                          const styleParts = style.split(': ');
                          allStylesObject[rulePropertyName][styleParts[0]] = styleParts[1];
                      });
                  });
              } catch (e) {
                  console.warn("Skipping cross-origin stylesheet:", e);
              }
          });

          function filterClass(className) {
              const checkSymbolsArray = ['*', ':', '>'];
              let checkSymbols = false;

              checkSymbolsArray.forEach(symbol => {
                  if (className.includes(symbol)) { checkSymbols = true; return }
              });

              if (checkSymbols || (className.split(".").length - 1) > 1) return true;
              return false;
          }

          return allStylesObject;
      })();
    `);

      if (exception) {
        throw new Error("Error evaluating All Styles Object: " + exception);
      }

      allStylesObject = await result;
    } catch (error) {
      console.error("Error in calculateAllStylesObject:", error);
      throw error;
    }
  }
}


