


import React, { useState } from 'react';
import { Language, AppSettings } from '../types';
import { UI_TEXT } from '../constants';

interface SettingsProps {
  lang: Language;
  onUpdateSettings: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

const Settings: React.FC<SettingsProps> = ({ lang, onUpdateSettings, currentSettings }) => {
  const t = UI_TEXT[lang];
  const [settings, setSettings] = useState<AppSettings>(currentSettings);

  const handleChange = (field: keyof AppSettings, value: string | number) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
  };

  const handleSave = () => {
      onUpdateSettings(settings);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.settings}</h2>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b dark:border-slate-700 pb-2">
          {t.integrations} & {t.financials}
        </h3>
        
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Poshta API Key</label>
            <input 
              type="password"
              value={settings.novaPoshtaApiKey}
              onChange={(e) => handleChange('novaPoshtaApiKey', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Used for TTN generation and warehouse lookup.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rozetka Delivery API Key</label>
            <input 
              type="password"
              value={settings.rozetkaApiKey}
              onChange={(e) => handleChange('rozetkaApiKey', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prom.ua API Key</label>
            <input 
              type="password"
              value={settings.promApiKey}
              onChange={(e) => handleChange('promApiKey', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.bankCommission}</label>
             <div className="flex items-center gap-2">
                 <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.bankCommission}
                    onChange={(e) => handleChange('bankCommission', parseFloat(e.target.value) || 0)}
                    className="w-32 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                 />
                 <span className="text-slate-500">%</span>
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deducted from gross profit.</p>
          </div>

          <div className="pt-4">
            <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
