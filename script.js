// ======================================================
// FIREBASE
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// CONFIGURAÇÃO DO FIREBASE
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyDIAiT6SYBAr57Bw39kgIdhBXp4B4wrmew",
    authDomain: "vitaliia.firebaseapp.com",
    projectId: "vitaliia",
    storageBucket: "vitaliia.firebasestorage.app",
    messagingSenderId: "252516916173",
    appId: "1:252516916173:web:57930c79657f174e15c284",
    measurementId: "G-V0T58Z297J"
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);

const db = getFirestore(firebaseApp);


// ======================================================
// ESTADO DE AUTENTICAÇÃO
// ======================================================

let currentUser = null;
let authReady = false;
let dataReady = false;


// ======================================================
// DADOS DO USUÁRIO
// ======================================================

let userData = {
    calories: 0,
    calorieGoal: 0,

    protein: 0,
    carbs: 0,
    fat: 0,

    weight: 0,
    targetWeight: 0,

    streak: 0
};


// ======================================================
// REFEIÇÕES
// ======================================================

let meals = [];


// ======================================================
// ESTADO DO APLICATIVO
// ======================================================

let currentTab = "inicio";

let analysis = false;
let added = false;

let selectedImage = null;
let selectedFile = null;

let aiResult = null;
let isAnalyzing = false;


// ======================================================
// INPUT DE ARQUIVO
// ======================================================

const fileInput = document.createElement("input");

fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";


// ======================================================
// DADOS PADRÃO DE UMA CONTA NOVA
// ======================================================

function getDefaultUserData() {

    return {
        calories: 0,
        calorieGoal: 0,

        protein: 0,
        carbs: 0,
        fat: 0,

        weight: 0,
        targetWeight: 0,

        streak: 0
    };
}


// ======================================================
// GERAR ID DA REFEIÇÃO
// ======================================================

function generateMealId() {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();
    }

    return (
        `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`
    );
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    document.body.appendChild(fileInput);

    fileInput.addEventListener(
        "change",
        handleFileSelect
    );

    onAuthStateChanged(auth, async (user) => {

        currentUser = user;

        authReady = true;

        if (user) {

            dataReady = false;

            renderLoading();

            try {

                await loadUserData();

                dataReady = true;

                render();

            } catch (error) {

                console.error(
                    "Erro ao carregar dados do usuário:",
                    error
                );

                dataReady = true;

                alert(
                    "Não foi possível carregar seus dados."
                );

                render();
            }

        } else {

            dataReady = false;

            resetLocalState();

            renderLogin();
        }
    });
});


// ======================================================
// LOADING
// ======================================================

function renderLoading() {

    document.body.innerHTML = `
        <main class="app-shell">

            <section class="phone-frame login-phone">

                <div class="login-screen">

                    <div class="login-brand">

                        <div class="login-logo">
                            ✦
                        </div>

                        <p>
                            VITALI.IA
                        </p>

                        <h1>
                            Carregando...
                        </h1>

                        <span>
                            Preparando seus dados.
                        </span>

                    </div>

                </div>

            </section>

        </main>
    `;
}


// ======================================================
// CARREGAR DADOS DO FIRESTORE
// ======================================================

async function loadUserData() {

    if (!currentUser) {
        return;
    }

    const userRef = doc(
        db,
        "users",
        currentUser.uid
    );

    const snapshot = await getDoc(userRef);


    // --------------------------------------------------
    // CONTA NOVA
    // --------------------------------------------------

    if (!snapshot.exists()) {

        userData = getDefaultUserData();

        meals = [];

        await setDoc(userRef, {
            ...userData,
            meals: []
        });

        console.log(
            "Novo usuário criado no Firestore."
        );

        return;
    }


    // --------------------------------------------------
    // CONTA EXISTENTE
    // --------------------------------------------------

    const data = snapshot.data();

    userData = {

        calories:
            Number(data.calories) || 0,

        calorieGoal:
            Number(data.calorieGoal) || 0,

        protein:
            Number(data.protein) || 0,

        carbs:
            Number(data.carbs) || 0,

        fat:
            Number(data.fat) || 0,

        weight:
            Number(data.weight) || 0,

        targetWeight:
            Number(data.targetWeight) || 0,

        streak:
            Number(data.streak) || 0
    };


    meals = Array.isArray(data.meals)

        ? data.meals.map(meal => ({

            ...meal,

            id:
                meal.id ||
                generateMealId()

        }))

        : [];


    console.log(
        "Dados carregados:",
        userData,
        meals
    );
}


// ======================================================
// SALVAR DADOS NO FIRESTORE
// ======================================================

async function saveUserData() {

    if (!currentUser) {

        console.warn(
            "Tentativa de salvar sem usuário autenticado."
        );

        return;
    }

    const userRef = doc(
        db,
        "users",
        currentUser.uid
    );

    await setDoc(
        userRef,
        {
            ...userData,
            meals: meals
        },
        {
            merge: true
        }
    );

    console.log(
        "Dados salvos no Firestore."
    );
}


// ======================================================
// RESETAR ESTADO LOCAL
// ======================================================

