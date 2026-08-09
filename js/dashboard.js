import { auth, db } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUid = null;
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
let currentMes = meses[new Date().getMonth()];
const currentYear = new Date().getFullYear();
const currentMonthIndex = new Date().getMonth(); 

let categoryViewMode = 'month';

let typeChartInstance = null;
let chartQ1 = null;
let chartQ2 = null;
let categoryWheelChartInstance = null;

let categoryMonthData = {};
let categoryYtdData = {};
let monthTotalSpentVal = 0;
let ytdTotalSpentVal = 0;

const categoryColors = {
    'Restaurante': '#f97316',
    'Supermercado': '#10b981',
    'Vivienda': '#6366f1',
    'Automóvil': '#06b6d4',
    'Banco': '#64748b',
    'Préstamos': '#ef4444',
    'Combustible': '#eab308',
    'Escuela/Universidad': '#8b5cf6',
    'Servicios Públicos': '#3b82f6',
    'Chucherías/Compras': '#ec4899',
    'Ropa': '#14b8a6',
    'Gastos Médicos': '#e11d48',
    'Otros': '#94a3b8'
};

function getCssVar(varName, fallback) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
}

async function initDashboard() {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) { window.location.href = "index.html"; return; }
    currentUid = user.uid;

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            const navName = document.getElementById('nav-name');
            const navAvatar = document.getElementById('nav-avatar');
            if (navName) navName.textContent = data.name || "Usuario";
            if (navAvatar) navAvatar.textContent = data.avatar || "👨‍💻";
        }
    } catch (err) {
        console.error("Error al cargar usuario:", err);
    }

    initMobileMenu();
    initMonthTabs();
    initCategoryToggle();
    loadMonthData();
    loadYTDData();
}

initDashboard();

window.addEventListener('themeChanged', () => {
    loadMonthData();
    loadYTDData();
});

function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (toggleBtn && mobileMenu) {
        toggleBtn.onclick = () => {
            mobileMenu.classList.toggle('hidden');
        };
    }

    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    if (btnLogoutMobile) btnLogoutMobile.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

function initMonthTabs() {
    const container = document.getElementById('month-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    const lblMes = document.getElementById('lbl-current-mes');
    const lblCatToggleMonth = document.getElementById('lbl-cat-toggle-month');
    const lblViewMes = document.getElementById('view-mes-title');

    if (lblMes) lblMes.textContent = currentMes;
    if (lblCatToggleMonth) lblCatToggleMonth.textContent = currentMes;
    if (lblViewMes) lblViewMes.textContent = currentMes;

    meses.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m;
        btn.className = `px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition text-xs sm:text-sm ${m === currentMes ? 'theme-accent-btn shadow-md' : 'theme-btn-secondary'}`;
        btn.onclick = () => { 
            currentMes = m; 
            initMonthTabs(); 
            loadMonthData(); 
        };
        container.appendChild(btn);
    });
}

function initCategoryToggle() {
    const btnMonth = document.getElementById('btn-cat-view-month');
    const btnYtd = document.getElementById('btn-cat-view-ytd');

    if (btnMonth) {
        btnMonth.onclick = () => {
            categoryViewMode = 'month';
            btnMonth.className = "flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold theme-accent-btn";
            if (btnYtd) btnYtd.className = "flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold theme-btn-secondary";
            renderInteractiveCategoryWheel();
        };
    }

    if (btnYtd) {
        btnYtd.onclick = () => {
            categoryViewMode = 'ytd';
            btnYtd.className = "flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold theme-accent-btn";
            if (btnMonth) btnMonth.className = "flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold theme-btn-secondary";
            renderInteractiveCategoryWheel();
        };
    }
}

const inputSalarioMensual = document.getElementById('in-salario-mensual');
if (inputSalarioMensual) {
    inputSalarioMensual.oninput = (e) => {
        const mensual = parseFloat(e.target.value) || 0;
        const quincenal = mensual / 2;
        const q1Sal = document.getElementById('q1-salario');
        const q2Sal = document.getElementById('q2-salario');
        if (q1Sal) q1Sal.value = quincenal ? quincenal.toFixed(2) : '';
        if (q2Sal) q2Sal.value = quincenal ? quincenal.toFixed(2) : '';
        calcularNetoQuincenal();
    };
}

