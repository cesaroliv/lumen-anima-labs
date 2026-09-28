(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports){module.exports=api;}
  else{root.QAEvidenceCore=api;}
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const SENSITIVE_RE=/(senha|password|passwd|token|secret|api[_ -]?key|cpf|cart[aã]o|card number|cvv|authorization\s*:|bearer\s+[a-z0-9._-]+)/i;
  const ACCESSIBILITY_RE=/(acessib|accessib|teclado|keyboard|foco|focus|aria-|screen reader|leitor de tela|contraste|contrast|zoom)/i;
  const SECURITY_RE=/(login|auth|autentica|autoriza|permission|permiss[aã]o|role|papel|token|session|sess[aã]o|security|seguran|idor|access control)/i;

  const baseRules=[
    ["title",10,12,"Título específico com ação + problema","Specific title with action + problem"],
    ["preconditions",8,8,"Precondições/estado inicial","Preconditions / initial state"],
    ["steps",18,30,"Passos reproduzíveis e detalhados","Reproducible, detailed steps"],
    ["expected",12,12,"Resultado esperado explícito","Explicit expected result"],
    ["actual",12,12,"Resultado atual explícito","Explicit actual result"],
    ["env",10,10,"Ambiente/versionamento","Environment / version"],
    ["sev",8,1,"Severidade selecionada","Severity selected"],
    ["why",10,20,"Justificativa de impacto/severidade","Impact / severity rationale"],
    ["evidence",12,15,"Evidência objetiva","Objective evidence"]
  ];

  function str(v){return String(v??"").trim();}
  function allText(input){
    return ["title","preconditions","steps","expected","actual","env","why","evidence","accessibility","security"]
      .map(k=>str(input?.[k])).join("\n");
  }

  function assess(input={}){
    let pts=0;
    const tips=[];
    const tipsEn=[];
    for(const [id,p,min,pt,en] of baseRules){
      const v=str(input[id]);
      if(v.length>=min) pts+=p;
      else {tips.push(pt);tipsEn.push(en);}
    }
    const evidence=str(input.evidence);
    const privacyWarning=SENSITIVE_RE.test(evidence);
    if(privacyWarning){
      pts=Math.max(0,pts-15);
      tips.unshift("Remova ou mascare possíveis dados sensíveis da evidência");
      tipsEn.unshift("Remove or redact possible sensitive data from the evidence");
    }
    const steps=str(input.steps);
    const numbered=/^\s*(\d+[.)]|[-*]\s)/m.test(steps) || /(passo|step)\s*\d+/i.test(steps);
    if(steps && !numbered){
      tips.push("Numere os passos para facilitar reprodução");
      tipsEn.push("Number the steps to make reproduction easier");
    }

    const text=allText(input);
    const accessibilityRelevant=ACCESSIBILITY_RE.test(text);
    const securityRelevant=SECURITY_RE.test(text);
    if(accessibilityRelevant && !str(input.accessibility)){
      tips.push("Registre a observação de acessibilidade relevante e a evidência usada");
      tipsEn.push("Record the relevant accessibility observation and supporting evidence");
    }
    if(securityRelevant && !str(input.security)){
      tips.push("Registre a observação defensiva de segurança/privacidade sem expor segredos");
      tipsEn.push("Record the defensive security/privacy observation without exposing secrets");
    }

    const coreReady=["title","steps","expected","actual"].every(k=>str(input[k]).length>=8);
    const completed=coreReady && pts>=70;
    return{
      pts,max:100,tips,tipsEn,privacyWarning,numbered,
      accessibilityRelevant,securityRelevant,completed
    };
  }

  function lines(input,lang){
    const a=assess(input);
    const pt=lang!=="en";
    const title=str(input.title)||(pt?"Relatório de bug":"Bug report");
    const severity=str(input.sev)||(pt?"Não definida":"Not set");
    const environment=str(input.env)||(pt?"Não informado":"Not set");
    const evidenceNames=Array.isArray(input.evidenceNames)?input.evidenceNames.filter(Boolean):[];
    const gaps=(pt?a.tips:a.tipsEn);
    return{
      a,title,severity,environment,evidenceNames,gaps,
      labels:pt?{
        score:"QA Evidence Score",severity:"Severidade",environment:"Ambiente",
        preconditions:"Precondições",steps:"Passos para reproduzir",expected:"Resultado esperado",
        actual:"Resultado atual",why:"Justificativa da severidade",evidence:"Evidência / observações",
        files:"Arquivos de evidência selecionados (nomes locais)",accessibility:"Observação de acessibilidade",
        security:"Observação defensiva de segurança/privacidade",gaps:"Lacunas de qualidade",
        none:"Nenhuma lacuna básica detectada."
      }:{
        score:"QA Evidence Score",severity:"Severity",environment:"Environment",
        preconditions:"Preconditions",steps:"Steps to reproduce",expected:"Expected",
        actual:"Actual",why:"Severity rationale",evidence:"Evidence / notes",
        files:"Selected evidence files (local names only)",accessibility:"Accessibility observation",
        security:"Defensive security/privacy observation",gaps:"Quality gaps",
        none:"No basic gaps detected."
      }
    };
  }

  function buildMarkdown(input={},lang="pt-BR"){
    const x=lines(input,lang);
    const v=k=>str(input[k]);
    return `# ${x.title}

**${x.labels.score}:** ${x.a.pts}/100
**${x.labels.severity}:** ${x.severity}
**${x.labels.environment}:** ${x.environment}

## ${x.labels.preconditions}
${v("preconditions")}

## ${x.labels.steps}
${v("steps")}

## ${x.labels.expected}
${v("expected")}

## ${x.labels.actual}
${v("actual")}

## ${x.labels.why}
${v("why")}

## ${x.labels.evidence}
${v("evidence")}

## ${x.labels.files}
${x.evidenceNames.length?x.evidenceNames.map(n=>"- "+n).join("\n"):"- —"}

## ${x.labels.accessibility}
${v("accessibility")||"—"}

## ${x.labels.security}
${v("security")||"—"}

## ${x.labels.gaps}
${x.gaps.length?x.gaps.map(g=>"- "+g).join("\n"):"- "+x.labels.none}
`;
  }

  function escapeHtml(v){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function buildPrintHtml(input={},lang="pt-BR"){
    const x=lines(input,lang);
    const mdSections=[
      [x.labels.preconditions,str(input.preconditions)],
      [x.labels.steps,str(input.steps)],
      [x.labels.expected,str(input.expected)],
      [x.labels.actual,str(input.actual)],
      [x.labels.why,str(input.why)],
      [x.labels.evidence,str(input.evidence)],
      [x.labels.files,x.evidenceNames.join("\n")||"—"],
      [x.labels.accessibility,str(input.accessibility)||"—"],
      [x.labels.security,str(input.security)||"—"],
      [x.labels.gaps,x.gaps.join("\n")||x.labels.none]
    ];
    const body=mdSections.map(([h,v])=>`<section><h2>${escapeHtml(h)}</h2><pre>${escapeHtml(v)}</pre></section>`).join("");
    return `<!doctype html><html lang="${lang==="en"?"en":"pt-BR"}"><head><meta charset="utf-8"><title>${escapeHtml(x.title)}</title><style>body{font:15px system-ui;max-width:900px;margin:36px auto;padding:0 20px;color:#172033}h1{font-size:28px}h2{font-size:17px;margin:24px 0 8px}pre{font:inherit;white-space:pre-wrap;border-left:3px solid #0d6b49;padding:8px 12px;background:#f6f8f7}.meta{display:flex;gap:18px;flex-wrap:wrap;padding:12px;background:#eef5f1}.warn{color:#9a381f}@media print{button{display:none}body{margin:0;max-width:none}}</style></head><body><h1>${escapeHtml(x.title)}</h1><div class="meta"><b>${escapeHtml(x.labels.score)}: ${x.a.pts}/100</b><span>${escapeHtml(x.labels.severity)}: ${escapeHtml(x.severity)}</span><span>${escapeHtml(x.labels.environment)}: ${escapeHtml(x.environment)}</span></div>${body}<p><small>Generated locally by QA Evidence Generator. The score measures report completeness; it does not prove the bug exists.</small></p><button onclick="window.print()">Print / Save as PDF</button></body></html>`;
  }

  return{assess,buildMarkdown,buildPrintHtml,escapeHtml};
});
