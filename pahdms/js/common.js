// =====================================
// V5.1 Session & Security Helpers
// =====================================

function getCurrentUser() {
    const raw = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) {
        clearSession();
        return null;
    }
}

function clearSession() {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser");
}

function requireLogin() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        window.location.replace("login.html");
        return false;
    }
    return true;
}

// Client-side role gate. Database RLS must remain the authoritative control.
function requireRole(...allowedRoles) {
    const user = getCurrentUser();
    if (!user) {
        window.location.replace("login.html");
        return false;
    }
    const role = String(user.role || "").toUpperCase();
    if (!allowedRoles.map(r => String(r).toUpperCase()).includes(role)) {
        alert("You are not authorized to access this module.");
        window.location.replace("dashboard.html");
        return false;
    }
    return true;
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        clearSession();
        localStorage.removeItem("rememberUsername");
        window.location.replace("login.html");
    }
}

// =====================================
// Live Location Reporting
// Sends the current user's device location to the
// user_locations table every 30s while a protected page
// is open, so the Live Tracking page can show it on a map.
// Fails silently if permission is denied / unsupported.
// =====================================
let _liveLocationTimer = null;

function startLiveLocationTracking() {

    const user = getCurrentUser();
    if (!user || !user.id) return;
    if (!navigator.geolocation) return;
    if (_liveLocationTimer) return; // already running on this page

    const pingLocation = () => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (!window.db) return;
                try {
                    await window.db.from("user_locations").upsert({
                        user_id: user.id,
                        full_name: user.full_name || null,
                        role: user.role || null,
                        institution_id: user.institution_id || null,
                        institution_name: user.institution || null,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy || null,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "user_id" });
                } catch (e) {
                    console.warn("Live location update failed:", e);
                }
            },
            (err) => {
                console.warn("Live location not available:", err.message);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
    };

    pingLocation();
    _liveLocationTimer = setInterval(pingLocation, 30000);
}

document.addEventListener("DOMContentLoaded", () => {
    const user = getCurrentUser();
    if (!user || !user.id) return; // no session (e.g. login page) — nothing to gate
    requestLocationAccess();
});

