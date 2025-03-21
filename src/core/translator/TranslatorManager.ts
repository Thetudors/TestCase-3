import { SUPPORTED_LANGUAGES } from "./config";

export class TranslatorManager {
    private static _instance: TranslatorManager;
    private _translations: Record<string, string> = {};
    private _currentLanguage: string = 'en'; // Default language
    private _defaultLanguage: string = 'en'; // Fallback language
    private _isLoaded: boolean = false;
    private _onLoadCallbacks: Array<() => void> = [];

    private constructor() { }

    public static get instance(): TranslatorManager {
        if (!TranslatorManager._instance) {
            TranslatorManager._instance = new TranslatorManager();
        }
        return TranslatorManager._instance;
    }

    public async detectBrowserLanguage(): Promise<void> {
        // Get browser language (e.g., 'en-US', 'tr', etc.)
        const browserLang = navigator.language.split('-')[0]; // Get primary language code

        // Check if browser language is supported
        if (SUPPORTED_LANGUAGES.includes(browserLang)) {
            this._currentLanguage = browserLang;
        } else {
            // Fallback to default language if not supported
            console.warn(`Language ${browserLang} is not supported. Falling back to default language ${this._defaultLanguage}.`);
            this._currentLanguage = this._defaultLanguage;
        }

        // Load translations for detected language
       await this.loadTranslations();
    }

    private async loadTranslations(): Promise<void> {
        try {
            // Clear previous translations
            this._translations = {};
            this._isLoaded = false;

            // Load JSON file for current language
            const response = await fetch(`assets/languages/${this._currentLanguage}.json`);

            if (!response.ok) {
                throw new Error(`Failed to load translations for ${this._currentLanguage}`);
            }

            this._translations = await response.json();
            this._isLoaded = true;

            // Call all registered callbacks
            this._onLoadCallbacks.forEach(callback => callback());

        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    /**
     * Get translation for a key with optional parameter substitution
     * @param key The translation key
     * @param params Optional parameters for substitution
     * @returns Translated string
     */
    public translate(key: string, params?: Record<string, string | number>): string {
        // If translations not loaded yet, return the key
        if (!this._isLoaded) {
            console.warn('Translations not loaded yet, returning key:', key);
            return key;
        }

        // Get translation or fallback to key if not found
        let translation = this._translations[key];

        if (!translation) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        // Replace parameters if they exist
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                translation = translation.replace(
                    new RegExp(`{${paramKey}}`, 'g'),
                    String(paramValue)
                );
            });
        }
        return translation;
    }

    public get supportedLanguages(): string[] {
        return SUPPORTED_LANGUAGES;
    }



}