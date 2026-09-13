console.log("APP JS LOADED");
// ===============================
// Auto Login
// ===============================
const currentUser =
    localStorage.getItem("currentUser") ||
    sessionStorage.getItem("currentUser");
if (currentUser) {
    let redirectTo = "dashboard.html";
    try {
        const parsedUser = JSON.parse(currentUser);
        if (parsedUser.role === "vo" || parsedUser.role === "vi") {
            redirectTo = "monthly-report.html";
        }
    } catch (e) {
        // malformed storage — fall back to dashboard.html as before
    }
    window.location.href = redirectTo;
}
// ===============================
// Remember Me
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const savedUsername =
        localStorage.getItem("rememberUsername");
    if (savedUsername) {
        document.getElementById("username").value =
            savedUsername;
        document.getElementById("rememberMe").checked = true;
    }
});
document
    .getElementById("loginBtn")
    .addEventListener("click", login);

async function login() {
console.log("Login button clicked");
const loginBtn = document.getElementById("loginBtn");
loginBtn.disabled = true;
loginBtn.innerHTML = "Signing In...";
    const username =
        document.getElementById("username").value.trim();
    const password =
        document.getElementById("password").value.trim();
    if (!username || !password) {
        alert("Please enter Username and Password.");
loginBtn.disabled = false;
loginBtn.innerHTML = "Login";
        return;
    }

    // -----------------------------------------------------
    // Step 1: Find out whether this is a legacy or migrated
    // account WITHOUT ever selecting the users table directly
    // (RLS blocks that for anon; use the RPCs instead).
    // -----------------------------------------------------
    const { data: accountRows, error: accountError } =
        await db.rpc("get_account_type", { p_username: username });

    const account = accountRows?.[0];

    if (accountError || !account || !account.is_active) {
        alert("Invalid Username or Password.");
        loginBtn.disabled = false;
        loginBtn.innerHTML = "Login";
        return;
    }

    let data = null;

    // -----------------------------------------------------
    // Step 2a: MIGRATED account -> use Supabase Auth
    // -----------------------------------------------------
    if (account.is_migrated) {

        const authEmail = `${username}@gmail.com`;

        const { data: authData, error: authError } =
            await db.auth.signInWithPassword({
                email: authEmail,
                password: password
            });

        if (authError || !authData?.user) {
            alert("Invalid Username or Password.");
            loginBtn.disabled = false;
            loginBtn.innerHTML = "Login";
            return;
        }

        // After signing in, the users row is now readable under RLS
        // (auth_user_id = auth.uid()), so we can select it normally.
        const { data: profile, error: profileError } = await db
            .from("users")
            .select(`
                id, full_name, username, role, institution_id,
                institutions ( institution_name )
            `)
            .eq("username", username)
            .single();

        if (profileError || !profile) {
            alert("Login succeeded but the profile could not be loaded.");
            loginBtn.disabled = false;
            loginBtn.innerHTML = "Login";
            return;
        }

        data = profile;

    // -----------------------------------------------------
    // Step 2b: LEGACY account -> RPC-based password compare
    //   (password is checked server-side; never leaves the DB)
    // -----------------------------------------------------
    } else {

        const { data: legacyRows, error: legacyError } =
            await db.rpc("login_with_password", {
                p_username: username,
                p_password: password
            });

        const legacyUser = legacyRows?.[0];

        if (legacyError || !legacyUser) {
            alert("Invalid Username or Password.");
            loginBtn.disabled = false;
            loginBtn.innerHTML = "Login";
            return;
        }

        data = {
            id: legacyUser.id,
            full_name: legacyUser.full_name,
            username: legacyUser.username,
            role: legacyUser.role,
            institution_id: legacyUser.institution_id,
            institutions: { institution_name: legacyUser.institution_name }
        };
    }

    const userData = {
    id: data.id,
    full_name: data.full_name,
    username: data.username,
    role: data.role,
    institution: data.institutions?.institution_name || "",
    institution_id: data.institution_id
};
const remember =
    document.getElementById("rememberMe").checked;
if (remember) {
    localStorage.setItem(
        "currentUser",
        JSON.stringify(userData)
    );
} else {
    sessionStorage.setItem(
        "currentUser",
        JSON.stringify(userData)
    );
}
// ===============================
// Remember Me
// ===============================
if (document.getElementById("rememberMe").checked) {
    localStorage.setItem(
        "rememberUsername",
        username
    );
} else {
    localStorage.removeItem(
        "rememberUsername"
    );
}
loginBtn.innerHTML="Success...";
    window.location.href =
        (userData.role === "vo" || userData.role === "vi")
            ? "monthly-report.html"
            : "dashboard.html";
}
// ======================================
// Show / Hide Password
// ======================================
const togglePassword =
    document.getElementById("togglePassword");
const password =
    document.getElementById("password");
if (togglePassword && password) {
    togglePassword.addEventListener("click", function () {
        if (password.type === "password") {
            password.type = "text";
            togglePassword.classList.remove("fa-eye");
            togglePassword.classList.add("fa-eye-slash");
        } else {
            password.type = "password";
            togglePassword.classList.remove("fa-eye-slash");
            togglePassword.classList.add("fa-eye");
        }
    });
}
document.addEventListener("keypress",function(e){
    if(e.key==="Enter"){
        login();
    }
});