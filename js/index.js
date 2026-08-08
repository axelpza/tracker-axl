import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let isRegister = false;
const msg = document.getElementById('msg');

async function checkSession() {
    await auth.authStateReady();
    if (auth.currentUser) {
        window.location.href = "dashboard.html";
    }
}
checkSession();

document.getElementById('toggle-mode').onclick = () => {
    isRegister = !isRegister;
    msg.textContent = "";
    document.getElementById('form-title').textContent = isRegister ? "Crear Cuenta" : "Iniciar Sesión";
    document.getElementById('submit-btn').textContent = isRegister ? "Registrarse" : "Ingresar";
    document.getElementById('toggle-mode').textContent = isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
    document.getElementById('register-fields').classList.toggle('hidden', !isRegister);
};

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        if (isRegister) {
            const name = document.getElementById('reg-name').value;
            const user = document.getElementById('reg-user').value;
            const avatar = document.querySelector('input[name="avatar"]:checked').value;
            
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", cred.user.uid), { name, user, email, avatar });
            window.location.href = "dashboard.html";
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        }
    } catch (err) {
        console.error(err);
        msg.textContent = "Error: " + err.message;
    }
};

document.getElementById('forgot-pass').onclick = async () => {
    const email = prompt("Ingresa tu correo electrónico para restablecer la contraseña:");
    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Correo de recuperación enviado. Revisa tu bandeja.");
        } catch (err) {
            alert("Error: " + err.message);
        }
    }
};