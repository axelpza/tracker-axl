import { auth, db } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, query, where, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUid = null;
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
let currentMes = meses[new Date().getMonth()];
const currentYear = new Date().getFullYear();

const gastosCache = new Map();

async function initGastosPage() {
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
    loadGastosData();
}

initGastosPage();

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

function initMonthTabs() {
    const container = document.getElementById('month-tabs');
    if (!container) return;
    container.innerHTML = '';

    meses.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m;
        btn.className = `px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition ${m === currentMes ? 'bg-indigo-600 text-white shadow-md' : 'theme-btn-secondary'}`;
        btn.onclick = () => { 
            currentMes = m; 
            initMonthTabs(); 
            loadGastosData(); 
        };
        container.appendChild(btn);
    });
}

const btnQ1 = document.getElementById('btn-view-q1');
const btnQ2 = document.getElementById('btn-view-q2');
const btnMes = document.getElementById('btn-view-mes');
const wrapQ1 = document.getElementById('wrapper-q1');
const wrapQ2 = document.getElementById('wrapper-q2');

function setQuincenaView(viewMode) {
    if (btnQ1) btnQ1.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${viewMode === 'q1' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;
    if (btnQ2) btnQ2.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${viewMode === 'q2' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;
    if (btnMes) btnMes.className = `px-4 py-2 rounded-xl text-xs font-bold transition ${viewMode === 'mes' ? 'bg-indigo-600 text-white shadow-sm' : 'theme-btn-secondary'}`;

    if (viewMode === 'q1') {
        if (wrapQ1) wrapQ1.classList.remove('hidden');
        if (wrapQ2) wrapQ2.classList.add('hidden');
    } else if (viewMode === 'q2') {
        if (wrapQ1) wrapQ1.classList.add('hidden');
        if (wrapQ2) wrapQ2.classList.remove('hidden');
    } else {
        if (wrapQ1) wrapQ1.classList.remove('hidden');
        if (wrapQ2) wrapQ2.classList.remove('hidden');
    }
}

if (btnQ1) btnQ1.onclick = () => setQuincenaView('q1');
if (btnQ2) btnQ2.onclick = () => setQuincenaView('q2');
if (btnMes) btnMes.onclick = () => setQuincenaView('mes');

function loadGastosData() {
    const q = query(
        collection(db, "gastos"), 
        where("userId", "==", currentUid), 
        where("mes", "==", currentMes),
        where("year", "==", currentYear)
    );

    onSnapshot(q, (snapshot) => {
        const listQ1 = document.getElementById('expense-cards-q1');
        const listQ2 = document.getElementById('expense-cards-q2');
        if (!listQ1 || !listQ2) return;

        listQ1.innerHTML = '';
        listQ2.innerHTML = '';
        gastosCache.clear();

        let totalSpent = 0, spentQ1 = 0, spentQ2 = 0;

        snapshot.forEach(d => {
            const data = d.data();
            const itemData = { id: d.id, ...data };
            gastosCache.set(d.id, itemData);
            totalSpent += data.monto;

            const prioColor = data.prioridad === 'Alta' 
                ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                : (data.prioridad === 'Baja' ? 'bg-slate-500/20 theme-text-muted border border-slate-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30');

            const cardHtml = `
                <div class="theme-card-sub border rounded-xl p-3.5 flex justify-between items-center text-xs hover:border-indigo-500/50 transition shadow-sm">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm theme-text-primary">${data.descripcion}</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${prioColor}">${data.prioridad || 'Media'}</span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] theme-text-secondary">
                            <span class="font-semibold text-indigo-400">${data.categoria || 'Otros'}</span>
                            <span>•</span>
                            <span class="capitalize theme-text-muted">${data.tipo}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-sm theme-text-primary">$${data.monto.toFixed(2)}</span>
                        <button onclick="openEditModal('${d.id}')" class="p-2 rounded-lg theme-btn-secondary hover:bg-indigo-500/20 text-indigo-400 transition" title="Editar Gasto">
                            ✏️
                        </button>
                    </div>
                </div>`;

            if (data.quincena === '2da Quincena') {
                spentQ2 += data.monto;
                listQ2.innerHTML += cardHtml;
            } else {
                spentQ1 += data.monto;
                listQ1.innerHTML += cardHtml;
            }
        });

        if (listQ1.innerHTML === '') listQ1.innerHTML = `<p class="py-6 text-center theme-text-muted text-xs">Sin registros en 1ra Quincena</p>`;
        if (listQ2.innerHTML === '') listQ2.innerHTML = `<p class="py-6 text-center theme-text-muted text-xs">Sin registros en 2da Quincena</p>`;

        const q1Total = document.getElementById('q1-expense-total');
        const q2Total = document.getElementById('q2-expense-total');
        const gTotal = document.getElementById('g-total-spent');

        if (q1Total) q1Total.textContent = `$${spentQ1.toFixed(2)}`;
        if (q2Total) q2Total.textContent = `$${spentQ2.toFixed(2)}`;
        if (gTotal) gTotal.textContent = `$${totalSpent.toFixed(2)}`;
    });
}

window.openEditModal = (id) => {
    const item = gastosCache.get(id);
    if (!item) return;

    document.getElementById('modal-expense-id').value = item.id;
    document.getElementById('m-desc').value = item.descripcion || '';
    document.getElementById('m-monto').value = item.monto || '';
    document.getElementById('m-quincena').value = item.quincena || '1ra Quincena';
    document.getElementById('m-tipo').value = item.tipo || 'fijo';
    document.getElementById('m-categoria').value = item.categoria || 'Otros';
    document.getElementById('m-prioridad').value = item.prioridad || 'Media';
    
    document.getElementById('edit-expense-modal')?.classList.remove('hidden');
};

const addModal = document.getElementById('add-expense-modal');
const btnOpenAdd = document.getElementById('btn-open-add-modal');
const btnCloseAdd = document.getElementById('btn-close-add-modal');

if (btnOpenAdd) btnOpenAdd.onclick = () => addModal.classList.remove('hidden');
if (btnCloseAdd) btnCloseAdd.onclick = () => addModal.classList.add('hidden');

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
        loadGastosData();
    };
}

const editModal = document.getElementById('edit-expense-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
if (btnCloseModal) btnCloseModal.onclick = () => editModal.classList.add('hidden');

const editExpenseForm = document.getElementById('edit-expense-form');
if (editExpenseForm) {
    editExpenseForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('modal-expense-id').value;
        
        await updateDoc(doc(db, "gastos", id), {
            descripcion: document.getElementById('m-desc').value,
            monto: parseFloat(document.getElementById('m-monto').value),
            quincena: document.getElementById('m-quincena').value,
            tipo: document.getElementById('m-tipo').value,
            categoria: document.getElementById('m-categoria').value,
            prioridad: document.getElementById('m-prioridad').value
        });

        editModal.classList.add('hidden');
        loadGastosData();
    };
}

const btnDelete = document.getElementById('btn-delete-modal');
if (btnDelete) {
    btnDelete.onclick = async () => {
        const id = document.getElementById('modal-expense-id').value;
        if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
            await deleteDoc(doc(db, "gastos", id));
            editModal.classList.add('hidden');
            loadGastosData();
        }
    };
}