function calcularNetoQuincenal() {
    const elLey = document.getElementById('in-ley-salario');
    const aplicaLeySalario = elLey ? elLey.checked : true;

    const q1Salario = parseFloat(document.getElementById('q1-salario')?.value) || 0;
    const q1Ing2 = parseFloat(document.getElementById('q1-ingreso2')?.value) || 0;
    const q1Ing2Ley = document.getElementById('q1-ing2-ley')?.checked || false;
    const q1Ing3 = parseFloat(document.getElementById('q1-ingreso3')?.value) || 0;
    const q1Ing3Ley = document.getElementById('q1-ing3-ley')?.checked || false;
    const q1Acreedores = parseFloat(document.getElementById('q1-acreedores')?.value) || 0;
    const q1Isr = parseFloat(document.getElementById('q1-isr')?.value) || 0;
    const incluyeDecimo = document.getElementById('in-decimo')?.checked || false;

    const q2Salario = parseFloat(document.getElementById('q2-salario')?.value) || 0;
    const q2Ing2 = parseFloat(document.getElementById('q2-ingreso2')?.value) || 0;
    const q2Ing2Ley = document.getElementById('q2-ing2-ley')?.checked || false;
    const q2Ing3 = parseFloat(document.getElementById('q2-ingreso3')?.value) || 0;
    const q2Ing3Ley = document.getElementById('q2-ing3-ley')?.checked || false;
    const q2Acreedores = parseFloat(document.getElementById('q2-acreedores')?.value) || 0;
    const q2Isr = parseFloat(document.getElementById('q2-isr')?.value) || 0;

    const q1BrutoSubject = (aplicaLeySalario ? q1Salario : 0) + (q1Ing2Ley ? q1Ing2 : 0) + (q1Ing3Ley ? q1Ing3 : 0);
    const q1BrutoTotal = q1Salario + q1Ing2 + q1Ing3;
    
    const q1SsRegular = q1BrutoSubject * 0.0975;
    const q1SeRegular = q1BrutoSubject * 0.0125;
    const netoQ1Regular = q1BrutoTotal - (q1SsRegular + q1SeRegular + q1Isr + q1Acreedores);

    let decimoBruto = 0, decimoCss = 0, decimoNeto = 0;
    const boxDecimoEdit = document.getElementById('decimo-breakdown-edit');

    if (incluyeDecimo) {
        if (boxDecimoEdit) boxDecimoEdit.classList.remove('hidden');
        const salarioMensual = q1Salario * 2;
        decimoBruto = salarioMensual / 3; 
        decimoCss = aplicaLeySalario ? (decimoBruto * 0.0725) : 0; 
        decimoNeto = decimoBruto - decimoCss; 

        const eBruto = document.getElementById('e-decimo-bruto');
        const eCss = document.getElementById('e-decimo-css');
        const eNeto = document.getElementById('e-decimo-neto');

        if (eBruto) eBruto.textContent = `$${decimoBruto.toFixed(2)}`;
        if (eCss) eCss.textContent = `-$${decimoCss.toFixed(2)}`;
        if (eNeto) eNeto.textContent = `$${decimoNeto.toFixed(2)}`;
    } else {
        if (boxDecimoEdit) boxDecimoEdit.classList.add('hidden');
    }

    const netoQ1Total = netoQ1Regular + decimoNeto;

    const q2BrutoSubject = (aplicaLeySalario ? q2Salario : 0) + (q2Ing2Ley ? q2Ing2 : 0) + (q2Ing3Ley ? q2Ing3 : 0);
    const q2BrutoTotal = q2Salario + q2Ing2 + q2Ing3;

    const q2Ss = q2BrutoSubject * 0.0975;
    const q2Se = q2BrutoSubject * 0.0125; 
    const netoQ2 = q2BrutoTotal - (q2Ss + q2Se + q2Isr + q2Acreedores);

    const netoTotalMensual = netoQ1Total + netoQ2;

    const nQ1 = document.getElementById('neto-q1');
    const nQ2 = document.getElementById('neto-q2');
    const cNeto = document.getElementById('calc-neto');

    if (nQ1) nQ1.textContent = `$${netoQ1Total.toFixed(2)}`;
    if (nQ2) nQ2.textContent = `$${netoQ2.toFixed(2)}`;
    if (cNeto) cNeto.textContent = `$${netoTotalMensual.toFixed(2)}`;

    return {
        netoTotal: netoTotalMensual,
        q1Data: { salario: q1Salario, ing2: q1Ing2, ing2Ley: q1Ing2Ley, ing3: q1Ing3, ing3Ley: q1Ing3Ley, acreedores: q1Acreedores, isr: q1Isr, ss: q1SsRegular, se: q1SeRegular, incluyeDecimo, decimoBruto, decimoCss, decimoNeto, neto: netoQ1Total },
        q2Data: { salario: q2Salario, ing2: q2Ing2, ing2Ley: q2Ing2Ley, ing3: q2Ing3, ing3Ley: q2Ing3Ley, acreedores: q2Acreedores, isr: q2Isr, ss: q2Ss, se: q2Se, neto: netoQ2 },
        aplicaLeySalario
    };
}

