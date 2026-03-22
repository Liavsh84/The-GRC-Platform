import { createContext, useContext, useState, useEffect } from 'react';
import { initialGovernanceDocuments, initialComplianceFrameworks, initialRisks } from '../data/initialData';

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export const DataProvider = ({ children }) => {
  const [documents, setDocuments] = useState(() => {
    const s = localStorage.getItem('grc_documents');
    return s ? JSON.parse(s) : initialGovernanceDocuments;
  });

  const [frameworks, setFrameworks] = useState(() => {
    const s = localStorage.getItem('grc_frameworks');
    return s ? JSON.parse(s) : initialComplianceFrameworks;
  });

  const [risks, setRisks] = useState(() => {
    const s = localStorage.getItem('grc_risks');
    return s ? JSON.parse(s) : initialRisks;
  });

  useEffect(() => { localStorage.setItem('grc_documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('grc_frameworks', JSON.stringify(frameworks)); }, [frameworks]);
  useEffect(() => { localStorage.setItem('grc_risks', JSON.stringify(risks)); }, [risks]);

  const today = () => new Date().toISOString().split('T')[0];

  // ─── Governance ─────────────────────────────────────────────────────────────
  const addDocument = (doc) => {
    const newDoc = { ...doc, id: Date.now().toString(), createdAt: today(), updatedAt: today() };
    setDocuments(prev => [...prev, newDoc]);
    return newDoc;
  };
  const updateDocument = (id, updates) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates, updatedAt: today() } : d));
  };
  const deleteDocument = (id) => setDocuments(prev => prev.filter(d => d.id !== id));

  // ─── Compliance ──────────────────────────────────────────────────────────────
  const addFramework = (fw) => {
    const newFw = { ...fw, id: Date.now().toString(), addedAt: today(), controls: fw.controls || [] };
    setFrameworks(prev => [...prev, newFw]);
    return newFw;
  };
  const updateFramework = (id, updates) => {
    setFrameworks(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };
  const deleteFramework = (id) => setFrameworks(prev => prev.filter(f => f.id !== id));

  const addControl = (frameworkId, control) => {
    const newControl = { ...control, id: Date.now().toString() };
    setFrameworks(prev => prev.map(f =>
      f.id !== frameworkId ? f : { ...f, controls: [...f.controls, newControl] }
    ));
  };
  const updateControl = (frameworkId, controlId, updates) => {
    setFrameworks(prev => prev.map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.map(c => c.id === controlId ? { ...c, ...updates } : c) };
    }));
  };
  const deleteControl = (frameworkId, controlId) => {
    setFrameworks(prev => prev.map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.filter(c => c.id !== controlId) };
    }));
  };

  // ─── Risk Management ────────────────────────────────────────────────────────
  const addRisk = (risk) => {
    const newRisk = { ...risk, id: Date.now().toString(), dateIdentified: today(), lastReview: today() };
    setRisks(prev => [...prev, newRisk]);
    return newRisk;
  };
  const updateRisk = (id, updates) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates, lastReview: today() } : r));
  };
  const deleteRisk = (id) => setRisks(prev => prev.filter(r => r.id !== id));

  const resetToDefaults = () => {
    localStorage.removeItem('grc_documents');
    localStorage.removeItem('grc_frameworks');
    localStorage.removeItem('grc_risks');
    setDocuments(initialGovernanceDocuments);
    setFrameworks(initialComplianceFrameworks);
    setRisks(initialRisks);
  };

  return (
    <DataContext.Provider value={{
      documents, addDocument, updateDocument, deleteDocument,
      frameworks, addFramework, updateFramework, deleteFramework,
      addControl, updateControl, deleteControl,
      risks, addRisk, updateRisk, deleteRisk,
      resetToDefaults,
    }}>
      {children}
    </DataContext.Provider>
  );
};
