/* ===================================================
   Punjab Animal Husbandry Department
   District Management System V5
   dashboard.js
=================================================== */

requireLogin();

/* ===========================
   Logged User
=========================== */

function loadLoggedUser() {

    const user = getCurrentUser();

    if (!user) return;

    document.getElementById("loggedUserName").innerText =
        user.full_name;

    document.getElementById("loggedUserRole").innerText =
        user.role;

}

/* ===========================
   Page Load
=========================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Dashboard Loaded Successfully");

    loadLoggedUser();

    loadDashboard();

});

/* ===========================
   Dashboard Loader
=========================== */

async function loadDashboard() {

    await loadKPIs();

}

/* ===========================
   KPI Cards
=========================== */

async function loadKPIs() {

    const institutionsResult = await db
        .from("institutions")
        .select("*", { count: "exact", head: true });

    console.log("Institutions:", institutionsResult);

    const employeesResult = await db
        .from("employees")
        .select("*", { count: "exact", head: true });

    console.log("Employees:", employeesResult);

    const usersResult = await db
        .from("users")
        .select("*", { count: "exact", head: true });

    console.log("Users:", usersResult);

    const reportsResult = await db
        .from("mpr_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "Draft");

    console.log("Reports:", reportsResult);

    setValue("kpiInstitutions", institutionsResult.count || 0);
    setValue("kpiEmployees", employeesResult.count || 0);
    setValue("kpiUsers", usersResult.count || 0);
    setValue("kpiReports", reportsResult.count || 0);

}
    

/* ===========================
   Helper Function
=========================== */

function setValue(id, value) {

    const el = document.getElementById(id);

    if (el) {

        el.textContent = value;

    }

}

/* ===========================
   Future Modules
=========================== */

// loadRecentActivities();
// loadNotifications();
// loadCharts();
// loadQuickActions();
// loadLiveSupabaseData();