import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initialGovernanceDocuments, initialComplianceFrameworks, initialRisks } from '../data/initialData';
import { dbLoad, dbSave } from '../lib/supabase';

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

function safeParseLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export const DataProvider = ({ children }) => {
  const [documents, setDocuments] = useState(null);
  const [frameworks, setFrameworks] = useState(null);
  const [risks, setRisks] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const initialized = useRef(false);

  // Load all data on mount
  useEffect(() => {
    const init = async () => {
      const [docs, fws, rks] = await Promise.all([
        dbLoad('documents', safeParseLocal('grc_documents') ?? initialGovernanceDocuments),
        dbLoad('frameworks', safeParseLocal('grc_frameworks') ?? initialComplianceFrameworks),
        dbLoad('risks',     safeParseLocal('grc_risks')      ?? initialRisks),
      ]);
      setDocuments(docs);
      setFrameworks(fws);
      setRisks(rks);
      setDataLoading(false);
      initialized.current = true;
    };
    init();
  }, []);

  // Sync each slice to Supabase + localStorage
  useEffect(() => {
    if (!initialized.current || documents === null) return;
    localStorage.setItem('grc_documents', JSON.stringify(documents));
    const t = setTimeout(() => dbSave('documents', documents), 500);
    return () => clearTimeout(t);
  }, [documents]);

  useEffect(() => {
    if (!initialized.current || frameworks === null) return;
    localStorage.setItem('grc_frameworks', JSON.stringify(frameworks));
    const t = setTimeout(() => dbSave('frameworks', frameworks), 500);
    return () => clearTimeout(t);
  }, [frameworks]);

  useEffect(() => {
    if (!initialized.current || risks === null) return;
    localStorage.setItem('grc_risks', JSON.stringify(risks));
    const t = setTimeout(() => dbSave('risks', risks), 500);
    return () => clearTimeout(t);
  }, [risks]);

  const today = () => new Date().toISOString().split('T')[0];

  // ─── Governance ──────────────────────────────────────────────────────────────
  const addDocument = (doc) => {
    const newDoc = { ...doc, id: Date.now().toString(), createdAt: today(), updatedAt: today() };
    setDocuments(prev => [...(prev ?? []), newDoc]);
    return newDoc;
  };
  const updateDocument = (id, updates) => {
    setDocuments(prev => (prev ?? []).map(d => d.id === id ? { ...d, ...updates, updatedAt: today() } : d));
  };
  const deleteDocument = (id) => setDocuments(prev => (prev ?? []).filter(d => d.id !== id));

  // ─── Compliance ──────────────────────────────────────────────────────────────
  const addFramework = (fw) => {
    const newFw = { ...fw, id: Date.now().toString(), addedAt: today(), controls: fw.controls || [] };
    setFrameworks(prev => [...(prev ?? []), newFw]);
    return newFw;
  };
  const updateFramework = (id, updates) => {
    setFrameworks(prev => (prev ?? []).map(f => f.id === id ? { ...f, ...updates } : f));
  };
  const deleteFramework = (id) => setFrameworks(prev => (prev ?? []).filter(f => f.id !== id));

  const addControl = (frameworkId, control) => {
    const newControl = { ...control, id: Date.now().toString() };
    setFrameworks(prev => (prev ?? []).map(f =>
      f.id !== frameworkId ? f : { ...f, controls: [...f.controls, newControl] }
    ));
  };
  const updateControl = (frameworkId, controlId, updates) => {
    setFrameworks(prev => (prev ?? []).map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.map(c => c.id === controlId ? { ...c, ...updates } : c) };
    }));
  };
  const deleteControl = (frameworkId, controlId) => {
    setFrameworks(prev => (prev ?? []).map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.filter(c => c.id !== controlId) };
    }));
  };

  // ─── Risk Management ─────────────────────────────────────────────────────────
  const addRisk = (risk) => {
    const newRisk = { ...risk, id: Date.now().toString(), dateIdentified: today(), lastReview: today() };
    setRisks(prev => [...(prev ?? []), newRisk]);
    return newRisk;
  };
  const updateRisk = (id, updates) => {
    setRisks(prev => (prev ?? []).map(r => r.id === id ? { ...r, ...updates, lastReview: today() } : r));
  };
  const deleteRisk = (id) => setRisks(prev => (prev ?? []).filter(r => r.id !== id));

  const resetToDefaults = async () => {
    setDocuments(initialGovernanceDocuments);
    setFrameworks(initialComplianceFrameworks);
    setRisks(initialRisks);
    await Promise.all([
      dbSave('documents', initialGovernanceDocuments),
      dbSave('frameworks', initialComplianceFrameworks),
      dbSave('risks', initialRisks),
    ]);
  };

  return (
    <DataContext.Provider value={{
      documents:  documents  ?? [],
      frameworks: frameworks ?? [],
      risks:      risks      ?? [],
      addDocument, updateDocument, deleteDocument,
      addFramework, updateFramework, deleteFramework,
      addControl, updateControl, deleteControl,
      addRisk, updateRisk, deleteRisk,
      resetToDefaults,
      dataLoading,
    }}>
      {children}
    </DataContext.Provider>
  );
};
