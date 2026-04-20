'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';

// BUSINESS RULE [CDC-11.1]: Profil entreprise complet — zero saisie via SIRET

interface Address {
  line1: string;
  line2?: string;
  zip_code: string;
  city: string;
  country: string;
}

interface Dirigeant {
  nom: string;
  prenom: string;
  fonction: string;
}

interface Qualification {
  type: string;
  number: string;
  label: string;
  valid_until?: string;
}

interface FranchiseCheck {
  isOverThreshold: boolean;
  isOverMajore: boolean;
  thresholdCents: number;
  majoreCents: number;
  currentCents: number;
  percentUsed: number;
  alertLevel: 'ok' | 'warning' | 'danger' | 'exceeded';
  message: string;
}

interface TenantProfile {
  id: string;
  siret: string | null;
  siren: string | null;
  company_name: string;
  trade_name: string | null;
  legal_form: string;
  naf_code: string | null;
  naf_label: string | null;
  address: Address | null;
  tva_number: string | null;
  creation_date: string | null;
  capital_cents: number | null;
  rcs_city: string | null;
  rm_number: string | null;
  rm_city: string | null;
  convention_collective: string | null;
  code_idcc: string | null;
  dirigeants: Dirigeant[];
  effectif: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  iban: string | null;
  bic: string | null;
  tva_regime: string;
  current_year_revenue_cents: number;
  insurance_decennale_number: string | null;
  insurance_decennale_insurer: string | null;
  insurance_decennale_coverage: string | null;
  insurance_rc_pro_number: string | null;
  insurance_rc_pro_insurer: string | null;
  qualifications: Qualification[];
  franchise_check: FranchiseCheck | null;
  legal_mentions: string[];
  lookup_source?: string;
}

const LEGAL_FORM_LABELS: Record<string, string> = {
  auto_entrepreneur: 'Auto-entrepreneur (Micro-entreprise)',
  ei: 'Entreprise Individuelle (EI)',
  eirl: 'EIRL',
  eurl: 'EURL',
  sarl: 'SARL',
  sas: 'SAS',
  sasu: 'SASU',
  sa: 'SA',
  sci: 'SCI',
  scop: 'SCOP',
  other: 'Autre',
};

const TVA_REGIME_LABELS: Record<string, string> = {
  franchise_base: 'Franchise en base (TVA non applicable)',
  reel_simplifie: 'Reel simplifie',
  reel_normal: 'Reel normal',
  mini_reel: 'Mini-reel',
};

const QUALIFICATION_TYPES = [
  { value: 'qualibat', label: 'Qualibat' },
  { value: 'rge', label: 'RGE' },
  { value: 'qualifelec', label: 'Qualifelec' },
  { value: 'qualipv', label: 'QualiPV' },
  { value: 'qualibois', label: 'Qualibois' },
  { value: 'other', label: 'Autre' },
];