function resetLocalState() {

    userData = getDefaultUserData();

    meals = [];

    currentTab = "inicio";

    analysis = false;
    added = false;

    selectedImage = null;
    selectedFile = null;

    aiResult = null;
    isAnalyzing = false;
}


// ======================================================
// TELA DE LOGIN
// ======================================================

function renderLogin() {

    document.body.innerHTML = `
        <main class="app-shell">

            <section class="phone-frame login-phone">

                <div class="login-screen">

                    <div class="login-brand">

                        <div class="login-logo">
                            ✦
                        </div>

                        <p>
                            VITALI.IA
                        </p>

                        <h1>
                            Cuide da sua alimentação
                        </h1>

                        <span>
                            Sua alimentação, de um jeito mais inteligente.
                        </span>

                    </div>


                    <form
                        id="loginForm"
                        class="login-form"
                    >

                        <label>
                            E-mail
                        </label>

                        <input
                            id="loginEmail"
                            type="email"
                            placeholder="seu@email.com"
                            autocomplete="email"
                            required
                        >


                        <label>
                            Senha
                        </label>

                        <input
                            id="loginPassword"
                            type="password"
                            placeholder="Sua senha"
                            autocomplete="current-password"
                            required
                        >


                        <p
                            id="authError"
                            class="auth-error"
                        ></p>


                        <button
                            type="submit"
                            class="primary-button"
                            id="loginButton"
                        >
                            Entrar
                        </button>

                    </form>


                    <div class="login-divider">
                        <span>ou</span>
                    </div>


                    <button
                        type="button"
                        class="secondary-auth-button"
                        id="registerButton"
                    >
                        Criar uma conta
                    </button>


                    <p class="login-footer">
                        Ao continuar, você concorda com os termos
                        de uso da Vitali.IA.
                    </p>

                </div>

            </section>

        </main>
    `;

    bindLoginEvents();
}


// ======================================================
// EVENTOS DO LOGIN
// ======================================================

function bindLoginEvents() {

    const loginForm =
        document.getElementById("loginForm");

    const registerButton =
        document.getElementById("registerButton");


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();

                const email =
                    document
                        .getElementById("loginEmail")
                        .value
                        .trim();

                const password =
                    document
                        .getElementById("loginPassword")
                        .value;

                await loginUser(
                    email,
                    password
                );
            }
        );
    }


    if (registerButton) {

        registerButton.addEventListener(
            "click",
            showRegisterScreen
        );
    }
}


// ======================================================
// LOGIN
// ======================================================

async function loginUser(
    email,
    password
) {

    const button =
        document.getElementById(
            "loginButton"
        );

    const error =
        document.getElementById(
            "authError"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Entrando...";
    }


    if (error) {
        error.textContent = "";
    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

    } catch (err) {

        console.error(
            "Erro no login:",
            err
        );

        if (error) {

            error.textContent =
                getAuthErrorMessage(err);
        }


        if (button) {

            button.disabled = false;

            button.textContent =
                "Entrar";
        }
    }
}


// ======================================================
// TELA DE CADASTRO
// ======================================================

function showRegisterScreen() {

    document.body.innerHTML = `
        <main class="app-shell">

            <section class="phone-frame login-phone">

                <div class="login-screen">

                    <div class="login-brand">

                        <div class="login-logo">
                            ✦
                        </div>

                        <p>
                            VITALI.IA
                        </p>

                        <h1>
                            Crie sua conta
                        </h1>

                        <span>
                            Comece a acompanhar sua alimentação.
                        </span>

                    </div>


                    <form
                        id="registerForm"
                        class="login-form"
                    >

                        <label>
                            E-mail
                        </label>

                        <input
                            id="registerEmail"
                            type="email"
                            placeholder="seu@email.com"
                            autocomplete="email"
                            required
                        >


                        <label>
                            Senha
                        </label>

                        <input
                            id="registerPassword"
                            type="password"
                            placeholder="Mínimo de 6 caracteres"
                            autocomplete="new-password"
                            minlength="6"
                            required
                        >


                        <label>
                            Confirmar senha
                        </label>

                        <input
                            id="registerPasswordConfirm"
                            type="password"
                            placeholder="Digite a senha novamente"
                            autocomplete="new-password"
                            minlength="6"
                            required
                        >


                        <p
                            id="authError"
                            class="auth-error"
                        ></p>


                        <button
                            type="submit"
                            class="primary-button"
                            id="registerSubmitButton"
                        >
                            Criar conta
                        </button>

                    </form>


                    <button
                        type="button"
                        class="text-auth-button"
                        id="backToLoginButton"
                    >
                        Já tenho uma conta
                    </button>

                </div>

            </section>

        </main>
    `;


    const form =
        document.getElementById(
            "registerForm"
        );

    const backButton =
        document.getElementById(
            "backToLoginButton"
        );


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "registerEmail"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    .value;


            const confirmPassword =
                document
                    .getElementById(
                        "registerPasswordConfirm"
                    )
                    .value;


            const error =
                document.getElementById(
                    "authError"
                );


            if (
                password !==
                confirmPassword
            ) {

                error.textContent =
                    "As senhas não são iguais.";

                return;
            }


            const button =
                document.getElementById(
                    "registerSubmitButton"
                );


            button.disabled = true;

            button.textContent =
                "Criando conta...";

            error.textContent = "";


            try {

                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            } catch (err) {

                console.error(
                    "Erro no cadastro:",
                    err
                );

                error.textContent =
                    getAuthErrorMessage(err);

                button.disabled = false;

                button.textContent =
                    "Criar conta";
            }
        }
    );


    backButton.addEventListener(
        "click",
        renderLogin
    );
}


