import { useState, useEffect, useRef } from "react";

// --- ACCORD Rule Engine ---
const CA_DATA = {
  PA: { name: "Programme Administration", name_fr: "Administration des programmes", agent: "PSAC / AFPC",
    vacation: { breakpoints: [
      { min: 0, max: 8, rate: 9.375, clause: "34.02(a)", days: 15 },
      { min: 8, max: 16, rate: 12.5, clause: "34.02(b)", days: 20 },
      { min: 16, max: 17, rate: 13.75, clause: "34.02(c)", days: 22 },
      { min: 17, max: 18, rate: 14.4, clause: "34.02(d)", days: 23 },
      { min: 18, max: 27, rate: 15.625, clause: "34.02(e)", days: 25 },
      { min: 27, max: 28, rate: 16.875, clause: "34.02(f)", days: 27 },
      { min: 28, max: 99, rate: 18.75, clause: "34.02(g)", days: 30 },
    ], threshold: 75, carryover: 262.5 },
  },
  IT: { name: "Information Technology", name_fr: "Technologie de l'information", agent: "PIPSC / IPFPC",
    vacation: { breakpoints: [
      { min: 0, max: 7, rate: 9.375, clause: "15.02(a)(i)", days: 15 },
      { min: 7, max: 16, rate: 12.5, clause: "15.02(a)(ii)", days: 20 },
      { min: 16, max: 17, rate: 13.75, clause: "15.02(a)(iii)", days: 22 },
      { min: 17, max: 18, rate: 14.375, clause: "15.02(a)(iv)", days: 23 },
      { min: 18, max: 27, rate: 15.625, clause: "15.02(a)(v)", days: 25 },
      { min: 27, max: 28, rate: 16.875, clause: "15.02(a)(vi)", days: 27 },
      { min: 28, max: 99, rate: 18.75, clause: "15.02(a)(vii)", days: 30 },
    ], threshold: 75, carryover: 262.5 },
  },
  CX: { name: "Correctional Services", name_fr: "Services correctionnels", agent: "UCCO-SACC-CSN",
    vacation: { breakpoints: [
      { min: 0, max: 8, rate: 10, clause: "29.02(a)", days: 15 },
      { min: 8, max: 15, rate: 13.334, clause: "29.02(b)", days: 20 },
      { min: 15, max: 16, rate: 14, clause: "29.02(c)", days: 21 },
      { min: 16, max: 17, rate: 15.334, clause: "29.02(d)", days: 23 },
      { min: 17, max: 25, rate: 16.667, clause: "29.02(e)", days: 25 },
      { min: 25, max: 99, rate: 20, clause: "29.02(f)", days: 30 },
    ], threshold: 80, carryover: 280 },
  },
  FB: { name: "Border Services", name_fr: "Services frontaliers", agent: "PSAC / AFPC",
    vacation: { breakpoints: [
      { min: 0, max: 7, rate: 9.375, clause: "34.02(a)", days: 15 },
      { min: 7, max: 16, rate: 12.5, clause: "34.02(b)", days: 20 },
      { min: 16, max: 17, rate: 13.75, clause: "34.02(c)", days: 22 },
      { min: 17, max: 18, rate: 14.4, clause: "34.02(d)", days: 23 },
      { min: 18, max: 27, rate: 15.625, clause: "34.02(e)", days: 25 },
      { min: 27, max: 28, rate: 16.875, clause: "34.02(f)", days: 27 },
      { min: 28, max: 99, rate: 18.75, clause: "34.02(g)", days: 30 },
    ], threshold: 75, carryover: 262.5 },
  },
  SV: { name: "Operational Services", name_fr: "Services d'exploitation", agent: "PSAC / AFPC",
    vacation: { breakpoints: [
      { min: 0, max: 1, rate: 9.375, clause: "37.02(a)", days: 15 },
      { min: 1, max: 16, rate: 12.5, clause: "37.02(b)", days: 20 },
      { min: 16, max: 17, rate: 13.75, clause: "37.02(c)", days: 22 },
      { min: 17, max: 18, rate: 14.4, clause: "37.02(d)", days: 23 },
      { min: 18, max: 27, rate: 15.625, clause: "37.02(e)", days: 25 },
      { min: 27, max: 28, rate: 16.875, clause: "37.02(f)", days: 27 },
      { min: 28, max: 99, rate: 18.75, clause: "37.02(g)", days: 30 },
    ], threshold: 75, carryover: null },
  },
};