document.querySelectorAll('#q1-salario, #q1-ingreso2, #q1-ingreso3, #q1-ing2-ley, #q1-ing3-ley, #q1-acreedores, #q1-isr, #q2-salario, #q2-ingreso2, #q2-ing2-ley, #q2-ingreso3, #q2-ing3-ley, #q2-acreedores, #q2-isr, #in-decimo, #in-ley-salario').forEach(el => {
    el.oninput = calcularNetoQuincenal;
    el.onchange = calcularNetoQuincenal;
});

function setBudgetMode(isEdit) {
    const editMode = document.getElementById('budget-edit-mode');
    const viewMode = document.getElementById('budget-view-mode');
    if (editMode) editMode.classList.toggle('hidden', !isEdit);
    if (viewMode) viewMode.classList.toggle('hidden', isEdit);
}

const btnEditBudget = document.getElementById('btn-edit-budget');
if (btnEditBudget) btnEditBudget.onclick = () => setBudgetMode(true);

const saveBudgetBtn = document.getElementById('save-budget');
if (saveBudgetBtn) {
    saveBudgetBtn.onclick = async () => {
        const calculo = calcularNetoQuincenal();
        const mensualVal = parseFloat(document.getElementById('in-salario-mensual')?.value) || 0;

        await setDoc(doc(db, "presupuestos", `${currentUid}_${currentMes}`), { 
            monto: calculo.netoTotal, 
            salarioMensual: mensualVal,
            aplicaLeySalario: calculo.aplicaLeySalario,
            q1: calculo.q1Data,
            q2: calculo.q2Data,
            mes: currentMes, 
            year: currentYear,
            userId: currentUid 
        });

        alert(`Planilla de ${currentMes} guardada con éxito.`);
        loadMonthData();
    };
}