// ======================================================
// MENSAGENS DO FIREBASE
// ======================================================

function getAuthErrorMessage(error) {

    switch (error.code) {

        case "auth/invalid-email":
            return "Digite um e-mail válido.";

        case "auth/user-not-found":
            return "Não existe uma conta com esse e-mail.";

        case "auth/wrong-password":
            return "Senha incorreta.";

        case "auth/invalid-credential":
            return "E-mail ou senha incorretos.";

        case "auth/email-already-in-use":
            return "Esse e-mail já está cadastrado.";

        case "auth/weak-password":
            return "A senha precisa ter pelo menos 6 caracteres.";

        case "auth/too-many-requests":
            return "Muitas tentativas. Aguarde alguns minutos.";

        default:
            return "Não foi possível realizar a operação.";
    }
}


// ======================================================
// LOGOUT
// ======================================================

async function logoutUser() {

    try {

        await signOut(auth);

    } catch (error) {

        console.error(
            "Erro ao sair:",
            error
        );

        alert(
            "Não foi possível sair da conta."
        );
    }
}


// ======================================================
// ÍCONES
// ======================================================

function icon(
    name,
    size = 22
) {

    const paths = {

        home: `
            <path d="M3 11.5 12 4l9 7.5"/>
            <path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/>
        `,

        diary: `
            <rect x="5" y="3" width="14" height="18" rx="2"/>
            <path d="M9 3v18M12 8h4M12 12h4"/>
        `,

        camera: `
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/>
            <circle cx="12" cy="13" r="3.5"/>
        `,

        user: `
            <circle cx="12" cy="8" r="4"/>
            <path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>
        `,

        flame: `
            <path d="M13 22c4-1.2 7-4.2 7-8.2 0-3.6-2-6.8-5.2-9.8.2 3-1.3 5-2.7 6.3.1-2.9-1.7-5.3-4.1-7.3.3 4.2-4 6.7-4 11.2 0 3.8 2.6 6.7 6.4 7.8-1.3-1.1-2-2.4-2-4 0-1.7.9-3 2.4-4.3 0 2 1.1 3.1 2.1 3.8.4-1.4 1.2-2.4 2.2-3.3.3 2.7 1.2 5.2 2 7.8Z"/>
        `,

        plus: `
            <path d="M12 5v14M5 12h14"/>
        `,

        trash: `
            <path d="M4 7h16"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M6 7l1 14h10l1-14"/>
            <path d="M9 7V4h6v3"/>
        `,

        chevron: `
            <path d="m9 18 6-6-6-6"/>
        `,

        spark: `
            <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/>
            <path d="m18.5 13 .7 2.3 2.3.7-.2.7-2.1.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"/>
        `,

        check: `
            <path d="m5 12 4 4L19 6"/>
        `,

        back: `
            <path d="m15 18-6-6 6-6"/>
        `
    };


    return `
        <svg
            width="${size}"
            height="${size}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            ${paths[name] || ""}
        </svg>
    `;
}


// ======================================================
// HEADER
// ======================================================

function Header(
    eyebrow,
    title
) {

    const userName =
        currentUser?.email
            ? currentUser.email.split("@")[0]
            : "Usuário";


    return `
        <header class="topbar">

            <div>

                <p>
                    ${eyebrow}
                </p>

                <h1>
                    ${title}
                </h1>

            </div>


            <button
                class="avatar"
                aria-label="Abrir perfil"
            >
                ${userName.substring(0, 2).toUpperCase()}
            </button>

        </header>
    `;
}


// ======================================================
// FORMATAR NÚMERO
// ======================================================

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("pt-BR");
}


// ======================================================
// HOME
// ======================================================

