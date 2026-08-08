import { auth, db } from '../firebase-config.js'; // Cambia a './firebase-config.js' si tu archivo está en /js
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

async function initDashboard() {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) { window.location.href = "index.html"; return; }
    currentUid = user.uid;

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            document.getElementById('nav-name').textContent = data.name || "Usuario";
            document.getElementById('nav-avatar').textContent = data.avatar || "👨‍💻";
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

document.getElementById('btn-logout').onclick = () => signOut(auth).then(() => window.location.href = "index.html");

function initMonthTabs() {
    const container = document.getElementById('month-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    document.getElementById('lbl-current-mes').textContent = currentMes;
    document.getElementById('lbl-cat-month').textContent = currentMes;
    document.getElementById('view-mes-title').textContent = currentMes;

    meses.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m;
        btn.className = `px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition ${m === currentMes ? 'bg-indigo-600 text-white shadow-md' : 'theme-card text-slate-300 border hover:bg-slate-800/50'}`;
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
        btnQ1.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'q1' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-card'}`;
        btnQ2.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'q2' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-card'}`;
        btnMes.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${mode === 'mes' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-card'}`;
        loadMonthData();
    };

    if (btnQ1) btnQ1.onclick = () => setFilterState('q1');
    if (btnQ2) btnQ2.onclick = () => setFilterState('q2');
    if (btnMes) btnMes.onclick = () => setFilterState('mes');
}

document.getElementById('in-salario-mensual').oninput = (e) => {
    const mensual = parseFloat(e.target.value) || 0;
    const quincenal = mensual / 2;
    document.getElementById('q1-salario').value = quincenal ? quincenal.toFixed(2) : '';
    document.getElementById('q2-salario').value = quincenal ? quincenal.toFixed(2) : '';
    calcularNetoQuincenal();
};

function calcularNetoQuincenal() {
    const aplicaLeySalario = document.getElementById('in-ley-salario').checked;

    const q1Salario = parseFloat(document.getElementById('q1-salario').value) || 0;
    const q1Ing2 = parseFloat(document.getElementById('q1-ingreso2').value) || 0;
    const q1Ing2Ley = document.getElementById('q1-ing2-ley').checked;
    const q1Ing3 = parseFloat(document.getElementById('q1-ingreso3').value) || 0;
    const q1Ing3Ley = document.getElementById('q1-ing3-ley').checked;
    const q1Acreedores = parseFloat(document.getElementById('q1-acreedores').value) || 0;
    const q1Isr = parseFloat(document.getElementById('q1-isr').value) || 0;
    const incluyeDecimo = document.getElementById('in-decimo').checked;

    const q2Salario = parseFloat(document.getElementById('q2-salario').value) || 0;
    const q2Ing2 = parseFloat(document.getElementById('q2-ingreso2').value) || 0;
    const q2Ing2Ley = document.getElementById('q2-ing2-ley').checked;
    const q2Ing3 = parseFloat(document.getElementById('q2-ingreso3').value) || 0;
    const q2Ing3Ley = document.getElementById('q2-ing3-ley').checked;
    const q2Acreedores = parseFloat(document.getElementById('q2-acreedores').value) || 0;
    const q2Isr = parseFloat(document.getElementById('q2-isr').value) || 0;

    const q1BrutoSubject = (aplicaLeySalario ? q1Salario : 0) + (q1Ing2Ley ? q1Ing2 : 0) + (q1Ing3Ley ? q1Ing3 : 0);
    const q1BrutoTotal = q1Salario + q1Ing2 + q1Ing3;
    
    const q1SsRegular = q1BrutoSubject * 0.0975;
    const q1SeRegular = q1BrutoSubject * 0.0125;
    const netoQ1Regular = q1BrutoTotal - (q1SsRegular + q1SeRegular + q1Isr + q1Acreedores);

    let decimoBruto = 0;
    let decimoCss = 0;
    let decimoNeto = 0;

    const boxDecimoEdit = document.getElementById('decimo-breakdown-edit');

    if (incluyeDecimo) {
        boxDecimoEdit.classList.remove('hidden');
        const salarioMensual = q1Salario * 2;
        decimoBruto = salarioMensual / 3; 
        decimoCss = aplicaLeySalario ? (decimoBruto * 0.0725) : 0; 
        decimoNeto = decimoBruto - decimoCss; 

        document.getElementById('e-decimo-bruto').textContent = `$${decimoBruto.toFixed(2)}`;
        document.getElementById('e-decimo-css').textContent = `-$${decimoCss.toFixed(2)}`;
        document.getElementById('e-decimo-neto').textContent = `$${decimoNeto.toFixed(2)}`;
    } else {
        boxDecimoEdit.classList.add('hidden');
    }

    const netoQ1Total = netoQ1Regular + decimoNeto;

    const q2BrutoSubject = (aplicaLeySalario ? q2Salario : 0) + (q2Ing2Ley ? q2Ing2 : 0) + (q2Ing3Ley ? q2Ing3 : 0);
    const q2BrutoTotal = q2Salario + q2Ing2 + q2Ing3;

    const q2Ss = q2BrutoSubject * 0.0975;
    const q2Se = q2BrutoSubject * 0.0125; 
    const netoQ2 = q2BrutoTotal - (q2Ss + q2Se + q2Isr + q2Acreedores);

    const netoTotalMensual = netoQ1Total + netoQ2;

    document.getElementById('neto-q1').textContent = `$${netoQ1Total.toFixed(2)}`;
    document.getElementById('neto-q2').textContent = `$${netoQ2.toFixed(2)}`;
    document.getElementById('calc-neto').textContent = `$${netoTotalMensual.toFixed(2)}`;

    return {
        netoTotal: netoTotalMensual,
        q1Data: { salario: q1Salario, ing2: q1Ing2, ing2Ley: q1Ing2Ley, ing3: q1Ing3, ing3Ley: q1Ing3Ley, acreedores: q1Acreedores, isr: q1Isr, ss: q1SsRegular, se: q1SeRegular, incluyeDecimo, decimoBruto, decimoCss, decimoNeto, neto: netoQ1Total },
        q2Data: { salario: q2Salario, ing2: q2Ing2, ing2Ley: q2Ing2Ley, ing3: q2Ing3, ing3Ley: q2Ing3Ley, acreedores: q2Acreedores, isr: q2Isr, ss: q2Ss, se: q2Se, neto: netoQ2 },
        aplicaLeySalario
    };
}

document.querySelectorAll('#q1-salario, #q1-ingreso2, #q1-ingreso3, #q1-ing2-ley, #q1-ing3-ley, #q1-acreedores, #q1-isr, #q2-salario, #q2-ingreso2, #q2-ingreso3, #q2-ing2-ley, #q2-ing3-ley, #q2-acreedores, #q2-isr, #in-decimo, #in-ley-salario').forEach(el => {
    el.oninput = calcularNetoQuincenal;
    el.onchange = calcularNetoQuincenal;
});

function setBudgetMode(isEdit) {
    document.getElementById('budget-edit-mode').classList.toggle('hidden', !isEdit);
    document.getElementById('budget-view-mode').classList.toggle('hidden', isEdit);
}

document.getElementById('btn-edit-budget').onclick = () => setBudgetMode(true);

document.getElementById('save-budget').onclick = async () => {
    const calculo = calcularNetoQuincenal();
    const mensualVal = parseFloat(document.getElementById('in-salario-mensual').value) || 0;

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

async function loadMonthData() {
    document.getElementById('lbl-current-mes').textContent = currentMes;
    document.getElementById('lbl-cat-month').textContent = currentMes;
    document.getElementById('view-mes-title').textContent = currentMes;

    const bDoc = await getDoc(doc(db, "presupuestos", `${currentUid}_${currentMes}`));
    let budgetQ1 = 0;
    let budgetQ2 = 0;
    let budgetTotal = 0;

    if (bDoc.exists()) {
        const bData = bDoc.data();
        budgetTotal = bData.monto || 0;
        budgetQ1 = bData.q1 ? bData.q1.neto : (budgetTotal / 2);
        budgetQ2 = bData.q2 ? bData.q2.neto : (budgetTotal / 2);
        
        document.getElementById('in-salario-mensual').value = bData.salarioMensual || '';
        document.getElementById('in-ley-salario').checked = bData.aplicaLeySalario !== undefined ? bData.aplicaLeySalario : true;

        if (bData.q1) {
            document.getElementById('q1-salario').value = bData.q1.salario || '';
            document.getElementById('q1-ingreso2').value = bData.q1.ing2 || '';
            document.getElementById('q1-ing2-ley').checked = bData.q1.ing2Ley || false;
            document.getElementById('q1-ingreso3').value = bData.q1.ing3 || '';
            document.getElementById('q1-ing3-ley').checked = bData.q1.ing3Ley || false;
            document.getElementById('q1-acreedores').value = bData.q1.acreedores || '';
            document.getElementById('q1-isr').value = bData.q1.isr || '';
            document.getElementById('in-decimo').checked = bData.q1.incluyeDecimo || false;
        }
        if (bData.q2) {
            document.getElementById('q2-salario').value = bData.q2.salario || '';
            document.getElementById('q2-ingreso2').value = bData.q2.ing2 || '';
            document.getElementById('q2-ing2-ley').checked = bData.q2.ing2Ley || false;
            document.getElementById('q2-ingreso3').value = bData.q2.ing3 || '';
            document.getElementById('q2-ing3-ley').checked = bData.q2.ing3Ley || false;
            document.getElementById('q2-acreedores').value = bData.q2.acreedores || '';
            document.getElementById('q2-isr').value = bData.q2.isr || '';
        }

        if (bData.q1 && bData.q2) {
            document.getElementById('v-q1-salario').textContent = `$${(bData.q1.salario || 0).toFixed(2)}`;
            
            const boxIng2Q1 = document.getElementById('v-q1-ing2-box');
            if (bData.q1.ing2 > 0) {
                boxIng2Q1.classList.remove('hidden');
                document.getElementById('v-q1-ing2').textContent = `+$${bData.q1.ing2.toFixed(2)}`;
            } else { boxIng2Q1.classList.add('hidden'); }

            const boxIng3Q1 = document.getElementById('v-q1-ing3-box');
            if (bData.q1.ing3 > 0) {
                boxIng3Q1.classList.remove('hidden');
                document.getElementById('v-q1-ing3').textContent = `+$${bData.q1.ing3.toFixed(2)}`;
            } else { boxIng3Q1.classList.add('hidden'); }

            document.getElementById('v-q1-ss').textContent = `-$${(bData.q1.ss || 0).toFixed(2)}`;
            document.getElementById('v-q1-se').textContent = `-$${(bData.q1.se || 0).toFixed(2)}`;
            document.getElementById('v-q1-isr').textContent = `-$${(bData.q1.isr || 0).toFixed(2)}`;
            document.getElementById('v-q1-acreedores').textContent = `-$${(bData.q1.acreedores || 0).toFixed(2)}`;
            document.getElementById('v-q1-neto').textContent = `$${(bData.q1.neto || 0).toFixed(2)}`;

            const vDecimoBox = document.getElementById('v-container-decimo');
            if (bData.q1.incluyeDecimo) {
                vDecimoBox.classList.remove('hidden');
                document.getElementById('v-q1-decimo-bruto').textContent = `$${(bData.q1.decimoBruto || 0).toFixed(2)}`;
                document.getElementById('v-q1-decimo-css').textContent = `-$${(bData.q1.decimoCss || 0).toFixed(2)}`;
                document.getElementById('v-q1-decimo-neto').textContent = `$${(bData.q1.decimoNeto || 0).toFixed(2)}`;
            } else {
                vDecimoBox.classList.add('hidden');
            }

            document.getElementById('v-q2-salario').textContent = `$${(bData.q2.salario || 0).toFixed(2)}`;
            
            const boxIng2Q2 = document.getElementById('v-q2-ing2-box');
            if (bData.q2.ing2 > 0) {
                boxIng2Q2.classList.remove('hidden');
                document.getElementById('v-q2-ing2').textContent = `+$${bData.q2.ing2.toFixed(2)}`;
            } else { boxIng2Q2.classList.add('hidden'); }

            const boxIng3Q2 = document.getElementById('v-q2-ing3-box');
            if (bData.q2.ing3 > 0) {
                boxIng3Q2.classList.remove('hidden');
                document.getElementById('v-q2-ing3').textContent = `+$${bData.q2.ing3.toFixed(2)}`;
            } else { boxIng3Q2.classList.add('hidden'); }

            document.getElementById('v-q2-ss').textContent = `-$${(bData.q2.ss || 0).toFixed(2)}`;
            document.getElementById('v-q2-se').textContent = `-$${(bData.q2.se || 0).toFixed(2)}`;
            document.getElementById('v-q2-isr').textContent = `-$${(bData.q2.isr || 0).toFixed(2)}`;
            document.getElementById('v-q2-acreedores').textContent = `-$${(bData.q2.acreedores || 0).toFixed(2)}`;
            document.getElementById('v-q2-neto').textContent = `$${(bData.q2.neto || 0).toFixed(2)}`;

            document.getElementById('v-neto-total').textContent = `$${budgetTotal.toFixed(2)}`;
        }

        setBudgetMode(false);
    } else {
        document.getElementById('in-salario-mensual').value = '';
        document.getElementById('in-ley-salario').checked = true;
        document.getElementById('q1-salario').value = '';
        document.getElementById('q1-ingreso2').value = '';
        document.getElementById('q1-ing2-ley').checked = false;
        document.getElementById('q1-ingreso3').value = '';
        document.getElementById('q1-ing3-ley').checked = false;
        document.getElementById('q1-acreedores').value = '';
        document.getElementById('q1-isr').value = '';
        document.getElementById('in-decimo').checked = false;

        document.getElementById('q2-salario').value = '';
        document.getElementById('q2-ingreso2').value = '';
        document.getElementById('q2-ing2-ley').checked = false;
        document.getElementById('q2-ingreso3').value = '';
        document.getElementById('q2-ing3-ley').checked = false;
        document.getElementById('q2-acreedores').value = '';
        document.getElementById('q2-isr').value = '';

        calcularNetoQuincenal();
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
        let totalSpent = 0;
        let spentQ1 = 0;
        let spentQ2 = 0;
        let fixedSpent = 0;
        let extraSpent = 0;
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

        document.getElementById('current-month-total').textContent = `$${totalSpent.toFixed(2)}`;
        document.getElementById('m-fijo').textContent = `$${fixedSpent.toFixed(2)}`;
        document.getElementById('m-extra').textContent = `$${extraSpent.toFixed(2)}`;

        renderGauge('gaugeQ1', 'q1-pct', 'q1-spent', 'q1-avail', spentQ1, budgetQ1, chartQ1, (inst) => chartQ1 = inst, ['#3b82f6', '#1e293b']);
        renderGauge('gaugeQ2', 'q2-pct', 'q2-spent', 'q2-avail', spentQ2, budgetQ2, chartQ2, (inst) => chartQ2 = inst, ['#a855f7', '#1e293b']);
        renderGauge('gaugeTotal', 'total-pct', 'total-spent', 'total-avail', totalSpent, budgetTotal, chartTotal, (inst) => chartTotal = inst, ['#6366f1', '#1e293b']);

        renderTypeChart(fixedSpent, extraSpent);
        renderCategoryBarChart('categoryMonthBarChart', 'category-month-list', categoryTotals, totalSpent, categoryMonthChartInstance, (inst) => categoryMonthChartInstance = inst);
    });
}

// CONTROL DEL MODAL DE AGREGAR GASTO
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
    
    document.getElementById(pctId).textContent = percentage + '%';
    document.getElementById(spentId).textContent = `$${spent.toFixed(2)}`;
    document.getElementById(availId).textContent = `$${available.toFixed(2)}`;

    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (chartInstanceVar) chartInstanceVar.destroy();
    
    const newInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [spent, available], backgroundColor: colors, borderWidth: 0 }] },
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
    const bgColors = (fijo === 0 && extra === 0) ? ['#ffffff20'] : ['#38bdf8', '#fb7185'];

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

    const listContainer = document.getElementById(listContainerId);
    if (listContainer) {
        listContainer.innerHTML = '';
        rawLabels.forEach((cat, i) => {
            const amount = data[i];
            const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
            listContainer.innerHTML += `
                <div class="flex justify-between items-center text-xs py-0.5">
                    <span class="flex items-center gap-1.5 font-medium text-slate-300">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${categoryColors[cat] || '#94a3b8'}"></span>
                        ${cat}
                    </span>
                    <span class="font-bold text-slate-100">$${amount.toFixed(2)} <span class="text-slate-400 font-normal">(${pct}%)</span></span>
                </div>`;
        });

        if (rawLabels.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-slate-500 py-2">Sin gastos registrados.</p>`;
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
                backgroundColor: data.length > 0 ? colors : ['#334155'],
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
                x: { 
                    grid: { display: false }, 
                    ticks: { font: { size: 10 }, color: '#94a3b8', callback: function(value) { return '$' + value; } } 
                },
                y: { 
                    grid: { display: false }, 
                    ticks: { display: false } 
                }
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
        let totalYTD = 0;
        let ytdFijo = 0;
        let ytdExtra = 0;
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

        document.getElementById('ytd-total-spent').textContent = `$${totalYTD.toFixed(2)} Gastados`;
        document.getElementById('ytd-fijo').textContent = `$${ytdFijo.toFixed(2)}`;
        document.getElementById('ytd-extra').textContent = `$${ytdExtra.toFixed(2)}`;

        renderCategoryBarChart('categoryYtdBarChart', 'category-ytd-list', categoryYtdTotals, totalYTD, categoryYtdChartInstance, (inst) => categoryYtdChartInstance = inst);
    });
}