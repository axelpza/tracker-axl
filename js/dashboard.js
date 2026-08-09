import { auth, db } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUid = null;
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
let currentMes = meses[new Date().getMonth()];
const currentYear = new Date().getFullYear();
const currentMonthIndex = new Date().getMonth(); 

let dashboardFilter = 'mes'; 

let typeChartInstance = null;
let chartQ1 = null;
let chartQ2 = null;
let chartTotal = null;
let categoryMonthChartInstance = null;
let categoryYtdChartInstance = null;

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

// HELPER: Extrae variables de CSS del tema activo para asegurar contraste en Canvas/Chart.js
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

    initMonthTabs();
    initDashFilterButtons();
    loadMonthData();
    loadYTDData();
}

initDashboard();

// Re-renderizar gráficos cuando el usuario cambie de tema en perfil
window.addEventListener('themeChanged', () => {
    loadMonthData();
    loadYTDData();
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

function initMonthTabs() {
    const container = document.getElementById('month-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    const lblMes = document.getElementById('lbl-current-mes');
    const lblCatMes = document.getElementById('lbl-cat-month');
    const lblViewMes = document.getElementById('view-mes-title');

    if (lblMes) lblMes.textContent = currentMes;
    if (lblCatMes) lblCatMes.textContent = currentMes;
    if (lblViewMes) lblViewMes.textContent = currentMes;

    meses.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m;
        btn.className = `px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition ${m === currentMes ? 'bg-indigo-600 text-white shadow-md' : 'theme-btn-secondary'}`;
        btn.onclick = () => { 
            currentMes = m; 
            initMonthTabs(); 
            loadMonthData(); 
        };
        container.appendChild(btn);
    });
}

function initDashFilterButtons() {
    const btnQ1 = document.getElementById('btn-dash-q1');
    const btnQ2 = document.getElementById('btn-dash-q2');
    const btnMes = document.getElementById('btn-dash-mes');

    const setFilterState = (mode) => {
        dashboardFilter = mode;
        if (btnQ1) btnQ1.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'q1' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;
        if (btnQ2) btnQ2.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'q2' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;
        if (btnMes) btnMes.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'mes' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;
        loadMonthData();
    };

    if (btnQ1) btnQ1.onclick = () => setFilterState('q1');
    if (btnQ2) btnQ2.onclick = () => setFilterState('q2');
    if (btnMes) btnMes.onclick = () => setFilterState('mes');
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
    const lblCatMes = document.getElementById('lbl-cat-month');
    const lblViewMes = document.getElementById('view-mes-title');
    if (lblMes) lblMes.textContent = currentMes;
    if (lblCatMes) lblCatMes.textContent = currentMes;
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
        const categoryTotals = {};

        snapshot.forEach(d => {
            const data = d.data();

            if (dashboardFilter === 'q1' && data.quincena !== '1ra Quincena') return;
            if (dashboardFilter === 'q2' && data.quincena !== '2da Quincena') return;

            totalSpent += data.monto;

            const catName = data.categoria || 'Otros';
            categoryTotals[catName] = (categoryTotals[catName] || 0) + data.monto;

            if (data.tipo === 'fijo') fixedSpent += data.monto;
            else extraSpent += data.monto;

            if (data.quincena === '2da Quincena') spentQ2 += data.monto;
            else spentQ1 += data.monto;
        });

        const cMonthTot = document.getElementById('current-month-total');
        const mFijo = document.getElementById('m-fijo');
        const mExtra = document.getElementById('m-extra');

        if (cMonthTot) cMonthTot.textContent = `$${totalSpent.toFixed(2)}`;
        if (mFijo) mFijo.textContent = `$${fixedSpent.toFixed(2)}`;
        if (mExtra) mExtra.textContent = `$${extraSpent.toFixed(2)}`;

        const accentColor = getCssVar('--accent-primary', '#6366f1');

        renderGauge('gaugeQ1', 'q1-pct', 'q1-spent', 'q1-avail', spentQ1, budgetQ1, chartQ1, (inst) => chartQ1 = inst, ['#3b82f6']);
        renderGauge('gaugeQ2', 'q2-pct', 'q2-spent', 'q2-avail', spentQ2, budgetQ2, chartQ2, (inst) => chartQ2 = inst, ['#a855f7']);
        renderGauge('gaugeTotal', 'total-pct', 'total-spent', 'total-avail', totalSpent, budgetTotal, chartTotal, (inst) => chartTotal = inst, [accentColor]);

        renderTypeChart(fixedSpent, extraSpent);
        renderCategoryBarChart('categoryMonthBarChart', 'category-month-list', categoryTotals, totalSpent, categoryMonthChartInstance, (inst) => categoryMonthChartInstance = inst);
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
    
    const subBgColor = getCssVar('--card-sub-bg', '#334155');
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

function renderCategoryBarChart(canvasId, listContainerId, categoriesObj, totalSpentVal, chartInstanceVar, setInstanceCallback) {
    const rawLabels = Object.keys(categoriesObj);
    const data = Object.values(categoriesObj);
    const total = totalSpentVal || data.reduce((a, b) => a + b, 0);

    const colors = rawLabels.map(l => categoryColors[l] || '#94a3b8');
    const textColor = getCssVar('--text-primary', '#ffffff');
    const subBgColor = getCssVar('--card-sub-bg', '#334155');

    const listContainer = document.getElementById(listContainerId);
    if (listContainer) {
        listContainer.innerHTML = '';
        rawLabels.forEach((cat, i) => {
            const amount = data[i];
            const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
            listContainer.innerHTML += `
                <div class="flex justify-between items-center text-xs py-0.5">
                    <span class="flex items-center gap-1.5 font-medium theme-text-secondary">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${categoryColors[cat] || '#94a3b8'}"></span>
                        ${cat}
                    </span>
                    <span class="font-bold theme-text-primary">$${amount.toFixed(2)} <span class="theme-text-muted font-normal">(${pct}%)</span></span>
                </div>`;
        });

        if (rawLabels.length === 0) {
            listContainer.innerHTML = `<p class="text-center theme-text-muted py-2">Sin gastos registrados.</p>`;
        }
    }

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (chartInstanceVar) chartInstanceVar.destroy();

    const newInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rawLabels.length > 0 ? rawLabels : ['Sin datos'],
            datasets: [{
                label: 'Monto ($)',
                data: data.length > 0 ? data : [0],
                backgroundColor: data.length > 0 ? colors : [subBgColor],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 0, right: 10 } },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                            return ` Total: $${val.toFixed(2)} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: textColor, callback: (value) => '$' + value } },
                y: { grid: { display: false }, ticks: { display: false } }
            }
        }
    });
    setInstanceCallback(newInstance);
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

        const ytdTot = document.getElementById('ytd-total-spent');
        const ytdF = document.getElementById('ytd-fijo');
        const ytdE = document.getElementById('ytd-extra');

        if (ytdTot) ytdTot.textContent = `$${totalYTD.toFixed(2)} Gastados`;
        if (ytdF) ytdF.textContent = `$${ytdFijo.toFixed(2)}`;
        if (ytdE) ytdE.textContent = `$${ytdExtra.toFixed(2)}`;

        renderCategoryBarChart('categoryYtdBarChart', 'category-ytd-list', categoryYtdTotals, totalYTD, categoryYtdChartInstance, (inst) => categoryYtdChartInstance = inst);
    });
}