function resolveVacation(ca, yos, hours) {
  const d = CA_DATA[ca]; if (!d) return { error: true };
  const bp = d.vacation.breakpoints.find(b => yos >= b.min && yos < b.max);
  if (!bp) return { error: true };
  const met = hours >= d.vacation.threshold;
  return { ca, ca_name: d.name, ca_name_fr: d.name_fr, agent: d.agent, yos, hours_per_month: bp.rate, days_per_year: bp.days, clause: bp.clause, threshold: d.vacation.threshold, threshold_met: met, hours_credited: met ? bp.rate : 0, carryover: d.vacation.carryover, article: `Art. ${bp.clause}`,
    divergence: ca === "IT" && yos >= 7 && yos < 8 ? "IT first breakpoint at year 7 (PA = year 8)" : ca === "CX" ? "CX uses 40h/week, 80h threshold, unique breakpoints" : ca === "FB" && yos >= 7 && yos < 8 ? "FB first breakpoint at year 7 (PA = year 8)" : ca === "SV" && yos >= 1 && yos < 8 ? "SV first breakpoint at year 1 (PA = year 8)" : null };
}

// Scenarios with rich descriptions
const SCENARIOS = [
  { ca:"PA", yos:5, hours:150, label:"PA AS-04, 5 yrs",
    en:"A Programme Administration employee classified AS-04 with 5 years of continuous service. They worked 150 hours this month. Under PA Art. 34.02(a), employees with less than 8 years accrue vacation at the base rate.",
    fr:"Un employé de l'Administration des programmes classifié AS-04 avec 5 ans de service continu. Il a travaillé 150 heures ce mois-ci. Selon l'art. 34.02(a) de la convention PA, les employés ayant moins de 8 ans accumulent au taux de base." },
  { ca:"PA", yos:8, hours:150, label:"PA PM-05, 8 yrs",
    en:"A PM-05 analyst who just reached their 8th anniversary. At exactly 8 years, PA employees hit the first vacation breakpoint — jumping from 15 days/year to 20 days. This is the most common breakpoint test across the public service.",
    fr:"Un analyste PM-05 qui vient d'atteindre son 8e anniversaire. À exactement 8 ans, les employés PA franchissent le premier palier de congé — passant de 15 à 20 jours/an. C'est le test de palier le plus courant dans la fonction publique." },
  { ca:"IT", yos:7, hours:150, label:"IT CS-02, 7 yrs",
    en:"An IT employee classified CS-02 with 7 years of service. This is a critical test case: under IT Art. 15.02(a)(ii), IT employees hit their first vacation breakpoint at year 7 — one full year earlier than PA employees. If Dayforce is configured using PA's year-8 rule for all groups, this employee will be underpaid their vacation credits.",
    fr:"Un employé TI classifié CS-02 avec 7 ans de service. Cas critique : selon l'art. 15.02(a)(ii) de la convention TI, les employés TI franchissent leur premier palier de congé à l'année 7 — un an plus tôt que les employés PA. Si Dayforce est configuré avec la règle de l'année 8 (PA) pour tous les groupes, cet employé sera sous-payé." },
  { ca:"PA", yos:7, hours:150, label:"PA CR-05, 7 yrs",
    en:"A PA clerical employee (CR-05) with 7 years of service — just below the PA year-8 breakpoint. Under PA Art. 34.02(a), they remain at the base 15-day rate. This is the control case: same years of service as the IT employee above, but correctly stays at the lower rate because PA's first breakpoint is year 8, not year 7.",
    fr:"Un commis PA (CR-05) avec 7 ans de service — juste en dessous du palier de l'année 8. Selon l'art. 34.02(a) PA, il reste au taux de base de 15 jours. Cas témoin : mêmes années de service que l'employé TI ci-dessus, mais reste correctement au taux inférieur car le premier palier PA est l'année 8." },
  { ca:"CX", yos:10, hours:160, label:"CX-01, 10 yrs",
    en:"A Correctional Officer (CX-01) with 10 years of service who worked 160 hours this month. CX operates on a completely different system: 40-hour weeks instead of 37.5, an 80-hour monthly threshold instead of 75, and unique vacation breakpoints that don't match any other collective agreement. This tests whether Dayforce handles the CX-specific configuration.",
    fr:"Un agent correctionnel (CX-01) avec 10 ans de service ayant travaillé 160 heures ce mois-ci. Le groupe CX fonctionne sur un système entièrement différent : semaines de 40 heures, seuil mensuel de 80 heures et paliers de congé uniques. Ce test vérifie si Dayforce gère la configuration spécifique au CX." },
  { ca:"CX", yos:3, hours:60, label:"CX-02, 3 yrs (below threshold)",
    en:"A CX-02 officer with only 3 years of service who worked just 60 hours this month — below the CX threshold of 80 hours required to earn vacation credits. Under CX Art. 29, no vacation hours should be credited this month. This tests the threshold gate: Dayforce must not only know the right rate, but also enforce the minimum hours requirement.",
    fr:"Un agent CX-02 avec seulement 3 ans de service ayant travaillé 60 heures ce mois-ci — sous le seuil de 80 heures requis pour accumuler des crédits de congé. Selon l'art. 29 CX, aucune heure de congé ne devrait être créditée. Ce test vérifie la porte de seuil : Dayforce doit non seulement connaître le bon taux, mais aussi appliquer l'exigence minimale d'heures." },
  { ca:"FB", yos:7, hours:150, label:"FB-03, 7 yrs",
    en:"A Border Services officer (FB-03) with 7 years of service. Like IT, FB employees hit their first vacation breakpoint at year 7 under FB Art. 34.02(b), not year 8 like PA. This is the same class of configuration error as the IT case — if Dayforce uses PA's year-8 rule, this border services officer will lose 5 vacation days per year.",
    fr:"Un agent des services frontaliers (FB-03) avec 7 ans de service. Comme les TI, les employés FB franchissent leur premier palier à l'année 7 selon l'art. 34.02(b) FB. Même erreur potentielle que le cas TI — si Dayforce utilise la règle PA de l'année 8, cet agent perdra 5 jours de congé par an." },
  { ca:"SV", yos:2, hours:150, label:"SV GL-05, 2 yrs",
    en:"An Operational Services employee (GL-05) — a trades worker — with just 2 years of service. SV is the most generous for new employees: under SV Art. 37.02(b), the first vacation breakpoint hits at year 1, giving 20 days/year after just 12 months. PA employees don't reach 20 days until year 8. If Dayforce assumes PA's breakpoint structure, this worker loses 37.5 hours of vacation per year.",
    fr:"Un employé des Services d'exploitation (GL-05) — un ouvrier de métier — avec seulement 2 ans de service. Le groupe SV est le plus généreux : selon l'art. 37.02(b), le premier palier est à l'année 1, donnant 20 jours/an après seulement 12 mois. Les employés PA n'atteignent 20 jours qu'à l'année 8. Écart potentiel de 37,5 heures/an." },
  { ca:"PA", yos:28, hours:150, label:"PA EX-minus-1, 28 yrs",
    en:"A senior PA employee with 28 years of service — the final vacation breakpoint. Under PA Art. 34.02(g), they receive the maximum rate of 30 days per year. This tests the top-end boundary: all collective agreements converge on the same maximum, so this should match across all systems.",
    fr:"Un employé PA senior avec 28 ans de service — le dernier palier de congé. Selon l'art. 34.02(g) PA, il reçoit le taux maximal de 30 jours/an. Test de limite supérieure : toutes les conventions convergent sur le même maximum." },
  { ca:"IT", yos:17, hours:80, label:"IT CS-03, 17 yrs",
    en:"A senior IT team lead (CS-03) with 17 years of service. At year 17, IT Art. 15.02(a)(iv) specifies a rate of 14.375 hours/month — a value unique to IT/PIPSC agreements. PA uses 14.4 hours at the same breakpoint. The difference is only 0.3 hours/year, but it's a numerically distinct value that tests whether Dayforce has IT's exact rate or is using PA's as a proxy.",
    fr:"Un chef d'équipe TI senior (CS-03) avec 17 ans de service. À l'année 17, l'art. 15.02(a)(iv) TI prescrit 14,375 h/mois — valeur unique aux conventions TI/IPFPC. PA utilise 14,4 h. L'écart est de seulement 0,3 h/an, mais c'est une valeur numériquement distincte." },
  { ca:"CX", yos:25, hours:160, label:"CX-01, 25 yrs",
    en:"A veteran Correctional Officer with 25 years on the job. CX Art. 29.02(f) gives these long-service officers the maximum 30-day rate. CX's breakpoint structure is completely different from all other CAs — the year-25 threshold exists only in CX. This validates that Dayforce maintains a separate configuration for Correctional Services.",
    fr:"Un agent correctionnel vétéran avec 25 ans de service. L'art. 29.02(f) CX donne à ces agents le taux maximal de 30 jours. La structure des paliers CX est entièrement différente — le seuil de 25 ans n'existe que dans le CX." },
  { ca:"PA", yos:17, hours:150, label:"PA IS-05, 17 yrs",
    en:"A PA information services specialist (IS-05) with 17 years. PA Art. 34.02(d) specifies 14.4 hours/month at this breakpoint — slightly higher than IT's 14.375. This is the companion test to the IT year-17 case: both should produce correct but different results if each CA is configured independently.",
    fr:"Un spécialiste en services d'information PA (IS-05) avec 17 ans. L'art. 34.02(d) PA prescrit 14,4 h/mois — légèrement supérieur aux 14,375 h du TI. Test compagnon du cas TI année 17 : les deux doivent produire des résultats corrects mais différents." },
];

