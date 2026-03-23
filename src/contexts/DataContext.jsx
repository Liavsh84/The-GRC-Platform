import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  initialGovernanceDocuments, initialComplianceFrameworks, initialRisks,
  initialAudits, initialThirdPartyRisks, initialMeetings, initialSettings,
  initialProjects,
} from '../data/initialData';
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

function makeSyncEffect(key, state, initialized) {
  // Returns [effect, deps] — used below to DRY up the sync effects
  return [key, state, initialized];
}

export const DataProvider = ({ children }) => {
  const [documents,       setDocuments]       = useState(null);
  const [frameworks,      setFrameworks]       = useState(null);
  const [risks,           setRisks]           = useState(null);
  const [audits,          setAudits]          = useState(null);
  const [thirdPartyRisks, setThirdPartyRisks] = useState(null);
  const [meetings,        setMeetings]        = useState(null);
  const [settings,        setSettings]        = useState(null);
  const [projects,        setProjects]        = useState(null);
  const [dataLoading,     setDataLoading]     = useState(true);
  const initialized = useRef(false);

  // ─── Load all data on mount ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [docs, fws, rks, auds, tprs, mtgs, stgs, projs] = await Promise.all([
        dbLoad('documents',       safeParseLocal('grc_documents')        ?? initialGovernanceDocuments),
        dbLoad('frameworks',      safeParseLocal('grc_frameworks')       ?? initialComplianceFrameworks),
        dbLoad('risks',           safeParseLocal('grc_risks')            ?? initialRisks),
        dbLoad('audits',          safeParseLocal('grc_audits')           ?? initialAudits),
        dbLoad('thirdPartyRisks', safeParseLocal('grc_third_party')      ?? initialThirdPartyRisks),
        dbLoad('meetings',        safeParseLocal('grc_meetings')         ?? initialMeetings),
        dbLoad('settings',        safeParseLocal('grc_settings')         ?? initialSettings),
        dbLoad('projects',        safeParseLocal('grc_projects')         ?? initialProjects),
      ]);
      setDocuments(docs);
      setFrameworks(fws);
      setRisks(rks);
      setAudits(auds);
      setThirdPartyRisks(tprs);
      setMeetings(mtgs);
      setSettings(stgs);
      setProjects(projs);
      setDataLoading(false);
      initialized.current = true;
    };
    init();
  }, []);

  // ─── Sync helpers ─────────────────────────────────────────────────────────
  const syncEffect = (key, localKey, state) => {
    if (!initialized.current || state === null) return;
    localStorage.setItem(localKey, JSON.stringify(state));
    const t = setTimeout(() => dbSave(key, state), 500);
    return t;
  };

  useEffect(() => {
    const t = syncEffect('documents', 'grc_documents', documents);
    return () => clearTimeout(t);
  }, [documents]);

  useEffect(() => {
    const t = syncEffect('frameworks', 'grc_frameworks', frameworks);
    return () => clearTimeout(t);
  }, [frameworks]);

  useEffect(() => {
    const t = syncEffect('risks', 'grc_risks', risks);
    return () => clearTimeout(t);
  }, [risks]);

  useEffect(() => {
    const t = syncEffect('audits', 'grc_audits', audits);
    return () => clearTimeout(t);
  }, [audits]);

  useEffect(() => {
    const t = syncEffect('thirdPartyRisks', 'grc_third_party', thirdPartyRisks);
    return () => clearTimeout(t);
  }, [thirdPartyRisks]);

  useEffect(() => {
    const t = syncEffect('meetings', 'grc_meetings', meetings);
    return () => clearTimeout(t);
  }, [meetings]);

  useEffect(() => {
    const t = syncEffect('settings', 'grc_settings', settings);
    return () => clearTimeout(t);
  }, [settings]);

  useEffect(() => {
    const t = syncEffect('projects', 'grc_projects', projects);
    return () => clearTimeout(t);
  }, [projects]);

  const today = () => new Date().toISOString().split('T')[0];

  // ─── Governance ──────────────────────────────────────────────────────────
  const addDocument = (doc) => {
    const n = { ...doc, id: Date.now().toString(), createdAt: today(), updatedAt: today() };
    setDocuments(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateDocument = (id, u) =>
    setDocuments(prev => (prev ?? []).map(d => d.id === id ? { ...d, ...u, updatedAt: today() } : d));
  const deleteDocument = (id) =>
    setDocuments(prev => (prev ?? []).filter(d => d.id !== id));

  // ─── Compliance ──────────────────────────────────────────────────────────
  const addFramework = (fw) => {
    const n = { ...fw, id: Date.now().toString(), addedAt: today(), controls: fw.controls || [] };
    setFrameworks(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateFramework = (id, u) =>
    setFrameworks(prev => (prev ?? []).map(f => f.id === id ? { ...f, ...u } : f));
  const deleteFramework = (id) =>
    setFrameworks(prev => (prev ?? []).filter(f => f.id !== id));

  const addControl = (frameworkId, control) => {
    const n = { ...control, id: Date.now().toString() };
    setFrameworks(prev => (prev ?? []).map(f =>
      f.id !== frameworkId ? f : { ...f, controls: [...f.controls, n] }
    ));
  };
  const updateControl = (frameworkId, controlId, u) =>
    setFrameworks(prev => (prev ?? []).map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.map(c => c.id === controlId ? { ...c, ...u } : c) };
    }));
  const deleteControl = (frameworkId, controlId) =>
    setFrameworks(prev => (prev ?? []).map(f => {
      if (f.id !== frameworkId) return f;
      return { ...f, controls: f.controls.filter(c => c.id !== controlId) };
    }));

  // ─── Risk Management ─────────────────────────────────────────────────────
  const addRisk = (risk) => {
    const n = { ...risk, id: Date.now().toString(), dateIdentified: today(), lastReview: today() };
    setRisks(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateRisk = (id, u) =>
    setRisks(prev => (prev ?? []).map(r => r.id === id ? { ...r, ...u, lastReview: today() } : r));
  const deleteRisk = (id) =>
    setRisks(prev => (prev ?? []).filter(r => r.id !== id));

  // ─── Audits ──────────────────────────────────────────────────────────────
  const addAudit = (audit) => {
    const n = { ...audit, id: Date.now().toString(), createdAt: today(), findings: audit.findings || [] };
    setAudits(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateAudit = (id, u) =>
    setAudits(prev => (prev ?? []).map(a => a.id === id ? { ...a, ...u } : a));
  const deleteAudit = (id) =>
    setAudits(prev => (prev ?? []).filter(a => a.id !== id));

  // ─── Third-Party Risk ─────────────────────────────────────────────────────
  const addThirdPartyRisk = (vendor) => {
    const n = { ...vendor, id: Date.now().toString() };
    setThirdPartyRisks(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateThirdPartyRisk = (id, u) =>
    setThirdPartyRisks(prev => (prev ?? []).map(v => v.id === id ? { ...v, ...u } : v));
  const deleteThirdPartyRisk = (id) =>
    setThirdPartyRisks(prev => (prev ?? []).filter(v => v.id !== id));

  // ─── Meetings ─────────────────────────────────────────────────────────────
  const addMeeting = (meeting) => {
    const n = {
      ...meeting, id: Date.now().toString(), createdAt: today(),
      attendees: meeting.attendees || [], agenda: meeting.agenda || [],
      decisions: meeting.decisions || [], actionItems: meeting.actionItems || [],
    };
    setMeetings(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateMeeting = (id, u) =>
    setMeetings(prev => (prev ?? []).map(m => m.id === id ? { ...m, ...u } : m));
  const deleteMeeting = (id) =>
    setMeetings(prev => (prev ?? []).filter(m => m.id !== id));

  // ─── Projects ─────────────────────────────────────────────────────────────
  const addProject = (project) => {
    const n = { ...project, id: Date.now().toString(), createdAt: today(), updatedAt: today(), tasks: project.tasks || [] };
    setProjects(prev => [...(prev ?? []), n]);
    return n;
  };
  const updateProject = (id, u) =>
    setProjects(prev => (prev ?? []).map(p => p.id === id ? { ...p, ...u, updatedAt: today() } : p));
  const deleteProject = (id) =>
    setProjects(prev => (prev ?? []).filter(p => p.id !== id));

  // ─── Settings ─────────────────────────────────────────────────────────────
  const updateSettings = (u) =>
    setSettings(prev => ({ ...(prev ?? initialSettings), ...u }));

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetToDefaults = async () => {
    setDocuments(initialGovernanceDocuments);
    setFrameworks(initialComplianceFrameworks);
    setRisks(initialRisks);
    setAudits(initialAudits);
    setThirdPartyRisks(initialThirdPartyRisks);
    setMeetings(initialMeetings);
    setSettings(initialSettings);
    setProjects(initialProjects);
  };

  return (
    <DataContext.Provider value={{
      documents:       documents       ?? [],
      frameworks:      frameworks      ?? [],
      risks:           risks           ?? [],
      audits:          audits          ?? [],
      thirdPartyRisks: thirdPartyRisks ?? [],
      meetings:        meetings        ?? [],
      settings:        settings        ?? initialSettings,
      projects:        projects        ?? [],
      dataLoading,
      addDocument,    updateDocument,    deleteDocument,
      addFramework,   updateFramework,   deleteFramework,
      addControl,     updateControl,     deleteControl,
      addRisk,        updateRisk,        deleteRisk,
      addAudit,       updateAudit,       deleteAudit,
      addThirdPartyRisk, updateThirdPartyRisk, deleteThirdPartyRisk,
      addMeeting,     updateMeeting,     deleteMeeting,
      addProject,     updateProject,     deleteProject,
      updateSettings,
      resetToDefaults,
    }}>
      {children}
    </DataContext.Provider>
  );
};
