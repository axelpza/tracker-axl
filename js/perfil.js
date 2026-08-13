import { auth, db } from './firebase-config.js';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { applyTheme, getSavedTheme } from './theme.js';

let currentUser = null;

async function initPerfilPage() {
    await auth.authStateReady();
    currentUser = auth.currentUser;
    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Llenar Nav
            const navName = document.getElementById('nav-name');
            const navAvatar = document.getElementById('nav-avatar');
            if (navName) navName.textContent = data.name || "Usuario";
            if (navAvatar) navAvatar.textContent = data.avatar || "👨‍💻";

            // Llenar Encabezado
            const headerName = document.getElementById('profile-header-name');
            const headerEmail = document.getElementById('profile-header-email');
            const headerAvatar = document.getElementById('profile-avatar-display');

            if (headerName) headerName.textContent = data.name || "Usuario";
            if (headerEmail) headerEmail.textContent = currentUser.email;
            if (headerAvatar) headerAvatar.textContent = data.avatar || "👨‍💻";

            // Llenar Formulario de Perfil
            const inputName = document.getElementById('profile-name');
            const inputUser = document.getElementById('profile-user');
            const inputEmail = document.getElementById('profile-email');

            if (inputName) inputName.value = data.name || '';
            if (inputUser) inputUser.value = data.user || '';
            if (inputEmail) inputEmail.value = currentUser.email;

            // Seleccionar Avatar en Radio
            const avatarRadio = document.querySelector(`input[name="avatar"][value="${data.avatar}"]`);
            if (avatarRadio) avatarRadio.checked = true;
        }
    } catch (err) {
        console.error("Error al cargar perfil:", err);
    }

    // Inicializar tarjeta de tema activa y botón de animación de fondo
    highlightActiveThemeCard();
    updateBgBtnState();
}

initPerfilPage();

// Cierre de sesión
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");

// 1. ACTUALIZACIÓN DE DATOS PERSONALES Y AVATAR
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profile-msg');
        if (msg) { msg.textContent = "Guardando cambios..."; msg.className = "text-xs font-semibold mt-2 text-indigo-400"; }

        try {
            const name = document.getElementById('profile-name').value;
            const user = document.getElementById('profile-user').value;
            const avatarChecked = document.querySelector('input[name="avatar"]:checked');
            const avatar = avatarChecked ? avatarChecked.value : '👨‍💻';

            await updateDoc(doc(db, "users", currentUser.uid), { name, user, avatar });

            // Actualizar vista inmediatamente
            const navName = document.getElementById('nav-name');
            const navAvatar = document.getElementById('nav-avatar');
            const headerName = document.getElementById('profile-header-name');
            const headerAvatar = document.getElementById('profile-avatar-display');

            if (navName) navName.textContent = name;
            if (navAvatar) navAvatar.textContent = avatar;
            if (headerName) headerName.textContent = name;
            if (headerAvatar) headerAvatar.textContent = avatar;

            if (msg) {
                msg.textContent = "¡Perfil actualizado con éxito!";
                msg.className = "text-xs font-semibold mt-2 text-emerald-500";
            }
        } catch (err) {
            console.error(err);
            if (msg) {
                msg.textContent = "Error al actualizar perfil: " + err.message;
                msg.className = "text-xs font-semibold mt-2 text-rose-500";
            }
        }
    };
}

// 2. CAMBIO DE CONTRASEÑA
const passwordForm = document.getElementById('password-form');
if (passwordForm) {
    passwordForm.onsubmit = async (e) => {
        e.preventDefault();
        const msg = document.getElementById('password-msg');
        const currentPass = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass !== confirmPass) {
            if (msg) { msg.textContent = "Las contraseñas nuevas no coinciden."; msg.className = "text-xs font-semibold mt-2 text-rose-500"; }
            return;
        }

        if (msg) { msg.textContent = "Verificando credenciales..."; msg.className = "text-xs font-semibold mt-2 text-indigo-400"; }

        try {
            // Re-autenticar al usuario por seguridad
            const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
            await reauthenticateWithCredential(currentUser, credential);

            // Actualizar la contraseña
            await updatePassword(currentUser, newPass);

            passwordForm.reset();
            if (msg) {
                msg.textContent = "¡Contraseña actualizada correctamente!";
                msg.className = "text-xs font-semibold mt-2 text-emerald-500";
            }
        } catch (err) {
            console.error(err);
            if (msg) {
                msg.textContent = "Error al cambiar contraseña: " + err.message;
                msg.className = "text-xs font-semibold mt-2 text-rose-500";
            }
        }
    };
}

// 3. CORREO DE RESTABLECIMIENTO DE CONTRASEÑA
const btnSendReset = document.getElementById('btn-send-reset-email');
if (btnSendReset) {
    btnSendReset.onclick = async () => {
        if (!currentUser || !currentUser.email) return;
        try {
            await sendPasswordResetEmail(auth, currentUser.email);
            alert(`Se ha enviado un correo de recuperación a ${currentUser.email}. Revisa tu bandeja de entrada.`);
        } catch (err) {
            alert("Error al enviar correo: " + err.message);
        }
    };
}

// 4. CONTROL DE ANIMACIÓN DEL FONDO (PARTÍCULAS)
const btnToggleBg = document.getElementById('btn-toggle-bg-anim');

function updateBgBtnState() {
    const isDisabled = localStorage.getItem('app_bg_anim') === 'disabled';
    if (btnToggleBg) {
        btnToggleBg.textContent = isDisabled ? "Activar Fondo Animado" : "Desactivar Animación (Fondo Fijo)";
    }
}

if (btnToggleBg) {
    btnToggleBg.onclick = () => {
        const isDisabled = localStorage.getItem('app_bg_anim') === 'disabled';
        localStorage.setItem('app_bg_anim', isDisabled ? 'enabled' : 'disabled');
        updateBgBtnState();
        window.dispatchEvent(new Event('bgAnimChanged'));
    };
}

// 5. SELECCIÓN DE TEMA VISUAL
window.selectAppTheme = (themeId) => {
    applyTheme(themeId);
    highlightActiveThemeCard();
    window.dispatchEvent(new Event('themeChanged'));
};

function highlightActiveThemeCard() {
    const currentTheme = getSavedTheme();
    document.querySelectorAll('.theme-option-card').forEach(card => {
        const tid = card.getAttribute('data-theme-id');
        if (tid === currentTheme) {
            card.classList.add('border-2', 'border-indigo-500', 'ring-2', 'ring-indigo-500/30');
        } else {
            card.classList.remove('border-2', 'border-indigo-500', 'ring-2', 'ring-indigo-500/30');
        }
    });
}