export default function SettingsProfilePage() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSiret, setLookupSiret] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [siret, setSiret] = useState('');
  const [siren, setSiren] = useState('');
  const [legalForm, setLegalForm] = useState('ei');
  const [nafCode, setNafCode] = useState('');
  const [nafLabel, setNafLabel] = useState('');
  const [tvaNumber, setTvaNumber] = useState('');
  const [tvaRegime, setTvaRegime] = useState('reel_simplifie');
  const [creationDate, setCreationDate] = useState('');
  const [capitalCents, setCapitalCents] = useState('');
  const [rcsCity, setRcsCity] = useState('');
  const [rmNumber, setRmNumber] = useState('');
  const [rmCity, setRmCity] = useState('');
  const [conventionCollective, setConventionCollective] = useState('');
  const [codeIdcc, setCodeIdcc] = useState('');
  const [effectif, setEffectif] = useState('');

  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCity, setAddressCity] = useState('');

  // Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');

  // Assurances
  const [insuranceDecennaleNumber, setInsuranceDecennaleNumber] = useState('');
  const [insuranceDecennaleInsurer, setInsuranceDecennaleInsurer] = useState('');
  const [insuranceDecennaleCoverage, setInsuranceDecennaleCoverage] = useState('');
  const [insuranceRcProNumber, setInsuranceRcProNumber] = useState('');
  const [insuranceRcProInsurer, setInsuranceRcProInsurer] = useState('');

  // Qualifications
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  // TVA verification
  const [tvaVerifying, setTvaVerifying] = useState(false);
  const [tvaVerified, setTvaVerified] = useState<boolean | null>(null);

  const populateForm = useCallback((p: TenantProfile) => {
    setCompanyName(p.company_name);
    setTradeName(p.trade_name ?? '');
    setSiret(p.siret ?? '');
    setSiren(p.siren ?? '');
    setLegalForm(p.legal_form);
    setNafCode(p.naf_code ?? '');
    setNafLabel(p.naf_label ?? '');
    setTvaNumber(p.tva_number ?? '');
    setTvaRegime(p.tva_regime);
    setCreationDate(p.creation_date ?? '');
    setCapitalCents(p.capital_cents ? (p.capital_cents / 100).toString() : '');
    setRcsCity(p.rcs_city ?? '');
    setRmNumber(p.rm_number ?? '');
    setRmCity(p.rm_city ?? '');
    setConventionCollective(p.convention_collective ?? '');
    setCodeIdcc(p.code_idcc ?? '');
    setEffectif(p.effectif?.toString() ?? '');
    setAddressLine1(p.address?.line1 ?? '');
    setAddressLine2(p.address?.line2 ?? '');
    setAddressZip(p.address?.zip_code ?? '');
    setAddressCity(p.address?.city ?? '');
    setEmail(p.email ?? '');
    setPhone(p.phone ?? '');
    setWebsite(p.website ?? '');
    setIban(p.iban ?? '');
    setBic(p.bic ?? '');
    setInsuranceDecennaleNumber(p.insurance_decennale_number ?? '');
    setInsuranceDecennaleInsurer(p.insurance_decennale_insurer ?? '');
    setInsuranceDecennaleCoverage(p.insurance_decennale_coverage ?? '');
    setInsuranceRcProNumber(p.insurance_rc_pro_number ?? '');
    setInsuranceRcProInsurer(p.insurance_rc_pro_insurer ?? '');
    setQualifications(p.qualifications ?? []);
    setLookupSiret(p.siret ?? '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.get<TenantProfile>('/api/tenant/profile');
      if (!cancelled && result.ok) {
        setProfile(result.value);
        populateForm(result.value);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [populateForm]);

  const handleLookupSiret = async () => {
    if (!lookupSiret.trim()) return;
    setLookupLoading(true);
    setErrorMsg('');

    const result = await api.post<TenantProfile>('/api/tenant/profile/lookup-siret', {
      siret: lookupSiret,
    });

    if (result.ok) {
      setProfile(result.value);
      populateForm(result.value);
      const source = result.value.lookup_source ?? 'inconnu';
      setSuccessMsg(`Profil pre-rempli depuis ${source === 'pappers' ? 'Pappers.fr' : source === 'sirene' ? 'INSEE SIRENE' : 'recherche-entreprises.api.gouv.fr'}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setErrorMsg(result.error.message ?? 'SIRET non trouve');
      setTimeout(() => setErrorMsg(''), 5000);
    }

    setLookupLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');

    const normalizedSiret = siret.replace(/\s/g, '');
    const normalizedSiren = siren.replace(/\s/g, '');

    const body: Record<string, unknown> = {
      company_name: companyName,
      trade_name: tradeName || undefined,
      siret: normalizedSiret || undefined,
      siren: normalizedSiren || undefined,
      legal_form: legalForm,
      naf_code: nafCode || undefined,
      naf_label: nafLabel || undefined,
      tva_number: tvaNumber || undefined,
      tva_regime: tvaRegime,
      creation_date: creationDate || undefined,
      capital_cents: capitalCents ? Math.round(parseFloat(capitalCents) * 100) : undefined,
      rcs_city: rcsCity || undefined,
      rm_number: rmNumber || undefined,
      rm_city: rmCity || undefined,
      convention_collective: conventionCollective || undefined,
      code_idcc: codeIdcc || undefined,
      effectif: effectif ? parseInt(effectif, 10) : undefined,
      address: {
        line1: addressLine1,
        line2: addressLine2 || undefined,
        zip_code: addressZip,
        city: addressCity,
        country: 'FR',
      },
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      iban: iban || undefined,
      bic: bic || undefined,
      insurance_decennale_number: insuranceDecennaleNumber || undefined,
      insurance_decennale_insurer: insuranceDecennaleInsurer || undefined,
      insurance_decennale_coverage: insuranceDecennaleCoverage || undefined,
      insurance_rc_pro_number: insuranceRcProNumber || undefined,
      insurance_rc_pro_insurer: insuranceRcProInsurer || undefined,
      qualifications: qualifications.filter((q) => q.number.trim() && q.label.trim()).length > 0
        ? qualifications.filter((q) => q.number.trim() && q.label.trim())
        : undefined,
    };

    const result = await api.put<TenantProfile>('/api/tenant/profile', body);

    if (result.ok) {
      setProfile(result.value);
      setSuccessMsg('Profil enregistre');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(result.error.message ?? 'Erreur lors de l\'enregistrement');
      setTimeout(() => setErrorMsg(''), 5000);
    }

    setSaving(false);
  };

  const handleVerifyTva = async () => {
    if (!tvaNumber.trim()) return;
    setTvaVerifying(true);
    setTvaVerified(null);

    const result = await api.post<{ valid: boolean }>('/api/tenant/profile/verify-tva', {
      tva_number: tvaNumber,
    });

    if (result.ok) {
      setTvaVerified(result.value.valid);
    } else {
      setTvaVerified(false);
    }

    setTvaVerifying(false);
  };

  const addQualification = () => {
    setQualifications([...qualifications, { type: 'qualibat', number: '', label: '', valid_until: '' }]);
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const updateQualification = (index: number, field: keyof Qualification, value: string) => {
    const updated = [...qualifications];
    updated[index] = { ...updated[index]!, [field]: value };
    setQualifications(updated);
  };

  // Show capital/RCS fields only for societes
  const showCapitalFields = ['eurl', 'sarl', 'sas', 'sasu', 'sa', 'sci', 'scop'].includes(legalForm);
  const showRmFields = ['auto_entrepreneur', 'ei', 'eirl'].includes(legalForm);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Profil entreprise</h1>
          <p className="text-sm text-gray-500 mt-1">
            Informations de votre entreprise pour les devis, factures et mentions légales.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{errorMsg}</div>
      )}

      {/* SIRET Lookup */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Recherche SIRET</h2>
          <p className="text-sm text-gray-500 mb-3">
            Entrez votre SIRET pour pré-remplir automatiquement toutes les informations.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ex: 890 246 390 00029"
                value={lookupSiret}
                onChange={(e) => setLookupSiret(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupSiret()}
              />
            </div>
            <Button onClick={handleLookupSiret} disabled={lookupLoading}>
              {lookupLoading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations generales */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Raison sociale *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Input label="Nom commercial" value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Si différent de la raison sociale" />
            <Input label="SIRET" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" />
            <Input label="SIREN" value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="9 chiffres" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Forme juridique</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
              >
                {Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Input label="Code NAF (APE)" value={nafCode} onChange={(e) => setNafCode(e.target.value)} placeholder="Ex: 43.21A" />
            <Input label="Libelle activite" value={nafLabel} onChange={(e) => setNafLabel(e.target.value)} className="md:col-span-2" />
            <Input label="Date de creation" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} placeholder="AAAA-MM-JJ" />
            <Input label="Effectif" value={effectif} onChange={(e) => setEffectif(e.target.value)} type="number" min="0" />
            <Input label="Convention collective" value={conventionCollective} onChange={(e) => setConventionCollective(e.target.value)} />
            <Input label="Code IDCC" value={codeIdcc} onChange={(e) => setCodeIdcc(e.target.value)} />
          </div>

          {showCapitalFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <Input label="Capital social (EUR)" value={capitalCents} onChange={(e) => setCapitalCents(e.target.value)} type="number" min="0" step="0.01" placeholder="Ex: 1000" />
              <Input label="Ville RCS" value={rcsCity} onChange={(e) => setRcsCity(e.target.value)} placeholder="Ex: Paris" />
            </div>
          )}

          {showRmFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <Input label="N° Repertoire des Metiers" value={rmNumber} onChange={(e) => setRmNumber(e.target.value)} />
              <Input label="Ville RM" value={rmCity} onChange={(e) => setRmCity(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dirigeants */}
      {profile?.dirigeants && profile.dirigeants.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Dirigeants</h2>
            <div className="space-y-2">
              {profile.dirigeants.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded text-sm">
                  <span className="font-medium">{d.prenom} {d.nom}</span>
                  <Badge>{d.fonction}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adresse */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse du siege</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Adresse ligne 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="md:col-span-2" />
            <Input label="Adresse ligne 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="md:col-span-2" />
            <Input label="Code postal" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} />
            <Input label="Ville" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* TVA */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Regime TVA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Regime TVA</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={tvaRegime}
                onChange={(e) => setTvaRegime(e.target.value)}
              >
                {Object.entries(TVA_REGIME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Input label="N° TVA intracommunautaire" value={tvaNumber} onChange={(e) => setTvaNumber(e.target.value)} placeholder="Ex: FR12345678901" />
              {tvaNumber && tvaRegime !== 'franchise_base' && (
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={handleVerifyTva}
                    disabled={tvaVerifying}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {tvaVerifying ? 'Verification...' : 'Verifier via VIES'}
                  </button>
                  {tvaVerified === true && <Badge variant="success">Valide</Badge>}
                  {tvaVerified === false && <Badge variant="error">Invalide</Badge>}
                </div>
              )}
            </div>
          </div>

          {tvaRegime === 'franchise_base' && (
            <div className="mt-4 p-3 rounded-md bg-blue-50 text-blue-700 text-sm">
              <strong>Franchise en base de TVA</strong> — Mention obligatoire sur vos factures :
              <br />&laquo; TVA non applicable, article 293 B du Code General des Impots &raquo;
            </div>
          )}

          {profile?.franchise_check && tvaRegime === 'franchise_base' && (
            <div className={`mt-3 p-3 rounded-md text-sm ${
              profile.franchise_check.alertLevel === 'ok' ? 'bg-green-50 text-green-700' :
              profile.franchise_check.alertLevel === 'warning' ? 'bg-yellow-50 text-yellow-700' :
              profile.franchise_check.alertLevel === 'danger' ? 'bg-orange-50 text-orange-700' :
              'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <strong>Seuil franchise en base</strong>
                <Badge variant={
                  profile.franchise_check.alertLevel === 'ok' ? 'success' :
                  profile.franchise_check.alertLevel === 'warning' ? 'warning' :
                  'error'
                }>
                  {profile.franchise_check.percentUsed}%
                </Badge>
              </div>
              {profile.franchise_check.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coordonnees</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Input label="Telephone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Site web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* Coordonnees bancaires */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coordonnees bancaires</h2>
          <p className="text-sm text-gray-500 mb-3">
            Affichees sur vos factures pour le reglement par virement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 ..." />
            <Input label="BIC" value={bic} onChange={(e) => setBic(e.target.value)} placeholder="BNPAFRPP" />
          </div>
        </CardContent>
      </Card>

      {/* Assurances */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assurances professionnelles</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Assurance decennale</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="N° police" value={insuranceDecennaleNumber} onChange={(e) => setInsuranceDecennaleNumber(e.target.value)} />
                <Input label="Assureur" value={insuranceDecennaleInsurer} onChange={(e) => setInsuranceDecennaleInsurer(e.target.value)} />
                <Input label="Zone de couverture" value={insuranceDecennaleCoverage} onChange={(e) => setInsuranceDecennaleCoverage(e.target.value)} placeholder="France entiere" />
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Responsabilite civile professionnelle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="N° police" value={insuranceRcProNumber} onChange={(e) => setInsuranceRcProNumber(e.target.value)} />
                <Input label="Assureur" value={insuranceRcProInsurer} onChange={(e) => setInsuranceRcProInsurer(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Qualifications et labels</h2>
            <Button variant="outline" onClick={addQualification}>Ajouter</Button>
          </div>

          {qualifications.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune qualification ajoutee (Qualibat, RGE, etc.)</p>
          ) : (
            <div className="space-y-3">
              {qualifications.map((q, i) => (
                <div key={i} className="flex items-end gap-2 p-3 border rounded">
                  <div className="w-32">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      value={q.type}
                      onChange={(e) => updateQualification(i, 'type', e.target.value)}
                    >
                      {QUALIFICATION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <Input label="N° certification" value={q.number} onChange={(e) => updateQualification(i, 'number', e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Input label="Libelle" value={q.label} onChange={(e) => updateQualification(i, 'label', e.target.value)} />
                  </div>
                  <div className="w-36">
                    <Input label="Valide jusqu'au" value={q.valid_until ?? ''} onChange={(e) => updateQualification(i, 'valid_until', e.target.value)} placeholder="AAAA-MM-JJ" />
                  </div>
                  <button
                    onClick={() => removeQualification(i)}
                    className="p-1.5 text-red-500 hover:text-red-700"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mentions legales auto-generees */}
      {profile?.legal_mentions && profile.legal_mentions.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Mentions legales (auto-generees)</h2>
            <p className="text-sm text-gray-500 mb-2">
              Ces mentions apparaitront automatiquement sur vos devis et factures.
            </p>
            <div className="p-3 bg-gray-50 rounded text-sm space-y-1">
              {profile.legal_mentions.map((m, i) => (
                <div key={i} className="text-gray-700">{m}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button at bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
        </Button>
      </div>
    </div>
  );
}
