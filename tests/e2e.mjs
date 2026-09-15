/**
 * Tests de bout en bout (Playwright).
 *
 * Prérequis : le serveur tourne (`npm run dev`) et la base est accessible.
 * Lancement : `npm run test:e2e`
 *
 * Ces tests vérifient ce que le brief exige de démontrer : un parcours complet
 * qui PERSISTE réellement en base, et une protection des accès qui tient même
 * quand on tape l'URL à la main.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

// Les tests modifient la base (onboarding, réservations, adhésions) :
// on repart d'un état connu à chaque exécution.
console.log("Réinitialisation de la base…");
execSync("npm run db:seed", { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" });
// Petite pause : laisse le serveur de dev reprendre la main après le seed.
await new Promise(r => setTimeout(r, 3000));
const BASE="http://localhost:3005/fr";   // préfixe de langue obligatoire
const b=await chromium.launch({channel:"chrome"});
const ctx=await b.newContext({viewport:{width:1280,height:900}});
let page=await ctx.newPage();
const consoleErrors=[];
page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
page.on("pageerror",e=>consoleErrors.push("pageerror: "+e.message));
let pass=0,fail=0;
async function step(name,fn){try{await fn();console.log("  PASS",name);pass++}catch(e){console.log("  FAIL",name,"->",e.message.split("\n")[0].slice(0,110));fail++}}
async function login(email){
  // Contexte neuf à chaque connexion : pas de cookie résiduel d'un autre
  // utilisateur, et /login n'est pas court-circuité par une session existante.
  if (page && !page.isClosed()) await page.context().close();
  const c = await b.newContext({viewport:{width:1280,height:900}});
  page = await c.newPage();
  page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
  page.on("pageerror",e=>consoleErrors.push("pageerror: "+e.message));
  await page.goto(BASE+"/login");
  await page.fill("#email",email);
  await page.fill("#password","Password123!");
  await Promise.all([page.waitForURL(u=>!u.pathname.endsWith("/login"),{timeout:60000}),page.click('button[type=submit]')]);
}

console.log("\n— Parcours NOUVEAU MEMBRE (onboarding) —");
await step("login compte non onboardé -> /onboarding",async()=>{
  await login("nouveau@clubsport.fr");
  if(!page.url().includes("/onboarding")) throw new Error("URL="+page.url());
});
await step("onboarding en 3 étapes + persistance",async()=>{
  await page.selectOption("#preferredSiteId",{index:1});
  await page.click('button:has-text("Continuer")');
  await page.fill("#phone","06 11 22 33 44");
  await page.click('button:has-text("Continuer")');
  await page.selectOption("#plan","premium");
  await page.click('button:has-text("Terminer")');
  try{
    await page.waitForFunction(()=>/^\/(fr|en)\/dashboard$/.test(location.pathname),null,{timeout:30000});
  }catch(e){
    const txt=await page.locator("body").innerText();
    const site=await page.evaluate(()=>document.querySelector("#preferredSiteId")?.value);
    console.log("    DEBUG url:",page.url());
    console.log("    DEBUG site choisi:",site);
    console.log("    DEBUG msg:",txt.match(/Corrigez l.étape[^\n]*|Site inconnu|Choisissez un site|invalide/)?.[0]??"aucun");
    throw e;
  }
});
await step("l'onboarding ne se rejoue pas",async()=>{
  await page.goto(BASE+"/onboarding");
  await page.waitForLoadState("networkidle");
  if(!page.url().includes("/dashboard")) throw new Error("URL="+page.url());
});
await step("réservation possible après onboarding",async()=>{
  await page.goto(BASE+"/sessions");
  await page.waitForLoadState("networkidle");
  const li=page.locator("li",{has:page.locator('button:has-text("Réserver")')}).first();
  const nom=(await li.innerText()).split("\n")[0];
  await li.locator('button:has-text("Réserver")').click();
  // La réservation est confirmée si elle est réellement persistée :
  // on la relit depuis /bookings plutôt que de guetter un message fugace.
  await page.waitForTimeout(4000);
  await page.goto(BASE+"/bookings");
  await page.waitForLoadState("networkidle");
  const txt=await page.locator("body").innerText();
  if(!txt.includes(nom)) throw new Error("réservation absente de /bookings: "+nom);
});
await step("la réservation survit au rechargement",async()=>{
  await page.goto(BASE+"/bookings");
  await page.waitForSelector('text=Réservée',{timeout:20000});
});
await step("annulation d'une réservation",async()=>{
  await page.goto(BASE+"/bookings");
  await page.waitForLoadState("networkidle");
  const avant=await page.locator('button:has-text("Annuler")').count();
  if(avant===0) throw new Error("aucune réservation annulable");
  await page.locator('button:has-text("Annuler")').first().click();
  await page.waitForTimeout(4000);
  await page.reload();
  await page.waitForLoadState("networkidle");
  const apres=await page.locator('button:has-text("Annuler")').count();
  if(apres>=avant) throw new Error(`annulation non persistée (${avant} -> ${apres})`);
});

console.log("\n— Parcours ADMIN —");
await step("login admin",async()=>{await login("admin@clubsport.fr")});
await step("accès back-office",async()=>{
  await page.goto(BASE+"/admin");
  await page.waitForSelector("text=ensemble",{timeout:20000});
});
await step("création d'une séance (CRUD)",async()=>{
  await page.goto(BASE+"/admin/sessions/new");
  await page.selectOption("#activityId",{index:1});
  await page.selectOption("#siteId",{index:1});
  await page.fill("#capacity","5");
  await Promise.all([page.waitForURL(/\/admin\/sessions\/[a-z0-9]+\?created=1/,{timeout:60000}),page.click('button:has-text("Créer la séance")')]);
});
await step("recherche de membres",async()=>{
  await page.goto(BASE+"/admin/members?q=julie");
  await page.waitForSelector("text=Bernard",{timeout:20000});
});
await step("changement de statut d'adhésion (persiste)",async()=>{
  await page.click('a:has-text("Julie")');
  await page.waitForSelector("text=Adhésion",{timeout:20000});
  await page.selectOption('select[name="status"]',"SUSPENDED");
  await page.click('form:has(select[name="status"]) button[type=submit]');
  await page.waitForSelector("text=Adhésion mise à jour",{timeout:30000});
});
await step("admin ne peut pas changer son propre rôle",async()=>{
  await page.goto(BASE+"/admin/members");
  await page.click('a:has-text("Amina")');
  await page.waitForSelector("text=Vous ne pouvez pas modifier votre propre rôle",{timeout:20000});
});

console.log("\n— Sécurité serveur —");
await step("membre suspendu ne peut plus réserver",async()=>{
  await login("membre@clubsport.fr");
  await page.goto(BASE+"/sessions");
  const btn=page.locator('button:has-text("Réserver")').first();
  if(await btn.count()===0) throw new Error("pas de bouton dispo");
  await btn.click();
  await page.waitForSelector("text=adhésion n'est pas active",{timeout:30000});
});

console.log("\n— Session invalide (régression ERR_TOO_MANY_REDIRECTS) —");
await step("cookie signé sans session en base : pas de boucle",async()=>{
  await login("membre@clubsport.fr");
  // Supprime les sessions en base SANS toucher au cookie du navigateur :
  // c'est ce que provoque un `db:seed` pendant qu'un onglet reste ouvert.
  execSync(`docker exec eemi-clubsport-db psql -U clubsport -d clubsport -c 'DELETE FROM "AuthSession";'`,{stdio:"ignore"});
  await page.goto(BASE+"/dashboard",{timeout:20000});   // boucle -> throw
  await page.waitForLoadState("networkidle");
  if(!page.url().includes("/login")) throw new Error("URL inattendue: "+page.url());
  if(await page.locator("#email").count()===0) throw new Error("formulaire de connexion absent");
  // Le cookie mort doit avoir été retiré par le proxy.
  const reste=(await page.context().cookies()).filter(c=>c.name==="clubsport_session");
  if(reste.length>0) throw new Error("cookie fantôme toujours présent");
});
await step("reconnexion possible après session invalidée",async()=>{
  await page.waitForSelector("#email",{timeout:20000});
  await page.fill("#email","membre@clubsport.fr");
  await page.fill("#password","Password123!");
  await Promise.all([page.waitForURL(u=>!u.pathname.endsWith("/login"),{timeout:60000}),page.click('button[type=submit]')]);
});

console.log("\n— Responsive —");
await step("mobile 390px sans débordement horizontal",async()=>{
  const m=await (await b.newContext()).newPage();
  await m.setViewportSize({width:390,height:844});
  for(const p of ["/","/activites","/tarifs","/login"]){
    await m.goto(BASE+p);
    await m.waitForLoadState("networkidle");
    const over=await m.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    if(over) throw new Error("débordement sur "+p);
  }
  await m.context().close();
});

console.log(`\nRÉSULTAT: ${pass} pass, ${fail} fail`);
console.log("ERREURS CONSOLE:",consoleErrors.length?consoleErrors.slice(0,4):"aucune");
await b.close();