async function loadMonthData() {
    const lblMes = document.getElementById('lbl-current-mes');
    const lblCatToggleMonth = document.getElementById('lbl-cat-toggle-month');
    const lblViewMes = document.getElementById('view-mes-title');
    if (lblMes) lblMes.textContent = currentMes;
    if (lblCatToggleMonth) lblCatToggleMonth.textContent = currentMes;
    if (lblViewMes) lblViewMes.textContent = currentMes;

    const bDoc = await getDoc(doc(db, "presupuestos", `${currentUid}_${currentMes}`));
    let budgetQ1 = 0, budgetQ2 = 0, budgetTotal = 0;

    if (bDoc.exists()) {
        const bData = bDoc.data();
        budgetTotal = bData.monto || 0;
        budgetQ1 = bData.q1 ? bData.q1.neto : (budgetTotal / 2);
        budgetQ2 = bData.q2 ? bData.q2.neto : (budgetTotal / 2);
        
        const inSalario = document.getElementById('in-salario-mensual');
        const inLey = document.getElementById('in-ley-salario');
        if (inSalario) inSalario.value = bData.salarioMensual || '';
        if (inLey) inLey.checked = bData.aplicaLeySalario !== undefined ? bData.aplicaLeySalario : true;

        if (bData.q1) {
            const elSal = document.getElementById('q1-salario');
            const elIng2 = document.getElementById('q1-ingreso2');
            const elIng2L = document.getElementById('q1-ing2-ley');
            const elIng3 = document.getElementById('q1-ingreso3');
            const elIng3L = document.getElementById('q1-ing3-ley');
            const elAcr = document.getElementById('q1-acreedores');
            const elIsr = document.getElementById('q1-isr');
            const elDec = document.getElementById('in-decimo');

            if (elSal) elSal.value = bData.q1.salario || '';
            if (elIng2) elIng2.value = bData.q1.ing2 || '';
            if (elIng2L) elIng2L.checked = bData.q1.ing2Ley || false;
            if (elIng3) elIng3.value = bData.q1.ing3 || '';
            if (elIng3L) elIng3L.checked = bData.q1.ing3Ley || false;
            if (elAcr) elAcr.value = bData.q1.acreedores || '';
            if (elIsr) elIsr.value = bData.q1.isr || '';
            if (elDec) elDec.checked = bData.q1.incluyeDecimo || false;
        }
        if (bData.q2) {
            const elSal = document.getElementById('q2-salario');
            const elIng2 = document.getElementById('q2-ingreso2');
            const elIng2L = document.getElementById('q2-ing2-ley');
            const elIng3 = document.getElementById('q2-ingreso3');
            const elIng3L = document.getElementById('q2-ing3-ley');
            const elAcr = document.getElementById('q2-acreedores');
            const elIsr = document.getElementById('q2-isr');

            if (elSal) elSal.value = bData.q2.salario || '';
            if (elIng2) elIng2.value = bData.q2.ing2 || '';
            if (elIng2L) elIng2L.checked = bData.q2.ing2Ley || false;
            if (elIng3) elIng3.value = bData.q2.ing3 || '';
            if (elIng3L) elIng3L.checked = bData.q2.ing3Ley || false;
            if (elAcr) elAcr.value = bData.q2.acreedores || '';
            if (elIsr) elIsr.value = bData.q2.isr || '';
        }

        if (bData.q1 && bData.q2) {
            const vQ1Sal = document.getElementById('v-q1-salario');
            const vQ1Ss = document.getElementById('v-q1-ss');
            const vQ1Se = document.getElementById('v-q1-se');
            const vQ1Isr = document.getElementById('v-q1-isr');
            const vQ1Acr = document.getElementById('v-q1-acreedores');
            const vQ1Neto = document.getElementById('v-q1-neto');

            if (vQ1Sal) vQ1Sal.textContent = `$${(bData.q1.salario || 0).toFixed(2)}`;
            
            const boxIng2Q1 = document.getElementById('v-q1-ing2-box');
            if (bData.q1.ing2 > 0) {
                if (boxIng2Q1) boxIng2Q1.classList.remove('hidden');
                const vQ1Ing2 = document.getElementById('v-q1-ing2');
                if (vQ1Ing2) vQ1Ing2.textContent = `+$${bData.q1.ing2.toFixed(2)}`;
            } else if (boxIng2Q1) boxIng2Q1.classList.add('hidden');

            const boxIng3Q1 = document.getElementById('v-q1-ing3-box');
            if (bData.q1.ing3 > 0) {
                if (boxIng3Q1) boxIng3Q1.classList.remove('hidden');
                const vQ1Ing3 = document.getElementById('v-q1-ing3');
                if (vQ1Ing3) vQ1Ing3.textContent = `+$${bData.q1.ing3.toFixed(2)}`;
            } else if (boxIng3Q1) boxIng3Q1.classList.add('hidden');

            if (vQ1Ss) vQ1Ss.textContent = `-$${(bData.q1.ss || 0).toFixed(2)}`;
            if (vQ1Se) vQ1Se.textContent = `-$${(bData.q1.se || 0).toFixed(2)}`;
            if (vQ1Isr) vQ1Isr.textContent = `-$${(bData.q1.isr || 0).toFixed(2)}`;
            if (vQ1Acr) vQ1Acr.textContent = `-$${(bData.q1.acreedores || 0).toFixed(2)}`;
            if (vQ1Neto) vQ1Neto.textContent = `$${(bData.q1.neto || 0).toFixed(2)}`;

            const vDecimoBox = document.getElementById('v-container-decimo');
            if (bData.q1.incluyeDecimo) {
                if (vDecimoBox) vDecimoBox.classList.remove('hidden');
                const vDBruto = document.getElementById('v-q1-decimo-bruto');
                const vDCss = document.getElementById('v-q1-decimo-css');
                const vDNeto = document.getElementById('v-q1-decimo-neto');
                if (vDBruto) vDBruto.textContent = `$${(bData.q1.decimoBruto || 0).toFixed(2)}`;
                if (vDCss) vDCss.textContent = `-$${(bData.q1.decimoCss || 0).toFixed(2)}`;
                if (vDNeto) vDNeto.textContent = `$${(bData.q1.decimoNeto || 0).toFixed(2)}`;
            } else if (vDecimoBox) {
                vDecimoBox.classList.add('hidden');
            }

            const vQ2Sal = document.getElementById('v-q2-salario');
            const vQ2Ss = document.getElementById('v-q2-ss');
            const vQ2Se = document.getElementById('v-q2-se');
            const vQ2Isr = document.getElementById('v-q2-isr');
            const vQ2Acr = document.getElementById('v-q2-acreedores');
            const vQ2Neto = document.getElementById('v-q2-neto');
            const vNetoTot = document.getElementById('v-neto-total');

            if (vQ2Sal) vQ2Sal.textContent = `$${(bData.q2.salario || 0).toFixed(2)}`;
            
            const boxIng2Q2 = document.getElementById('v-q2-ing2-box');
            if (bData.q2.ing2 > 0) {
                if (boxIng2Q2) boxIng2Q2.classList.remove('hidden');
                const vQ2Ing2 = document.getElementById('v-q2-ing2');
                if (vQ2Ing2) vQ2Ing2.textContent = `+$${bData.q2.ing2.toFixed(2)}`;
            } else if (boxIng2Q2) boxIng2Q2.classList.add('hidden');

            const boxIng3Q2 = document.getElementById('v-q2-ing3-box');
            if (bData.q2.ing3 > 0) {
                if (boxIng3Q2) boxIng3Q2.classList.remove('hidden');
                const vQ2Ing3 = document.getElementById('v-q2-ing3');
                if (vQ2Ing3) vQ2Ing3.textContent = `+$${bData.q2.ing3.toFixed(2)}`;
            } else if (boxIng3Q2) boxIng3Q2.classList.add('hidden');

            if (vQ2Ss) vQ2Ss.textContent = `-$${(bData.q2.ss || 0).toFixed(2)}`;
            if (vQ2Se) vQ2Se.textContent = `-$${(bData.q2.se || 0).toFixed(2)}`;
            if (vQ2Isr) vQ2Isr.textContent = `-$${(bData.q2.isr || 0).toFixed(2)}`;
            if (vQ2Acr) vQ2Acr.textContent = `-$${(bData.q2.acreedores || 0).toFixed(2)}`;
            if (vQ2Neto) vQ2Neto.textContent = `$${(bData.q2.neto || 0).toFixed(2)}`;

            if (vNetoTot) vNetoTot.textContent = `$${budgetTotal.toFixed(2)}`;
        }

        setBudgetMode(false);
    } else {
        setBudgetMode(true);
    }

    calcularNetoQuincenal();

    const q = query(
        collection(db, "gastos"), 
        where("userId", "==", currentUid), 
        where("mes", "==", currentMes),
        where("year", "==", currentYear)
    );
    
    onSnapshot(q, (snapshot) => {
        let totalSpent = 0, spentQ1 = 0, spentQ2 = 0, fixedSpent = 0, extraSpent = 0;
        const categoryTotalsMonth = {};
        const catQ1 = {};
        const catQ2 = {};

        snapshot.forEach(d => {
            const data = d.data();
            totalSpent += data.monto;

            const catName = data.categoria || 'Otros';
            categoryTotalsMonth[catName] = (categoryTotalsMonth[catName] || 0) + data.monto;

            if (data.tipo === 'fijo') fixedSpent += data.monto;
            else extraSpent += data.monto;

            if (data.quincena === '2da Quincena') {
                spentQ2 += data.monto;
                catQ2[catName] = (catQ2[catName] || 0) + data.monto;
            } else {
                spentQ1 += data.monto;
                catQ1[catName] = (catQ1[catName] || 0) + data.monto;
            }
        });

        monthTotalSpentVal = totalSpent;
        categoryMonthData = categoryTotalsMonth;

        const cMonthTot = document.getElementById('current-month-total');
        const mFijo = document.getElementById('m-fijo');
        const mExtra = document.getElementById('m-extra');

        if (cMonthTot) cMonthTot.textContent = `$${totalSpent.toFixed(2)}`;
        if (mFijo) mFijo.textContent = `$${fixedSpent.toFixed(2)}`;
        if (mExtra) mExtra.textContent = `$${extraSpent.toFixed(2)}`;

        const chartQ1Color = getCssVar('--chart-q1', '#38bdf8');
        const chartQ2Color = getCssVar('--chart-q2', '#ef4444');

        renderGauge('gaugeQ1', 'q1-pct', 'q1-spent', 'q1-avail', spentQ1, budgetQ1, chartQ1, (inst) => chartQ1 = inst, [chartQ1Color]);
        renderGauge('gaugeQ2', 'q2-pct', 'q2-spent', 'q2-avail', spentQ2, budgetQ2, chartQ2, (inst) => chartQ2 = inst, [chartQ2Color]);

        const availTotal = Math.max(0, budgetTotal - totalSpent);
        const pctTotal = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
        
        const elTotalSpent = document.getElementById('total-spent');
        const elTotalAvail = document.getElementById('total-avail');
        const elTotalPct = document.getElementById('total-pct');

        if (elTotalSpent) elTotalSpent.textContent = `$${totalSpent.toFixed(2)}`;
        if (elTotalAvail) elTotalAvail.textContent = `$${availTotal.toFixed(2)}`;
        if (elTotalPct) elTotalPct.textContent = `${pctTotal}%`;

        renderFortnightCategories('q1-categories-list', catQ1, spentQ1);
        renderFortnightCategories('q2-categories-list', catQ2, spentQ2);

        renderTypeChart(fixedSpent, extraSpent);
        renderInteractiveCategoryWheel();
    });
}