function HomeScreen() {

    const userName =
        currentUser?.email
            ? currentUser.email.split("@")[0]
            : "Usuário";


    const calories =
        Number(userData.calories) || 0;

    const calorieGoal =
        Number(userData.calorieGoal) || 0;


    const caloriePercentage =
        calorieGoal > 0
            ? Math.min(
                Math.round(
                    (calories / calorieGoal) * 100
                ),
                100
            )
            : 0;


    const remainingCalories =
        calorieGoal > 0
            ? Math.max(
                calorieGoal - calories,
                0
            )
            : 0;


    const protein =
        Number(userData.protein) || 0;

    const carbs =
        Number(userData.carbs) || 0;

    const fat =
        Number(userData.fat) || 0;


    return `
        <div class="screen page-enter">

            ${Header(
                "ACOMPANHAMENTO",
                `Olá, ${userName}`
            )}


            <section class="hero-card">

                <div class="hero-top">

                    <div>

                        <span class="chip">
                            ${icon("spark", 14)}
                            META DE HOJE
                        </span>

                        <h2>

                            ${formatNumber(calories)}

                            <small>
                                ${
                                    calorieGoal > 0
                                        ? `de ${formatNumber(calorieGoal)} kcal`
                                        : "kcal consumidas"
                                }
                            </small>

                        </h2>

                    </div>


                    <div class="cal-ring">

                        <span>
                            ${caloriePercentage}%
                        </span>

                    </div>

                </div>


                <div class="progress">

                    <i
                        style="width:${caloriePercentage}%"
                    ></i>

                </div>


                <div class="macro-row">

                    <div>

                        <b>
                            ${protein}g
                        </b>

                        <span>
                            Proteína
                        </span>

                    </div>


                    <div>

                        <b>
                            ${carbs}g
                        </b>

                        <span>
                            Carboidrato
                        </span>

                    </div>


                    <div>

                        <b>
                            ${fat}g
                        </b>

                        <span>
                            Gordura
                        </span>

                    </div>

                </div>

            </section>


            <button
                class="scan-cta"
                id="scanButton"
            >

                <span class="scan-icon">
                    ${icon("camera", 28)}
                </span>

                <span>

                    <b>
                        Analisar minha refeição
                    </b>

                    <small>
                        Tire uma foto e deixe a IA calcular
                    </small>

                </span>

                ${icon("chevron")}

            </button>


            <section class="section-head">

                <div>

                    <p>
                        SEU DIA
                    </p>

                    <h2>
                        Refeições
                    </h2>

                </div>

                <button id="diaryButton">
                    Ver diário
                </button>

            </section>


            <div class="meal-list">

                ${
                    meals.length > 0

                        ? meals.map(meal => `

                            <article
                                class="meal-card"
                            >

                                <span class="food-emoji">
                                    ${meal.emoji || "🍽️"}
                                </span>

                                <div class="meal-copy">

                                    <div>

                                        <b>
                                            ${meal.title || "Refeição"}
                                        </b>

                                        <time>
                                            ${meal.time || "--:--"}
                                        </time>

                                    </div>

                                    <p>
                                        ${meal.desc || "Refeição registrada"}
                                    </p>

                                </div>

                                <strong>

                                    ${formatNumber(meal.kcal)}

                                    <small>
                                        kcal
                                    </small>

                                </strong>

                            </article>

                        `).join("")

                        : `

                            <div class="empty-state">

                                <p>
                                    Nenhuma refeição registrada hoje.
                                </p>

                                <small>
                                    Analise uma foto para adicionar sua primeira refeição.
                                </small>

                            </div>

                        `
                }

            </div>


            <section class="insight-card">

                <span>
                    ${icon("spark")}
                </span>

                <div>

                    <p>
                        INSIGHT DA VITALI.IA
                    </p>

                    ${
                        calorieGoal > 0

                            ? `

                                <b>
                                    ${
                                        remainingCalories > 0
                                            ? `Você ainda tem ${formatNumber(remainingCalories)} kcal disponíveis hoje.`
                                            : "Sua meta calórica de hoje foi atingida."
                                    }
                                </b>

                                <small>
                                    Continue registrando suas refeições para acompanhar seu dia.
                                </small>

                            `

                            : `

                                <b>
                                    Sua alimentação começa aqui.
                                </b>

                                <small>
                                    Registre uma refeição ou configure sua meta para acompanhar seu progresso.
                                </small>

                            `
                    }

                </div>

            </section>

        </div>
    `;
}


// ======================================================
// DIÁRIO
// ======================================================

