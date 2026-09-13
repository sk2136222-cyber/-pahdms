/* ===================================================
   Punjab Animal Husbandry Department
   District Management System V5
   dashboard.js
=================================================== */

requireLogin();

// VO/VI accounts are institution-level and only work with Monthly
// Report — send them straight there instead of the district dashboard.
(function redirectInstitutionUsersAway() {
    const user = getCurrentUser();
    if (user && (user.role === "vo" || user.role === "vi")) {
        window.location.replace("monthly-report.html");
    }
})();

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

    const myBlock = await getMyBlock();

    let institutionsQuery = db
        .from("institutions")
        .select("*", { count: "exact", head: true });

    let employeesQuery = db
        .from("employees")
        .select("*", { count: "exact", head: true });

    let usersQuery = db
        .from("users")
        .select("*", { count: "exact", head: true });

    let reportsQuery = db
        .from("mpr_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "Draft");

    if (myBlock) {
        institutionsQuery = institutionsQuery.eq("block", myBlock);
        usersQuery = usersQuery.eq("block", myBlock);

        // employees / mpr_reports don't have a "block" column directly,
        // so join to institutions and filter on ITS block instead.
        employeesQuery = db
            .from("employees")
            .select("*, institutions!inner(block)", { count: "exact", head: true })
            .eq("institutions.block", myBlock);

        reportsQuery = db
            .from("mpr_reports")
            .select("*, institutions!inner(block)", { count: "exact", head: true })
            .eq("status", "Draft")
            .eq("institutions.block", myBlock);
    }

    const institutionsResult = await institutionsQuery;

    console.log("Institutions:", institutionsResult);

    const employeesResult = await employeesQuery;

    console.log("Employees:", employeesResult);

    const usersResult = await usersQuery;

    console.log("Users:", usersResult);

    const reportsResult = await reportsQuery;

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