function renderFortnightCategories(containerId, catObj, totalFortnightSpent) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const entries = Object.entries(catObj).sort((a, b) => b[1] - a[1]).slice(0, 3);

    if (entries.length === 0) {
        container.innerHTML = `<p class="theme-text-muted text-[11px] py-1">Sin consumos en esta quincena.</p>`;
        return;
    }

    entries.forEach(([cat, amount]) => {
        const pct = totalFortnightSpent > 0 ? ((amount / totalFortnightSpent) * 100).toFixed(0) : 0;
        const color = categoryColors[cat] || '#94a3b8';
        container.innerHTML += `
            <div class="flex justify-between items-center text-[11px]">
                <span class="flex items-center gap-1.5 font-medium theme-text-secondary">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${color}"></span>
                    ${cat}
                </span>
                <span class="font-bold theme-text-primary">$${amount.toFixed(2)} <span class="theme-text-muted font-normal text-[10px]">(${pct}%)</span></span>
            </div>`;
    });
}

function renderInteractiveCategoryWheel() {
    const gridContainer = document.getElementById('category-interactive-grid');
    const canvasEl = document.getElementById('categoryWheelChart');
    const wheelCenterAmount = document.getElementById('wheel-center-amount');
    const wheelCenterLabel = document.getElementById('wheel-center-label');

    if (!gridContainer || !canvasEl) return;

    const isMonth = categoryViewMode === 'month';
    const activeData = isMonth ? categoryMonthData : categoryYtdData;
    const activeTotal = isMonth ? monthTotalSpentVal : ytdTotalSpentVal;

    const entries = Object.entries(activeData).sort((a, b) => b[1] - a[1]);

    if (wheelCenterAmount) wheelCenterAmount.textContent = `$${activeTotal.toFixed(2)}`;
    if (wheelCenterLabel) wheelCenterLabel.textContent = isMonth ? `Total Gastado (${currentMes})` : 'Total Gastado (YTD Anual)';

    if (entries.length === 0) {
        gridContainer.innerHTML = `<p class="col-span-2 text-center theme-text-muted py-6 text-xs">Sin registros de gastos en este período.</p>`;
        if (categoryWheelChartInstance) categoryWheelChartInstance.destroy();
        return;
    }

    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);
    const colors = labels.map(l => categoryColors[l] || '#94a3b8');

    // 1. Tarjetas Interactivas
    gridContainer.innerHTML = '';
    entries.forEach(([cat, amount], index) => {
        const pct = activeTotal > 0 ? ((amount / activeTotal) * 100).toFixed(1) : '0';
        const color = categoryColors[cat] || '#94a3b8';

        gridContainer.innerHTML += `
            <div class="cat-item-card theme-card-sub p-2.5 sm:p-3 rounded-xl border flex justify-between items-center text-xs" data-cat-index="${index}">
                <div class="flex items-center gap-2 font-bold theme-text-primary">
                    <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 shadow-sm" style="background-color: ${color}"></span>
                    <span class="truncate max-w-[110px] sm:max-w-[140px]">${cat}</span>
                </div>
                <div class="text-right">
                    <span class="font-black theme-text-primary">$${amount.toFixed(2)}</span>
                    <span class="block text-[10px] theme-text-muted font-normal">(${pct}%)</span>
                </div>
            </div>`;
    });

    // 2. Chart de Rueda (Donut)
    const ctx = canvasEl.getContext('2d');
    if (categoryWheelChartInstance) categoryWheelChartInstance.destroy();

    const cardBgColor = getCssVar('--card-bg', '#111827');

    categoryWheelChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: cardBgColor,
                hoverOffset: 10
            }]
        },
        options: {
            cutout: '72%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = activeTotal > 0 ? ((val / activeTotal) * 100).toFixed(1) : '0';
                            return ` $${val.toFixed(2)} (${pct}%)`;
                        }
                    }
                }
            },
            onHover: (event, activeElements) => {
                const cards = document.querySelectorAll('.cat-item-card');
                if (activeElements && activeElements.length > 0) {
                    const hoveredIndex = activeElements[0].index;
                    const catName = labels[hoveredIndex];
                    const catAmount = values[hoveredIndex];
                    const catPct = activeTotal > 0 ? ((catAmount / activeTotal) * 100).toFixed(1) : '0';

                    if (wheelCenterAmount) wheelCenterAmount.textContent = `$${catAmount.toFixed(2)}`;
                    if (wheelCenterLabel) wheelCenterLabel.textContent = `${catName} (${catPct}%)`;

                    cards.forEach((card, idx) => {
                        if (idx === hoveredIndex) {
                            card.classList.add('is-active');
                            card.classList.remove('is-dimmed');
                        } else {
                            card.classList.remove('is-active');
                            card.classList.add('is-dimmed');
                        }
                    });
                } else {
                    if (wheelCenterAmount) wheelCenterAmount.textContent = `$${activeTotal.toFixed(2)}`;
                    if (wheelCenterLabel) wheelCenterLabel.textContent = isMonth ? `Total Gastado (${currentMes})` : 'Total Gastado (YTD Anual)';
                    cards.forEach(card => card.classList.remove('is-active', 'is-dimmed'));
                }
            }
        }
    });

    // 3. Hover en Tarjetas
    document.querySelectorAll('.cat-item-card').forEach(card => {
        const idx = parseInt(card.getAttribute('data-cat-index'));

        card.addEventListener('mouseenter', () => {
            if (!categoryWheelChartInstance) return;

            categoryWheelChartInstance.setActiveElements([{ datasetIndex: 0, index: idx }]);
            categoryWheelChartInstance.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }]);
            categoryWheelChartInstance.update();

            const catName = labels[idx];
            const catAmount = values[idx];
            const catPct = activeTotal > 0 ? ((catAmount / activeTotal) * 100).toFixed(1) : '0';
            if (wheelCenterAmount) wheelCenterAmount.textContent = `$${catAmount.toFixed(2)}`;
            if (wheelCenterLabel) wheelCenterLabel.textContent = `${catName} (${catPct}%)`;

            document.querySelectorAll('.cat-item-card').forEach((c, i) => {
                if (i === idx) { c.classList.add('is-active'); c.classList.remove('is-dimmed'); }
                else { c.classList.remove('is-active'); c.classList.add('is-dimmed'); }
            });
        });

        card.addEventListener('mouseleave', () => {
            if (!categoryWheelChartInstance) return;

            categoryWheelChartInstance.setActiveElements([]);
            categoryWheelChartInstance.tooltip.setActiveElements([]);
            categoryWheelChartInstance.update();

            if (wheelCenterAmount) wheelCenterAmount.textContent = `$${activeTotal.toFixed(2)}`;
            if (wheelCenterLabel) wheelCenterLabel.textContent = isMonth ? `Total Gastado (${currentMes})` : 'Total Gastado (YTD Anual)';
            document.querySelectorAll('.cat-item-card').forEach(c => c.classList.remove('is-active', 'is-dimmed'));
        });
    });
}