// =====================================
// Mandatory Location Gate
// Blocks the whole page behind an overlay until the browser reports
// a usable device location. Location must stay ON to use the app.
// =====================================
function requestLocationAccess() {

    if (!navigator.geolocation) {
        showLocationGate(
            "This browser does not support location access. Please use a different browser to continue.",
            false
        );
        return;
    }

    navigator.geolocation.getCurrentPosition(
        () => {
            hideLocationGate();
            startLiveLocationTracking();
        },
        (err) => {
            let msg = "Please turn on Location for this app and tap the button below to continue.";
            if (err) {
                if (err.code === 1) {
                    msg = "Location permission is blocked for this site. Please allow location access in your browser's site settings, then tap below.";
                } else if (err.code === 2) {
                    msg = "Location / GPS appears to be turned off on this device. Please turn it on, then tap below.";
                } else if (err.code === 3) {
                    msg = "Could not get a location fix in time. Please check that Location/GPS is on and try again.";
                }
            }
            showLocationGate(msg, true);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
}

function showLocationGate(message, canRetry) {

    let gate = document.getElementById("locationGateOverlay");

    if (!gate) {

        gate = document.createElement("div");
        gate.id = "locationGateOverlay";
        gate.innerHTML = `
            <div class="location-gate-box">
                <i class="fa-solid fa-location-crosshairs"></i>
                <h2>Location Required</h2>
                <p id="locationGateMessage"></p>
                <button id="locationGateRetryBtn" type="button">Turn On &amp; Retry</button>
            </div>
        `;
        document.body.appendChild(gate);

        const style = document.createElement("style");
        style.textContent = `
            #locationGateOverlay{
                position:fixed;inset:0;z-index:99999;
                background:rgba(15,23,32,.94);
                display:flex;align-items:center;justify-content:center;
                padding:20px;
            }
            .location-gate-box{
                background:#fff;border-radius:14px;max-width:380px;width:100%;
                padding:32px 26px;text-align:center;
                box-shadow:0 10px 40px rgba(0,0,0,.35);
                font-family:'Segoe UI',sans-serif;
            }
            .location-gate-box i{font-size:40px;color:#0B6E4F;margin-bottom:14px;display:block;}
            .location-gate-box h2{font-size:20px;color:#222;margin-bottom:10px;}
            .location-gate-box p{font-size:14px;color:#666;line-height:1.5;margin-bottom:20px;}
            .location-gate-box button{
                background:#0B6E4F;color:#fff;border:none;padding:12px 22px;
                border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;width:100%;
            }
            .location-gate-box button:hover{background:#08543b;}
        `;
        document.head.appendChild(style);

        document.getElementById("locationGateRetryBtn")
            .addEventListener("click", requestLocationAccess);
    }

    document.getElementById("locationGateMessage").textContent = message;
    document.getElementById("locationGateRetryBtn").style.display = canRetry ? "block" : "none";
    document.body.style.overflow = "hidden";
}

function hideLocationGate() {
    const gate = document.getElementById("locationGateOverlay");
    if (gate) gate.remove();
    document.body.style.overflow = "";
}

// =====================================
// Role-based Sidebar Visibility
// Hides nav links the current user's role isn't allowed to open.
// This is a UI convenience only — the pages themselves still enforce
// access via requireRole(), which remains the real gate.
// =====================================
const ROLE_RESTRICTED_LINKS = {
    "live-tracking.html": ["district_admin", "block_officer"],
    "dashboard.html": ["district_admin", "block_officer"],
    "institution.html": ["district_admin", "block_officer"],
    "employee_new.html": ["district_admin", "block_officer"],
    "user-management.html": ["district_admin", "block_officer"],
    "reports.html": ["district_admin", "block_officer"]
};

function applyRoleBasedNav() {
    const user = getCurrentUser();
    if (!user) return;
    const role = String(user.role || "").toLowerCase();

    // Normalizes a href to a bare page name so this still matches
    // whether the host serves "live-tracking.html", "/live-tracking",
    // or "live-tracking" (e.g. Netlify's automatic "Pretty URLs").
    function pageNameOf(href) {
        return String(href || "")
            .trim()
            .replace(/^\//, "")
            .replace(/\.html$/i, "");
    }

    Object.keys(ROLE_RESTRICTED_LINKS).forEach(key => {
        const allowedRoles = ROLE_RESTRICTED_LINKS[key];
        if (allowedRoles.includes(role)) return;

        const targetPage = pageNameOf(key);

        document.querySelectorAll(".sidebar a").forEach(link => {
            if (pageNameOf(link.getAttribute("href")) === targetPage) {
                const li = link.closest("li");
                (li || link).style.display = "none";
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", applyRoleBasedNav);

// =====================================
// Logged-in User Info (name + role in header)
// Populates #loggedUserName / #loggedUserRole on any page that has
// them, so pages other than dashboard.html (which already does this
// itself) don't have to duplicate the logic.
// =====================================
function renderLoggedUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById("loggedUserName");
    const roleEl = document.getElementById("loggedUserRole");

    if (nameEl) nameEl.innerText = user.full_name || user.username || "";
    if (roleEl) roleEl.innerText = user.role || "";
}

document.addEventListener("DOMContentLoaded", renderLoggedUserInfo);

// =====================================
// Mobile Navigation (hamburger drawer)
// Injects a hamburger button + overlay on any page that has a
// .sidebar, so it can be shown/hidden off-canvas on small screens.
// The actual off-canvas CSS lives in css/mobile.css.
// =====================================
function setupMobileNav() {

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "mobile-nav-toggle";
    toggleBtn.type = "button";
    toggleBtn.setAttribute("aria-label", "Open menu");
    toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';

    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";

    document.body.appendChild(toggleBtn);
    document.body.appendChild(overlay);

    function openNav() {
        sidebar.classList.add("mobile-open");
        overlay.classList.add("active");
        document.body.classList.add("mobile-nav-locked");
        toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }

    function closeNav() {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("active");
        document.body.classList.remove("mobile-nav-locked");
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }

    toggleBtn.addEventListener("click", function () {
        sidebar.classList.contains("mobile-open") ? closeNav() : openNav();
    });

    overlay.addEventListener("click", closeNav);

    // Tapping a nav link on mobile should close the drawer
    sidebar.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeNav);
    });

    // Keep state sane if the window is resized back to desktop width
    window.addEventListener("resize", function () {
        if (window.innerWidth > 960) closeNav();
    });
}

document.addEventListener("DOMContentLoaded", setupMobileNav);

// =====================================
// HTML Escape (XSS protection)
// =====================================
// =====================================
// Block Scoping (for block_officer role)
// district_admin sees the whole district; block_officer should only
// see their own block's institutions/employees/reports. This looks
// up the officer's own "block" (from the users table) once per page
// load and caches it, so every page can reuse the same lookup.
// Returns null for district_admin (and any other role) — meaning
// "no block filter should be applied".
// =====================================
let _myBlockCache = undefined; // undefined = not fetched yet this page load

async function getMyBlock() {
    if (_myBlockCache !== undefined) return _myBlockCache;

    const user = getCurrentUser();
    if (!user || user.role !== "block_officer" || !window.db) {
        _myBlockCache = null;
        return null;
    }

    try {
        const { data, error } = await window.db
            .from("users")
            .select("block")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("getMyBlock error:", error);
            _myBlockCache = null;
            return null;
        }

        _myBlockCache = data?.block || null;
    } catch (e) {
        console.error("getMyBlock exception:", e);
        _myBlockCache = null;
    }

    return _myBlockCache;
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
}
