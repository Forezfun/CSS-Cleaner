if (!window.hasInitializedListenersLoaded) {
    console.log("Инициализация слушателя сообщений");
    window.hasInitializedListenersLoaded = true;

    browser.runtime.onMessage.addListener(async (message) => {
        console.log(message);
        if (message.type === "highlightLoadedElement") {
            await highlightLoadedElement(message.minLayersQuantity, message.maxLayersQuantity,message.settingsObject);
        }
    });
    async function highlightLoadedElement(minLayersQuantity, maxLayersQuantity,settingsObject) {
        try {
            // Устанавливаем уникальный ключ для результата
            const uniqueKey = `highlightResult_${Date.now()}`;
            const scriptToEvaluate = `
                (function() {
                    const minLayersQuantity = ${minLayersQuantity};
                    const maxLayersQuantity = ${maxLayersQuantity};
                    const elementsArray = filterByLayer(document.querySelectorAll('*'), minLayersQuantity, maxLayersQuantity);
                    const addedElements = [];
                    let paintArray = [];
    
                    console.log('Elements to be processed:', elementsArray);
    
                    function filterByLayer(elementsArray, minLayersQuantity, maxLayersQuantity) {
                        return Array.from(elementsArray).filter(element => {
                            const skippedHtmlTagsArray = ['HTML', 'SCRIPT', 'META', 'LINK', 'HEAD', 'STYLE', 'APP-LS-CONTENT'];
                            if (skippedHtmlTagsArray.includes(element.tagName)) return false;
                            const depth = getMaxDepth(element);
                            return (depth >= minLayersQuantity) && (depth <= maxLayersQuantity);
                        });
                    }
    
                    function getMaxDepth(element) {
                        if (!element.children || element.children.length === 0) {
                            return 0;
                        }
                        let maxDepth = 0;
                        for (let child of element.children) {
                            maxDepth = Math.max(maxDepth, getMaxDepth(child));
                        }
                        return maxDepth + 1;
                    }
    
                    async function main(element) {
                        performance.mark('App_Start');
    
                        const cloneNode = element.cloneNode(true);
                        document.body.appendChild(cloneNode);
                        addedElements.push(cloneNode);
    
                        // Ждем два кадра для полной отрисовки
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    
                        performance.mark('App_FrameProduced');
                        const measure = performance.measure('FrameTime', 'App_Start', 'App_FrameProduced');
                        console.log("The Frame was produced after " + measure.duration + "ms");
    
                        paintArray.push({
                            listId: element.getAttribute('listId'),
                            paintTime: measure.duration
                        });
    
                        cloneNode.remove();
                    }
    
                    (async function() {
                        for (let element of elementsArray) {
                            await main(element);
                        }
    
                        // Сохраняем результат в window
                        window["${uniqueKey}"] = paintArray;
                    })();
                })();
            `;
    
            // Выполняем скрипт в контексте страницы
            await browser.devtools.inspectedWindow.eval(scriptToEvaluate);
    
            // Ожидаем появления результата в window
            let result = await new Promise(resolve => {
                const checkInterval = setInterval(async () => {
                    const [data] = await browser.devtools.inspectedWindow.eval(`window["${uniqueKey}"]`);
                    if (data) {
                        clearInterval(checkInterval);
                        resolve(data);
                    }
                }, 100);
            });
            result.sort((a, b) => b.paintTime - a.paintTime)
            result.length = Math.min(result.length,settingsObject.maxQuantity)
            result = transformToHighlightObject(result)
            console.log("Добавленные элементы:", result);
            browser.runtime.sendMessage({ type: "tohighlightDOMElements",DOMTreeUpdateObject:result,settingsObject:settingsObject })
        } catch (error) {
            console.error("Ошибка выполнения функции highlightLoadedElement:", error);
            throw error;
        }
    }
    function transformToHighlightObject(paintArray){
        const maxPaintTime = paintArray[0].paintTime
        return paintArray.map(dataObject=>{
            return {
                elementObject:{listId:dataObject.listId},
                opacity:(dataObject.paintTime / maxPaintTime).toFixed(2) - 0.01
            }
        })
    }
}