const addModal = document.getElementById('add-expense-modal');
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');

if (btnOpenAddModal) btnOpenAddModal.onclick = () => addModal.classList.remove('hidden');
if (btnCloseAddModal) btnCloseAddModal.onclick = () => addModal.classList.add('hidden');

const addExpenseForm = document.getElementById('add-expense-form');
if (addExpenseForm) {
    addExpenseForm.onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "gastos"), {
            descripcion: document.getElementById('add-e-desc').value,
            monto: parseFloat(document.getElementById('add-e-monto').value),
            quincena: document.getElementById('add-e-quincena').value,
            tipo: document.getElementById('add-e-tipo').value,
            categoria: document.getElementById('add-e-categoria').value,
            prioridad: document.getElementById('add-e-prioridad').value,
            mes: currentMes,
            year: currentYear,
            userId: currentUid,
            createdAt: new Date()
        });
        addExpenseForm.reset();
        addModal.classList.add('hidden');
        alert("Gasto registrado correctamente.");
        loadMonthData();
    };
}

function renderGauge(canvasId, pctId, spentId, availId, spent, budget, chartInstanceVar, setInstanceCallback, colors) {
    const available = Math.max(0, budget - spent);
    const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    
    const elPct = document.getElementById(pctId);
    const elSpent = document.getElementById(spentId);
    const elAvail = document.getElementById(availId);

    if (elPct) elPct.textContent = percentage + '%';
    if (elSpent) elSpent.textContent = `$${spent.toFixed(2)}`;
    if (elAvail) elAvail.textContent = `$${available.toFixed(2)}`;

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (chartInstanceVar) chartInstanceVar.destroy();
    
    const subBgColor = getCssVar('--card-border', '#334155');
    const gaugeColors = [colors[0], subBgColor];

    const newInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [spent, available], backgroundColor: gaugeColors, borderWidth: 0 }] },
        options: { rotation: -90, circumference: 180, cutout: '80%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    setInstanceCallback(newInstance);
}