function DiaryScreen() {

    const days = [
        "S",
        "T",
        "Q",
        "Q",
        "S",
        "S",
        "D"
    ];


    const today = new Date();

    const currentDay =
        today.getDate();


    const calories =
        Number(userData.calories) || 0;

    const calorieGoal =
        Number(userData.calorieGoal) || 0;


    const remaining =
        calorieGoal > 0
            ? Math.max(
                calorieGoal - calories,
                0
            )
            : 0;


    return `
        <div class="screen page-enter">

            ${Header(
                "ACOMPANHAMENTO",
                "Meu diário"
            )}


            <div class="week-strip">

                ${days.map((day, i) => {

                    const date =
                        new Date();

                    date.setDate(
                        currentDay -
                        (
                            date.getDay() === 0
                                ? 6
                                : date.getDay() - 1
                        ) +
                        i
                    );


                    return `
                        <button
                            class="${
                                i === (
                                    today.getDay() === 0
                                        ? 6
                                        : today.getDay() - 1
                                )
                                    ? "active"
                                    : ""
                            }"
                        >

                            <span>
                                ${day}
                            </span>

                            <b>
                                ${date.getDate()}
                            </b>

                        </button>
                    `;

                }).join("")}

            </div>


            <section class="diary-summary">

                <div>

                    ${icon("flame")}

                    <span>

                        <b>
                            ${formatNumber(calories)} kcal
                        </b>

                        <small>
                            consumidas hoje
                        </small>

                    </span>

                </div>


                <strong>

                    ${
                        calorieGoal > 0
                            ? formatNumber(remaining)
                            : "—"
                    }

                    <small>
                        restantes
                    </small>

                </strong>

            </section>


            <div class="section-head compact">

                <div>

                    <p>
                        REGISTROS
                    </p>

                    <h2>
                        Refeições de hoje
                    </h2>

                </div>

                <button
                    id="diaryAddButton"
                >
                    ${icon("plus", 18)}
                    Adicionar
                </button>

            </div>


            <div class="meal-list detailed">

                ${
                    meals.length > 0

                        ? meals.map(meal => `

                            <article
                                class="meal-card"
                            >

                                <span class="food-emoji">
                                    ${meal.emoji || "🍽️"}
                                </span>


                                <div class="meal-copy">

                                    <div>

                                        <b>
                                            ${meal.title || "Refeição"}
                                        </b>

                                        <time>
                                            ${meal.time || "--:--"}
                                        </time>

                                    </div>


                                    <p>
                                        ${meal.desc || "Refeição registrada"}
                                    </p>


                                    <div class="mini-macros">

                                        <span>
                                            P ${Number(meal.protein) || 0}g
                                        </span>

                                        <span>
                                            C ${Number(meal.carbs) || 0}g
                                        </span>

                                        <span>
                                            G ${Number(meal.fat) || 0}g
                                        </span>

                                    </div>

                                </div>


                                <strong>

                                    ${formatNumber(meal.kcal)}

                                    <small>
                                        kcal
                                    </small>

                                </strong>


                                <button
                                    class="delete-meal-button"
                                    data-meal-id="${meal.id}"
                                    type="button"
                                    aria-label="Remover refeição"
                                    title="Remover refeição"
                                >
                                    ${icon("trash", 18)}
                                </button>

                            </article>

                        `).join("")

                        : `

                            <div class="empty-state">

                                <p>
                                    Nenhuma refeição registrada.
                                </p>

                                <small>
                                    Clique em "Adicionar" ou use a análise por IA.
                                </small>

                            </div>

                        `
                }

            </div>

        </div>
    `;
}


// ======================================================
// CÂMERA
// ======================================================

function CameraScreen() {

    return `
        <div class="screen camera-page page-enter">

            <header class="simple-header">

                <p>
                    ANÁLISE COM IA
                </p>

                <h1>
                    Fotografe sua refeição
                </h1>

            </header>


            <div class="viewfinder">

                ${
                    selectedImage

                        ? `

                            <img
                                src="${selectedImage}"
                                class="selected-photo"
                                alt="Foto selecionada"
                            >

                            <div class="photo-overlay">
                                Foto selecionada
                            </div>

                        `

                        : `

                            <div class="plate">
                                <span>🥗</span>
                            </div>

                            <i class="c1"></i>
                            <i class="c2"></i>
                            <i class="c3"></i>
                            <i class="c4"></i>

                            <span class="focus-label">
                                Centralize o prato
                            </span>

                        `
                }

            </div>


            <p class="camera-hint">

                ${
                    selectedImage
                        ? "Foto pronta. Clique no botão para analisar com a IA."
                        : "Use boa iluminação e deixe todos os alimentos visíveis."
                }

            </p>


            <button
                class="shutter"
                id="shutterButton"
                aria-label="Selecionar foto"
            >

                <span>
                    ${icon("camera", 30)}
                </span>

            </button>


            <button
                class="gallery-link"
                id="galleryButton"
            >
                Escolher da galeria
            </button>


            ${
                selectedImage

                    ? `

                        <button
                            class="primary-button"
                            id="analyzeButton"
                            ${isAnalyzing ? "disabled" : ""}
                        >

                            ${
                                isAnalyzing
                                    ? "Analisando..."
                                    : `${icon("spark")} Analisar com IA`
                            }

                        </button>

                    `

                    : ""
            }

        </div>
    `;
}


// ======================================================
// TELA DE ANÁLISE
// ======================================================

