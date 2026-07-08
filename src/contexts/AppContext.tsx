import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, DocumentType, SystemSetting, Json } from '@/types/database';

interface AppContextType {
  categories: Category[];
  documentTypes: DocumentType[];
  settings: Record<string, Json>;
  loading: boolean;
  refreshCategories: () => Promise<void>;
  refreshDocumentTypes: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  getSetting: (key: string) => Json | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [settings, setSettings] = useState<Record<string, Json>>({});
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const refreshDocumentTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setDocumentTypes(data || []);
    } catch (err) {
      console.error('Error fetching document types:', err);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('is_secret', false);

      if (error) throw error;
      const settingsMap: Record<string, Json> = {};
      (data || []).forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const getSetting = useCallback(
    (key: string) => settings[key],
    [settings],
  );

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        refreshCategories(),
        refreshDocumentTypes(),
        refreshSettings(),
      ]);
      setLoading(false);
    };

    loadInitialData();
  }, [refreshCategories, refreshDocumentTypes, refreshSettings]);

  const value: AppContextType = {
    categories,
    documentTypes,
    settings,
    loading,
    refreshCategories,
    refreshDocumentTypes,
    refreshSettings,
    getSetting,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new AppContextMustBeUsedWithinAppProvider();
  }
  return context;
}

class AppContextMustBeUsedWithinAppProvider extends Error {
  constructor() {
    super('useApp must be used within an AppProvider');
  }
}