function renderTypeChart(fijo, extra) {
    const canvasEl = document.getElementById('typeChart');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();
    
    const dataValues = (fijo === 0 && extra === 0) ? [1] : [fijo, extra];
    const bgColors = (fijo === 0 && extra === 0) ? ['#ffffff30'] : ['#38bdf8', '#fb7185'];

    typeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: dataValues, backgroundColor: bgColors, borderWidth: 0 }] },
        options: { cutout: '70%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

async function loadYTDData() {
    const q = query(
        collection(db, "gastos"), 
        where("userId", "==", currentUid),
        where("year", "==", currentYear)
    );
    
    onSnapshot(q, (snap) => {
        let totalYTD = 0, ytdFijo = 0, ytdExtra = 0;
        const categoryYtdTotals = {};
        const validMonths = meses.slice(0, currentMonthIndex + 1);

        snap.forEach(d => {
            const data = d.data();
            if (validMonths.includes(data.mes)) {
                totalYTD += data.monto;
                if (data.tipo === 'fijo') ytdFijo += data.monto;
                else ytdExtra += data.monto;

                const catName = data.categoria || 'Otros';
                categoryYtdTotals[catName] = (categoryYtdTotals[catName] || 0) + data.monto;
            }
        });

        ytdTotalSpentVal = totalYTD;
        categoryYtdData = categoryYtdTotals;

        const ytdTot = document.getElementById('ytd-total-spent');
        const ytdF = document.getElementById('ytd-fijo');
        const ytdE = document.getElementById('ytd-extra');

        if (ytdTot) ytdTot.textContent = `$${totalYTD.toFixed(2)} Gastados`;
        if (ytdF) ytdF.textContent = `$${ytdFijo.toFixed(2)}`;
        if (ytdE) ytdE.textContent = `$${ytdExtra.toFixed(2)}`;

        if (categoryViewMode === 'ytd') {
            renderInteractiveCategoryWheel();
        }
    });
}