function AnalysisScreen() {

    const foods =
        aiResult?.foods || [];


    const totalCalories =
        aiResult?.calories ?? 0;


    const protein =
        aiResult?.protein ?? 0;


    const carbs =
        aiResult?.carbs ?? 0;


    const fat =
        aiResult?.fat ?? 0;


    const confidence =
        aiResult?.confidence ?? 0;


    return `
        <div class="screen analysis-page page-enter">

            <header class="analysis-header">

                <button id="backButton">
                    ${icon("back")}
                </button>

                <div>

                    <p>
                        ANÁLISE CONCLUÍDA
                    </p>

                    <h1>
                        Sua refeição
                    </h1>

                </div>

                <span></span>

            </header>


            <div class="result-photo">

                ${
                    selectedImage

                        ? `

                            <img
                                src="${selectedImage}"
                                class="uploaded-photo"
                                alt="Refeição analisada"
                            >

                        `

                        : `

                            <span>
                                🍛
                            </span>

                        `
                }


                <div class="ai-badge">

                    ${icon("spark", 16)}

                    Analisado por IA

                </div>

            </div>


            <section class="result-card">

                <div class="result-total">

                    <div>

                        <p>
                            CALORIAS ESTIMADAS
                        </p>

                        <h2>

                            ${formatNumber(totalCalories)}

                            <small>
                                kcal
                            </small>

                        </h2>

                    </div>


                    <span>

                        ${confidence}%

                        <small>
                            confiança
                        </small>

                    </span>

                </div>


                <div class="macro-bars">

                    <div>

                        <span>

                            <b>
                                Proteínas
                            </b>

                            <em>
                                ${protein}g
                            </em>

                        </span>

                        <i>

                            <u
                                style="width:${Math.min(
                                    protein * 1.4,
                                    100
                                )}%"
                            ></u>

                        </i>

                    </div>


                    <div>

                        <span>

                            <b>
                                Carboidratos
                            </b>

                            <em>
                                ${carbs}g
                            </em>

                        </span>

                        <i>

                            <u
                                style="width:${Math.min(
                                    carbs * 1.2,
                                    100
                                )}%"
                            ></u>

                        </i>

                    </div>


                    <div>

                        <span>

                            <b>
                                Gorduras
                            </b>

                            <em>
                                ${fat}g
                            </em>

                        </span>

                        <i>

                            <u
                                style="width:${Math.min(
                                    fat * 2.2,
                                    100
                                )}%"
                            ></u>

                        </i>

                    </div>

                </div>

            </section>


            <div class="detected">

                <div class="section-head compact">

                    <div>

                        <p>
                            IDENTIFICADO PELA IA
                        </p>

                        <h2>
                            Alimentos
                        </h2>

                    </div>

                    <button>
                        Editar
                    </button>

                </div>


                ${
                    foods.length > 0

                        ? foods.map(food => `

                            <div class="detected-row">

                                <span>
                                    ${icon("check", 15)}
                                </span>

                                <div>

                                    <b>
                                        ${food[0] ?? "Alimento"}
                                    </b>

                                    <small>
                                        ${food[1] ?? ""}
                                    </small>

                                </div>

                                <strong>
                                    ${food[2] ?? ""}
                                </strong>

                            </div>

                        `).join("")

                        : `

                            <div class="empty-state">

                                <p>
                                    Nenhum alimento identificado.
                                </p>

                            </div>

                        `
                }

            </div>


            <button
                class="primary-button ${added ? "added" : ""}"
                id="addDiaryButton"
                ${added ? "disabled" : ""}
            >

                ${
                    added

                        ? `${icon("check")} Adicionado ao diário`

                        : `${icon("plus")} Adicionar ao diário`
                }

            </button>


            <p class="disclaimer">

                Valores são estimativas e podem variar conforme
                o preparo e as porções.

            </p>

        </div>
    `;
}


// ======================================================
// PERFIL
// ======================================================

function ProfileScreen() {

    const email =
        currentUser?.email || "Usuário";


    const weight =
        Number(userData.weight) || 0;


    const targetWeight =
        Number(userData.targetWeight) || 0;


    const streak =
        Number(userData.streak) || 0;


    return `
        <div class="screen page-enter">

            ${Header(
                "SUA JORNADA",
                "Meu perfil"
            )}


            <section class="profile-card">

                <div class="profile-avatar">

                    ${email
                        .substring(0, 2)
                        .toUpperCase()}

                </div>


                <h2>
                    ${email.split("@")[0]}
                </h2>


                <p>
                    Configure seus objetivos
                </p>


                <div>

                    <span>

                        <b>

                            ${
                                weight > 0
                                    ? `${weight.toFixed(1).replace(".", ",")} kg`
                                    : "—"
                            }

                        </b>

                        <small>
                            Peso atual
                        </small>

                    </span>


                    <span>

                        <b>

                            ${
                                targetWeight > 0
                                    ? `${targetWeight.toFixed(1).replace(".", ",")} kg`
                                    : "—"
                            }

                        </b>

                        <small>
                            Objetivo
                        </small>

                    </span>


                    <span>

                        <b>
                            ${streak} dias
                        </b>

                        <small>
                            Sequência
                        </small>

                    </span>

                </div>

            </section>


            <button
                class="logout-button"
                id="logoutButton"
            >
                Sair da conta
            </button>

        </div>
    `;
}


// ======================================================
// MENU INFERIOR
// ======================================================

function BottomNav() {

    const items = [

        [
            "inicio",
            "home",
            "Início"
        ],

        [
            "diario",
            "diary",
            "Diário"
        ],

        [
            "camera",
            "camera",
            "Foto"
        ],

        [
            "perfil",
            "user",
            "Perfil"
        ]

    ];


    return `
        <nav class="bottom-nav">

            ${items.map(item => {

                const [
                    id,
                    iconName,
                    label
                ] = item;


                return `

                    <button
                        data-tab="${id}"
                        class="${
                            currentTab === id
                                ? "active"
                                : ""
                        } ${
                            id === "camera"
                                ? "camera-tab"
                                : ""
                        }"
                    >

                        <span>
                            ${icon(iconName)}
                        </span>

                        <small>
                            ${label}
                        </small>

                    </button>

                `;

            }).join("")}

        </nav>
    `;
}


// ======================================================
// RENDERIZAÇÃO
// ======================================================

