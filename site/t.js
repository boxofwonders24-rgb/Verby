// Verby lightweight page view tracker — logs to Supabase, no cookies, no PII
(function(){
  if(navigator.userAgent.match(/bot|crawl|spider|slurp|facebook|twitter/i))return;
  var d={path:location.pathname,referrer:document.referrer||null,ua:navigator.userAgent};
  fetch('https://xixefdlmnfpyxopzotne.supabase.co/rest/v1/page_views',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeGVmZGxtbmZweXhvcHpvdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODc1MjMsImV4cCI6MjA4OTQ2MzUyM30.QIPct51hKESfJa0X8yylXFJj_F-5fV_1zwsvz6DPxOk',
      'Prefer':'return=minimal'
    },
    body:JSON.stringify(d)
  }).catch(function(){});
})();