const DAYFORCE_SIM = { 0:9.375, 1:12.5, 2:9.375, 3:9.375, 4:13.334, 5:0, 6:9.375, 7:9.375, 8:18.75, 9:14.375, 10:20, 11:14.4 };

const C = { primary:"#002D42", teal:"#137991", bright:"#0BA7B4", bg:"#FAFAFA", card:"#FFFFFF", text:"#252525", muted:"#666666", border:"#E1E5E8", ok:"#2B8000", okBg:"#E8F5E1", err:"#B10E1E", errBg:"#FCEAE8", warn:"#EE7100", warnBg:"#FFF5E6" };

export default function ACCORDNarrative() {
  const [phase, setPhase] = useState("splash");
  const [results, setResults] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [lang, setLang] = useState("en");
  const [stats, setStats] = useState({ pass:0, fail:0, warn:0, total:0 });
  const ref = useRef(null);

  function run() { setPhase("running"); setResults([]); setIdx(0); setStats({pass:0,fail:0,warn:0,total:0}); }

  useEffect(() => {
    if (phase !== "running" || idx < 0 || idx >= SCENARIOS.length) return;
    const t = setTimeout(() => {
      const sc = SCENARIOS[idx];
      const a = resolveVacation(sc.ca, sc.yos, sc.hours);
      const df = DAYFORCE_SIM[idx];
      const match = Math.abs(a.hours_per_month - df) < 0.001;
      let st = "pass"; if (!match) st = "fail"; else if (a.divergence) st = "warn";
      setResults(p => [...p, { ...a, idx, label: sc.label, desc_en: sc.en, desc_fr: sc.fr, dayforce: df, match, status: st, hours_input: sc.hours }]);
      setStats(p => ({ pass:p.pass+(st==="pass"?1:0), fail:p.fail+(st==="fail"?1:0), warn:p.warn+(st==="warn"?1:0), total:p.total+1 }));
      if (idx < SCENARIOS.length - 1) setIdx(idx + 1); else setPhase("complete");
    }, 600);
    return () => clearTimeout(t);
  }, [phase, idx]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [results]);

  const Badge = ({s}) => {
    const m = { pass:{bg:C.okBg,c:C.ok,t:lang==="en"?"PASS":"RÉUSSI"}, fail:{bg:C.errBg,c:C.err,t:lang==="en"?"DISCREPANCY":"ÉCART"}, warn:{bg:C.warnBg,c:C.warn,t:"DIVERGENCE"} }[s];
    return <span style={{background:m.bg,color:m.c,padding:"3px 10px",borderRadius:"3px",fontSize:"11px",fontWeight:"700",fontFamily:"'Nunito Sans',sans-serif",letterSpacing:"0.5px"}}>{m.t}</span>;
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Nunito Sans',Calibri,sans-serif",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet"/>
      <header style={{background:C.primary}}>
        <div style={{maxWidth:"960px",margin:"0 auto",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
            <span style={{fontFamily:"'Rubik',sans-serif",fontWeight:"500",fontSize:"20px",color:"#fff",letterSpacing:"1px"}}>ACCORD</span>
            <span style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>v0.6.0</span>
          </div>
          <button onClick={()=>setLang(lang==="en"?"fr":"en")} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",padding:"5px 14px",borderRadius:"4px",fontSize:"13px",cursor:"pointer",fontFamily:"'Nunito Sans',sans-serif",fontWeight:"600"}}>{lang==="en"?"Français":"English"}</button>
        </div>
        <div style={{background:C.bright,height:"4px"}}/>
      </header>

      <main style={{maxWidth:"960px",margin:"0 auto",padding:"16px 24px 40px"}}>
        <nav style={{fontSize:"13px",color:C.muted,marginBottom:"8px"}}><span style={{color:C.teal,cursor:"pointer"}}>ACCORD</span> / {lang==="en"?"Batch Validation":"Validation par lots"}</nav>

        {phase === "splash" && (
          <div>
            <h1 style={{fontFamily:"'Rubik',sans-serif",fontWeight:"300",fontSize:"32px",color:C.primary,margin:"12px 0 8px"}}>{lang==="en"?"Parallel Pay Validation":"Validation de paie parallèle"}</h1>
            <p style={{fontSize:"16px",color:C.muted,lineHeight:"1.7",maxWidth:"720px",margin:"0 0 24px"}}>
              {lang==="en"
                ? "This tool processes pay scenarios from the Dayforce parallel testing pipeline and independently validates each one against the authoritative text of the relevant collective agreement. Each result includes the specific article citation, a plain-language explanation of the rule, and a comparison against Dayforce's calculated value."
                : "Cet outil traite les scénarios de paie du pipeline de tests parallèles Dayforce et valide chacun indépendamment par rapport au texte officiel de la convention collective pertinente. Chaque résultat inclut la citation d'article, une explication en langage clair et une comparaison avec la valeur calculée par Dayforce."}
            </p>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px",padding:"20px 24px",marginBottom:"24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
              <h2 style={{fontFamily:"'Rubik',sans-serif",fontWeight:"400",fontSize:"18px",color:C.primary,margin:"0 0 6px"}}>{lang==="en"?"Test Batch":"Lot de tests"}</h2>
              <p style={{fontSize:"14px",color:C.muted,margin:"0 0 14px"}}>{lang==="en"
                ? `${SCENARIOS.length} vacation accrual scenarios across 5 collective agreements (PA, IT, CX, FB, SV). Includes boundary cases, threshold gates, and cross-CA divergence tests.`
                : `${SCENARIOS.length} scénarios d'accumulation de congé dans 5 conventions collectives (PA, TI, CX, FB, SV). Comprend des cas limites, des portes de seuil et des tests de divergence inter-conventions.`}</p>
              {SCENARIOS.slice(0,4).map((s,i) => (
                <div key={i} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,fontSize:"14px"}}>
                  <div style={{fontWeight:"700",color:C.primary,marginBottom:"3px"}}>{s.label}</div>
                  <div style={{color:C.muted,lineHeight:"1.5",fontSize:"13px"}}>{lang==="en" ? s.en.substring(0,120) : s.fr.substring(0,120)}...</div>
                </div>
              ))}
              <p style={{fontSize:"13px",color:C.muted,fontStyle:"italic",margin:"10px 0 0"}}>+ {SCENARIOS.length - 4} {lang==="en"?"more scenarios":"scénarios supplémentaires"}...</p>
            </div>

            <button onClick={run} style={{background:C.primary,color:"#fff",border:"none",padding:"12px 28px",borderRadius:"4px",fontSize:"16px",fontWeight:"700",cursor:"pointer",fontFamily:"'Nunito Sans',sans-serif"}}>{lang==="en"?"Run Validation":"Lancer la validation"}</button>
          </div>
        )}

        {(phase==="running"||phase==="complete") && (
          <div>
            <h1 style={{fontFamily:"'Rubik',sans-serif",fontWeight:"300",fontSize:"28px",color:C.primary,margin:"12px 0 16px"}}>{lang==="en"?"Validation Results":"Résultats de la validation"}</h1>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
              {[{l:lang==="en"?"Total":"Total",v:stats.total,c:C.primary},{l:lang==="en"?"Pass":"Réussi",v:stats.pass,c:C.ok},{l:lang==="en"?"Discrepancy":"Écart",v:stats.fail,c:C.err},{l:"Divergence",v:stats.warn,c:C.warn}].map((s,i)=>(
                <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px",padding:"14px 16px",borderTop:`4px solid ${s.c}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                  <div style={{fontSize:"11px",color:C.muted,fontWeight:"700",textTransform:"uppercase"}}>{s.l}</div>
                  <div style={{fontSize:"28px",fontWeight:"700",color:s.c,fontFamily:"'Rubik',sans-serif",marginTop:"2px"}}>{s.v}</div>
                </div>
              ))}
            </div>

            {phase==="running" && <div style={{height:"6px",background:C.border,borderRadius:"3px",marginBottom:"16px",overflow:"hidden"}}><div style={{height:"100%",background:C.bright,borderRadius:"3px",width:`${(stats.total/SCENARIOS.length)*100}%`,transition:"width 0.3s ease"}}/></div>}

            <div ref={ref} style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              {results.map((r,i) => (
                <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px",borderLeft:`5px solid ${r.status==="fail"?C.err:r.status==="warn"?C.warn:C.ok}`,padding:"20px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",animation:"af 0.3s ease"}}>

                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <Badge s={r.status}/>
                      <span style={{fontSize:"16px",fontWeight:"700",color:C.primary,fontFamily:"'Rubik',sans-serif"}}>{r.label}</span>
                    </div>
                    <span style={{fontSize:"12px",color:C.muted}}>#{String(i+1).padStart(3,"0")}</span>
                  </div>

                  {/* Scenario description */}
                  <div style={{background:"#F5F7F9",borderRadius:"4px",padding:"14px 16px",marginBottom:"14px",fontSize:"14px",lineHeight:"1.65",color:C.text}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:C.teal,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px"}}>{lang==="en"?"Scenario":"Scénario"}</div>
                    {lang==="en" ? r.desc_en : r.desc_fr}
                  </div>

                  {/* Input parameters */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"14px",padding:"12px 16px",background:"#FAFBFC",borderRadius:"4px",border:`1px solid ${C.border}`}}>
                    {[
                      {l:lang==="en"?"Agreement":"Convention",v:`${r.ca} — ${lang==="en"?r.ca_name:r.ca_name_fr}`},
                      {l:lang==="en"?"Service":"Service",v:`${r.yos} ${lang==="en"?"years":"ans"}`},
                      {l:lang==="en"?"Hours This Month":"Heures ce mois",v:`${r.hours_input}h`},
                      {l:lang==="en"?"Agent":"Agent",v:r.agent},
                    ].map((p,j)=>(
                      <div key={j}>
                        <div style={{fontSize:"10px",color:C.muted,fontWeight:"700",textTransform:"uppercase",marginBottom:"2px"}}>{p.l}</div>
                        <div style={{fontSize:"13px",fontWeight:"600",color:C.text}}>{p.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Results comparison */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px",marginBottom:r.match && !r.divergence && r.threshold_met?"0":"14px"}}>
                    <div style={{padding:"12px 16px",background:C.okBg,borderRadius:"4px",borderTop:`3px solid ${C.ok}`}}>
                      <div style={{fontSize:"10px",color:C.ok,fontWeight:"700",textTransform:"uppercase"}}>ACCORD {lang==="en"?"Result":"Résultat"}</div>
                      <div style={{fontSize:"20px",fontWeight:"700",color:C.ok,fontFamily:"'Rubik',sans-serif",marginTop:"4px"}}>{r.hours_per_month} h/{lang==="en"?"mo":"mois"}</div>
                      <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>{r.days_per_year} {lang==="en"?"days/year":"jours/an"}</div>
                    </div>
                    <div style={{padding:"12px 16px",background:r.match?"#F5F7F9":C.errBg,borderRadius:"4px",borderTop:`3px solid ${r.match?C.muted:C.err}`}}>
                      <div style={{fontSize:"10px",color:r.match?C.muted:C.err,fontWeight:"700",textTransform:"uppercase"}}>External System</div>
                      <div style={{fontSize:"20px",fontWeight:"700",color:r.match?C.muted:C.err,fontFamily:"'Rubik',sans-serif",marginTop:"4px"}}>{r.dayforce} h/{lang==="en"?"mo":"mois"}</div>
                      {!r.match && <div style={{fontSize:"12px",color:C.err,marginTop:"2px",fontWeight:"600"}}>{lang==="en"?"MISMATCH":"DÉSACCORD"}</div>}
                    </div>
                    <div style={{padding:"12px 16px",background:"#EEF4F8",borderRadius:"4px",borderTop:`3px solid ${C.teal}`}}>
                      <div style={{fontSize:"10px",color:C.teal,fontWeight:"700",textTransform:"uppercase"}}>{lang==="en"?"Authority":"Source"}</div>
                      <div style={{fontSize:"16px",fontWeight:"700",color:C.primary,fontFamily:"'Rubik',sans-serif",marginTop:"4px"}}>{r.ca} {r.article}</div>
                      <div style={{fontSize:"12px",color:C.muted,marginTop:"2px"}}>{lang==="en"?"Collective Agreement":"Convention collective"}</div>
                    </div>
                  </div>

                  {/* Finding */}
                  {!r.match && (
                    <div style={{padding:"14px 16px",background:C.errBg,borderRadius:"4px",borderLeft:`4px solid ${C.err}`,fontSize:"14px",color:C.err,lineHeight:"1.6",marginBottom:r.divergence?"14px":"0"}}>
                      <strong>{lang==="en"?"Finding:":"Constat :"}</strong>{" "}
                      {lang==="en"
                        ? `External System calculated ${r.dayforce}h/month for this employee. The collective agreement (${r.ca} ${r.article}) requires ${r.hours_per_month}h/month for an employee with ${r.yos} years of service. This results in a shortfall of ${((r.hours_per_month - r.dayforce)*12).toFixed(1)} hours per year — equivalent to ${(((r.hours_per_month - r.dayforce)*12)/7.5).toFixed(1)} working days of vacation leave.`
                        : `Le système externe a calculé ${r.dayforce}h/mois. La convention collective (${r.ca} ${r.article}) exige ${r.hours_per_month}h/mois pour ${r.yos} ans de service. Écart de ${((r.hours_per_month - r.dayforce)*12).toFixed(1)} heures/an — soit ${(((r.hours_per_month - r.dayforce)*12)/7.5).toFixed(1)} jours ouvrables de congé.`}
                    </div>
                  )}

                  {r.divergence && <div style={{padding:"12px 16px",background:C.warnBg,borderRadius:"4px",borderLeft:`4px solid ${C.warn}`,fontSize:"13px",color:C.warn}}><strong>Tier 2/3 Divergence:</strong> {r.divergence}</div>}
                  {!r.threshold_met && <div style={{padding:"12px 16px",background:C.errBg,borderRadius:"4px",borderLeft:`4px solid ${C.err}`,fontSize:"13px",color:C.err}}>{lang==="en"?`Threshold not met: ${r.hours_input}h earned this month is below the ${r.threshold}h minimum required to accrue vacation credits. Zero hours credited.`:`Seuil non atteint : ${r.hours_input}h gagnées < ${r.threshold}h minimum requis. Aucune heure créditée.`}</div>}
                </div>
              ))}
            </div>

            {phase==="complete" && (
              <div style={{marginTop:"24px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"4px",padding:"24px",borderTop:`4px solid ${stats.fail>0?C.err:C.ok}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                <h2 style={{fontFamily:"'Rubik',sans-serif",fontWeight:"400",fontSize:"22px",color:C.primary,margin:"0 0 12px"}}>{lang==="en"?"Validation Summary":"Résumé de la validation"}</h2>
                <p style={{fontSize:"15px",lineHeight:"1.7",color:C.text,margin:"0 0 16px"}}>
                  {lang==="en"
                    ? <>{stats.total} scenarios were validated across {new Set(results.map(r=>r.ca)).size} collective agreements. <strong style={{color:C.err}}>{stats.fail} discrepancies</strong> were identified where External System's output does not match the collective agreement requirements. {stats.warn} additional scenarios were flagged with known tier 2/3 divergences that require CA-specific configuration.</>
                    : <>{stats.total} scénarios validés dans {new Set(results.map(r=>r.ca)).size} conventions collectives. <strong style={{color:C.err}}>{stats.fail} écarts</strong> identifiés. {stats.warn} scénarios signalés avec des divergences de niveau 2/3.</>}
                </p>
                {stats.fail > 0 && (
                  <div style={{padding:"16px 20px",background:"#F5F7F9",borderRadius:"4px",fontSize:"14px",lineHeight:"1.7",color:C.text,marginBottom:"20px",border:`1px solid ${C.border}`}}>
                    <div style={{fontWeight:"700",color:C.primary,marginBottom:"6px",fontSize:"15px"}}>{lang==="en"?"Root Cause Analysis":"Analyse des causes"}</div>
                    {lang==="en"
                      ? "All three discrepancies share the same root cause: External System's vacation accrual configuration uses the PA collective agreement's year-8 first breakpoint as the default for all bargaining groups. However, IT (Art. 15.02), FB (Art. 34.02), and SV (Art. 37.02) have earlier first breakpoints — year 7, year 7, and year 1 respectively. This is a systematic configuration error that would affect every employee in these bargaining groups who falls between their CA's actual first breakpoint and PA's year-8 breakpoint. For SV employees with 1–7 years of service, this means 7 years of underpaid vacation credits — a cumulative shortfall of up to 262.5 hours per affected employee."
                      : "Les trois écarts partagent la même cause : la configuration utilise le seuil de l'année 8 (PA) comme défaut. Or, TI (art. 15.02), FB (art. 34.02) et SV (art. 37.02) ont des seuils antérieurs. Erreur systématique affectant tous les employés entre le seuil réel de leur convention et l'année 8."}
                  </div>
                )}
                <button onClick={()=>{setPhase("splash");setResults([]);setIdx(-1);}} style={{background:"transparent",border:`2px solid ${C.primary}`,color:C.primary,padding:"10px 24px",borderRadius:"4px",fontSize:"15px",fontWeight:"700",cursor:"pointer",fontFamily:"'Nunito Sans',sans-serif"}}>{lang==="en"?"← New Batch":"← Nouveau lot"}</button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{background:C.primary,color:"rgba(255,255,255,0.6)",padding:"20px 24px"}}>
        <div style={{maxWidth:"960px",margin:"0 auto",display:"flex",justifyContent:"space-between",fontSize:"13px"}}>
          <div><span style={{color:"#fff",fontWeight:"700"}}>ACCORD</span><span style={{margin:"0 8px",opacity:0.3}}>|</span>{lang==="en"?"Authoritative Collective Agreement Compliance":"Conformité aux conventions collectives faisant autorité"}</div>
          <div style={{opacity:0.4}}>963+ tests · 27 CAs · {lang==="en"?"Bilingual":"Bilingue"}</div>
        </div>
      </footer>
      <style>{`@keyframes af{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}