function render() {

    if (
        !authReady ||
        !currentUser ||
        !dataReady
    ) {

        if (!currentUser) {
            renderLogin();
        }

        return;
    }


    let phone =
        document.querySelector(
            ".phone-frame"
        );


    if (!phone) {

        document.body.innerHTML = `
            <main class="app-shell">

                <section class="phone-frame"></section>

            </main>
        `;

        phone =
            document.querySelector(
                ".phone-frame"
            );
    }


    let content = "";


    if (analysis) {

        content =
            AnalysisScreen();

    } else {

        switch (currentTab) {

            case "inicio":

                content =
                    HomeScreen();

                break;


            case "diario":

                content =
                    DiaryScreen();

                break;


            case "camera":

                content =
                    CameraScreen();

                break;


            case "perfil":

                content =
                    ProfileScreen();

                break;


            default:

                currentTab =
                    "inicio";

                content =
                    HomeScreen();
        }


        content += BottomNav();
    }


    phone.innerHTML =
        content;


    bindEvents();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(tab) {

    currentTab =
        tab;

    analysis =
        false;

    added =
        false;

    render();
}


// ======================================================
// ABRIR SELETOR
// ======================================================

function openFilePicker() {

    fileInput.value = "";

    fileInput.click();
}


// ======================================================
// SELECIONAR IMAGEM
// ======================================================

function handleFileSelect(event) {

    const file =
        event.target.files[0];


    if (!file) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        alert(
            "Por favor, escolha uma imagem."
        );

        fileInput.value = "";

        return;
    }


    const maxSize =
        10 * 1024 * 1024;


    if (file.size > maxSize) {

        alert(
            "A imagem deve ter no máximo 10 MB."
        );

        fileInput.value = "";

        return;
    }


    if (selectedImage) {

        URL.revokeObjectURL(
            selectedImage
        );
    }


    selectedFile =
        file;


    selectedImage =
        URL.createObjectURL(file);


    aiResult =
        null;

    added =
        false;

    isAnalyzing =
        false;

    analysis =
        false;

    currentTab =
        "camera";


    render();


    fileInput.value = "";
}


// ======================================================
// ANALISAR IMAGEM COM IA
// ======================================================

async function analyzeImage() {

    if (!selectedFile) {

        alert(
            "Escolha uma imagem primeiro."
        );

        return;
    }


    if (isAnalyzing) {
        return;
    }


    isAnalyzing =
        true;

    render();


    try {

        const formData =
            new FormData();


        formData.append(
            "image",
            selectedFile
        );


        console.log(
            "Enviando imagem para /api/analyze..."
        );


        const response =
            await fetch(
                "/api/analyze",
                {
                    method: "POST",
                    body: formData
                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Erro ao analisar a imagem."
            );
        }


        aiResult = {

            calories:
                Number(data.calories) || 0,

            protein:
                Number(data.protein) || 0,

            carbs:
                Number(data.carbs) || 0,

            fat:
                Number(data.fat) || 0,

            confidence:
                Number(data.confidence) || 0,

            foods:
                Array.isArray(data.foods)
                    ? data.foods
                    : []
        };


        console.log(
            "Resultado da IA:",
            aiResult
        );


        analysis =
            true;

        currentTab =
            "camera";

        isAnalyzing =
            false;


        render();


    } catch (error) {

        console.error(
            "Erro na análise:",
            error
        );


        isAnalyzing =
            false;


        render();


        alert(
            "Não foi possível analisar a imagem.\n\n" +
            error.message
        );
    }
}


// ======================================================
// ADICIONAR ANÁLISE AO DIÁRIO
// ======================================================

async function addAnalysisToDiary() {

    if (!aiResult) {

        alert(
            "Nenhuma análise disponível."
        );

        return;
    }


    if (!currentUser) {

        alert(
            "Você precisa estar logado."
        );

        return;
    }


    if (added) {
        return;
    }


    const now =
        new Date();


    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");


    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");


    const firstFood =
        aiResult.foods?.[0]?.[0] ||
        "Refeição analisada";


    const meal = {

        id:
            generateMealId(),

        emoji:
            "🍽️",

        title:
            "Refeição",

        time:
            `${hours}:${minutes}`,

        kcal:
            Number(aiResult.calories) || 0,

        desc:
            firstFood,

        protein:
            Number(aiResult.protein) || 0,

        carbs:
            Number(aiResult.carbs) || 0,

        fat:
            Number(aiResult.fat) || 0,

        createdAt:
            new Date().toISOString()
    };


    // --------------------------------------------------
    // ATUALIZA OS DADOS DO USUÁRIO
    // --------------------------------------------------

    meals.push(meal);


    userData.calories +=
        meal.kcal;


    userData.protein +=
        meal.protein;


    userData.carbs +=
        meal.carbs;


    userData.fat +=
        meal.fat;


    try {

        await saveUserData();

        added =
            true;

        render();

    } catch (error) {

        console.error(
            "Erro ao salvar refeição:",
            error
        );


        meals.pop();


        userData.calories -=
            meal.kcal;

        userData.protein -=
            meal.protein;

        userData.carbs -=
            meal.carbs;

        userData.fat -=
            meal.fat;


        alert(
            "Não foi possível salvar a refeição."
        );

        render();
    }
}


// ======================================================
// REMOVER UMA REFEIÇÃO DO DIÁRIO
// ======================================================

