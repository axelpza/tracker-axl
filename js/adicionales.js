import { auth, db } from '../firebase-config.js'; // Cambia a './firebase-config.js' si tu archivo está dentro de /js
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUid = null;
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const currentYear = new Date().getFullYear();
const currentMonthIndex = new Date().getMonth();

const mesesVisibles = meses.slice(currentMonthIndex);

let cacheAnual = { presupuestos: {}, gastosPorMes: {} };

async function initAdicionales() {
    try {
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) { window.location.href = "index.html"; return; }
        currentUid = user.uid;
        
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            document.getElementById('nav-name').textContent = userSnap.data().name || "Usuario";
            document.getElementById('nav-avatar').textContent = userSnap.data().avatar || "👨‍💻";
        }

        await cargarDatosAnualesYListar();
    } catch (err) {
        console.error("Error al inicializar:", err);
    }
}

initAdicionales();

document.getElementById('btn-logout').onclick = () => signOut(auth).then(() => window.location.href = "index.html");

const itemForm = document.getElementById('item-form');
if (itemForm) {
    itemForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentUid) return;

        try {
            await addDoc(collection(db, "gastos_adicionales"), {
                articulo: document.getElementById('i-articulo').value,
                monto: parseFloat(document.getElementById('i-monto').value),
                url: document.getElementById('i-url').value,
                prioridad: document.getElementById('i-prioridad').value,
                userId: currentUid,
                createdAt: new Date()
            });
            itemForm.reset();
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    };
}

async function cargarDatosAnualesYListar() {
    for (let m of mesesVisibles) {
        const bDoc = await getDoc(doc(db, "presupuestos", `${currentUid}_${m}`));
        cacheAnual.presupuestos[m] = bDoc.exists() ? bDoc.data().monto : 0;
    }

    const qGastos = query(collection(db, "gastos"), where("userId", "==", currentUid), where("year", "==", currentYear));
    
    onSnapshot(qGastos, (snapGastos) => {
        cacheAnual.gastosPorMes = {};
        mesesVisibles.forEach(m => cacheAnual.gastosPorMes[m] = 0);

        snapGastos.forEach(d => {
            const data = d.data();
            if (cacheAnual.gastosPorMes[data.mes] !== undefined) {
                cacheAnual.gastosPorMes[data.mes] += data.monto;
            }
        });

        const qAdicionales = query(collection(db, "gastos_adicionales"), where("userId", "==", currentUid));
        onSnapshot(qAdicionales, (snapDeseos) => {
            renderWishlist(snapDeseos);
        });
    });
}

function renderWishlist(snapshot) {
    const container = document.getElementById('wishlist-container');
    if (!container) return;
    container.innerHTML = '';

    if (snapshot.empty) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">No tienes artículos en tu mapa de deseos.</p>`;
        return;
    }

    snapshot.forEach(d => {
        const item = d.data();
        const itemId = d.id;

        let mesesHtml = '';

        mesesVisibles.forEach(mes => {
            const presupuesto = cacheAnual.presupuestos[mes] || 0;
            const gastado = cacheAnual.gastosPorMes[mes] || 0;
            const disponible = presupuesto - gastado;

            const esViable = disponible >= (item.monto + 50);

            const bgColor = esViable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/40 border-slate-700/30 text-slate-500 opacity-60';
            const badgeText = esViable ? `$${disponible.toFixed(0)} libre` : 'Sin margen';

            mesesHtml += `
                <div class="border rounded-xl p-2 text-center flex flex-col justify-between ${bgColor}">
                    <span class="text-[11px] font-bold uppercase">${mes.substring(0,3)}</span>
                    <span class="text-[9px] my-1 font-semibold">${badgeText}</span>
                    <button onclick='openAssignModal("${item.articulo}", ${item.monto}, "${item.prioridad}", "${mes}")' 
                        class="text-[10px] font-bold py-1 px-1 rounded-lg transition ${esViable ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}"
                        ${!esViable ? 'disabled' : ''}>
                        Asignar
                    </button>
                </div>`;
        });

        const prioBadgeColor = item.prioridad === 'Alta' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : (item.prioridad === 'Baja' ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30');

        container.innerHTML += `
            <div class="theme-card border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold text-base text-slate-100">${item.articulo}</h4>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${prioBadgeColor}">${item.prioridad || 'Media'}</span>
                            ${item.url ? `<a href="${item.url}" target="_blank" class="text-indigo-400 text-xs font-semibold hover:underline">[Ver Enlace]</a>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-xl font-bold text-slate-100">$${item.monto.toFixed(2)}</span>
                        <button onclick="deleteItem('${itemId}')" class="text-red-400 hover:text-red-300 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>

                <div>
                    <p class="text-xs font-bold text-slate-400 mb-2">Análisis de Viabilidad (${mesesVisibles[0]} a Diciembre):</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
                        ${mesesHtml}
                    </div>
                </div>
            </div>`;
    });
}

const assignModal = document.getElementById('assign-modal');
const btnCloseAssignModal = document.getElementById('btn-close-assign-modal');

window.openAssignModal = (articulo, monto, prioridad, mesDestino) => {
    document.getElementById('a-target-mes').value = mesDestino;
    document.getElementById('m-assign-mes-title').textContent = `Mes Destino: ${mesDestino}`;
    document.getElementById('a-desc').value = `[Deseo] ${articulo}`;
    document.getElementById('a-monto').value = monto;
    document.getElementById('a-prioridad').value = prioridad || 'Media';
    document.getElementById('a-quincena').value = '1ra Quincena';
    document.getElementById('a-tipo').value = 'extra';
    document.getElementById('a-categoria').value = 'Chucherías/Compras';
    
    assignModal.classList.remove('hidden');
};

if (btnCloseAssignModal) btnCloseAssignModal.onclick = () => assignModal.classList.add('hidden');

const assignExpenseForm = document.getElementById('assign-expense-form');
if (assignExpenseForm) {
    assignExpenseForm.onsubmit = async (e) => {
        e.preventDefault();
        const mesDestino = document.getElementById('a-target-mes').value;

        try {
            await addDoc(collection(db, "gastos"), {
                descripcion: document.getElementById('a-desc').value,
                monto: parseFloat(document.getElementById('a-monto').value),
                quincena: document.getElementById('a-quincena').value,
                tipo: document.getElementById('a-tipo').value,
                categoria: document.getElementById('a-categoria').value,
                prioridad: document.getElementById('a-prioridad').value,
                mes: mesDestino,
                year: currentYear,
                userId: currentUid,
                createdAt: new Date()
            });

            alert(`¡Éxito! El gasto fue asignado correctamente a ${mesDestino}.`);
            assignModal.classList.add('hidden');
        } catch (err) {
            alert("Error al asignar gasto: " + err.message);
        }
    };
}

window.deleteItem = async (id) => { 
    if (confirm("¿Estás seguro de que deseas eliminar este artículo de tus deseos?")) {
        try { await deleteDoc(doc(db, "gastos_adicionales", id)); } 
        catch (err) { console.error(err); }
    }
};