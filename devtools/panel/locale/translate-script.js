let translations = {};
async function loadTranslations() {
    const enResponse = await fetch('locale/en.json');
    const ruResponse = await fetch('locale/ru.json');
    translations.en = await enResponse.json();
    translations.ru = await ruResponse.json();
}
function updateText(language) {
    document.querySelectorAll('[locale-title]').forEach(element => {
        const titleKey = element.getAttribute('locale-title')
        element.title = translations[language][titleKey];
    });
    document.querySelectorAll('[locale-text]').forEach(element => {
        const textKey = element.getAttribute('locale-text')
        element.textContent = translations[language][textKey];
    });
}
document.querySelector('.chooseLanguageInput').addEventListener('change', function() {
    const selectedLanguage = this.value;
    updateText(selectedLanguage);
});
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    const initialLanguage = document.querySelector('.chooseLanguageInput').value;
    updateText(initialLanguage);
});