async function removeMeal(mealId) {

    if (!currentUser) {

        alert(
            "Você precisa estar logado."
        );

        return;
    }


    const mealIndex =
        meals.findIndex(
            meal =>
                String(meal.id) ===
                String(mealId)
        );


    if (mealIndex === -1) {

        alert(
            "Refeição não encontrada."
        );

        return;
    }


    const meal =
        meals[mealIndex];


    const confirmed =
        confirm(
            `Remover "${meal.title || "esta refeição"}" do diário?`
        );


    if (!confirmed) {
        return;
    }


    // --------------------------------------------------
    // GUARDA O ESTADO ORIGINAL
    // --------------------------------------------------

    const previousMeals =
        [...meals];

    const previousUserData =
        {
            ...userData
        };


    // --------------------------------------------------
    // REMOVE A REFEIÇÃO
    // --------------------------------------------------

    meals.splice(
        mealIndex,
        1
    );


    // --------------------------------------------------
    // SUBTRAI OS VALORES DA REFEIÇÃO
    // --------------------------------------------------

    userData.calories =
        Math.max(
            0,
            Number(userData.calories || 0) -
            Number(meal.kcal || 0)
        );


    userData.protein =
        Math.max(
            0,
            Number(userData.protein || 0) -
            Number(meal.protein || 0)
        );


    userData.carbs =
        Math.max(
            0,
            Number(userData.carbs || 0) -
            Number(meal.carbs || 0)
        );


    userData.fat =
        Math.max(
            0,
            Number(userData.fat || 0) -
            Number(meal.fat || 0)
        );


    try {

        await saveUserData();


        console.log(
            "Refeição removida:",
            meal
        );


        render();


    } catch (error) {

        console.error(
            "Erro ao remover refeição:",
            error
        );


        // --------------------------------------------------
        // RESTAURA SE O FIRESTORE FALHAR
        // --------------------------------------------------

        meals =
            previousMeals;

        userData =
            previousUserData;


        alert(
            "Não foi possível remover a refeição."
        );


        render();
    }
}


// ======================================================
// EVENTOS
// ======================================================

function bindEvents() {

    // ==================================================
    // MENU INFERIOR
    // ==================================================

    document
        .querySelectorAll(
            ".bottom-nav button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const tab =
                        button.dataset.tab;

                    navigate(tab);
                }
            );
        });


    // ==================================================
    // ANALISAR MINHA REFEIÇÃO
    // ==================================================

    const scanButton =
        document.getElementById(
            "scanButton"
        );


    if (scanButton) {

        scanButton.addEventListener(
            "click",
            () => {

                currentTab =
                    "camera";

                analysis =
                    false;

                render();
            }
        );
    }


    // ==================================================
    // DIÁRIO
    // ==================================================

    const diaryButton =
        document.getElementById(
            "diaryButton"
        );


    if (diaryButton) {

        diaryButton.addEventListener(
            "click",
            () => {

                navigate(
                    "diario"
                );
            }
        );
    }


    // ==================================================
    // ADICIONAR PELO DIÁRIO
    // ==================================================

    const diaryAddButton =
        document.getElementById(
            "diaryAddButton"
        );


    if (diaryAddButton) {

        diaryAddButton.addEventListener(
            "click",
            () => {

                currentTab =
                    "camera";

                analysis =
                    false;

                render();
            }
        );
    }


    // ==================================================
    // REMOVER REFEIÇÃO
    // ==================================================

    document
        .querySelectorAll(
            ".delete-meal-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const mealId =
                        button.dataset.mealId;

                    removeMeal(
                        mealId
                    );
                }
            );
        });


    // ==================================================
    // BOTÃO DA CÂMERA
    // ==================================================

    const shutterButton =
        document.getElementById(
            "shutterButton"
        );


    if (shutterButton) {

        shutterButton.addEventListener(
            "click",
            () => {

                if (selectedImage) {

                    analyzeImage();

                } else {

                    openFilePicker();
                }

            }
        );
    }


    // ==================================================
    // GALERIA
    // ==================================================

    const galleryButton =
        document.getElementById(
            "galleryButton"
        );


    if (galleryButton) {

        galleryButton.addEventListener(
            "click",
            () => {

                openFilePicker();

            }
        );
    }


    // ==================================================
    // ANALISAR COM IA
    // ==================================================

    const analyzeButton =
        document.getElementById(
            "analyzeButton"
        );


    if (analyzeButton) {

        analyzeButton.addEventListener(
            "click",
            () => {

                if (!isAnalyzing) {

                    analyzeImage();

                }

            }
        );
    }


    // ==================================================
    // VOLTAR
    // ==================================================

    const backButton =
        document.getElementById(
            "backButton"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                analysis =
                    false;

                currentTab =
                    "camera";

                render();
            }
        );
    }


    // ==================================================
    // ADICIONAR AO DIÁRIO
    // ==================================================

    const addDiaryButton =
        document.getElementById(
            "addDiaryButton"
        );


    if (addDiaryButton) {

        addDiaryButton.addEventListener(
            "click",
            () => {

                if (!added) {

                    addAnalysisToDiary();

                }

            }
        );
    }


    // ==================================================
    // LOGOUT
    // ==================================================

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );
    }
}