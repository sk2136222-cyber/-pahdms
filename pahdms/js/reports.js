if (!requireRole("district_admin", "block_officer")) { throw new Error("Unauthorized"); }

document.addEventListener("DOMContentLoaded", function () {

    console.log("Reports Page Loaded");

    loadReportsData();

});

async function loadReportsData() {

    // --------------------------------------
    // Institutions
    // --------------------------------------

    const { data: institutions, error: instError } = await db
        .from("institutions")
        .select("institution_type, block, active");

    if (instError) {
        console.error("Institutions Load Error:", instError);
    }

    // --------------------------------------
    // Employees
    // --------------------------------------

    const { data: employees, error: empError } = await db
        .from("employees")
        .select("designation, active");

    if (empError) {
        console.error("Employees Load Error:", empError);
    }

    // --------------------------------------
    // Monthly Reports
    // --------------------------------------

    const { data: reports, error: reportError } = await db
        .from("mpr_reports")
        .select("status");

    if (reportError) {
        console.error("Reports Load Error:", reportError);
    }

    const instData = institutions || [];
    const empData = employees || [];
    const reportData = reports || [];

    // --------------------------------------
    // Summary Cards
    // --------------------------------------

    setText("totalInstitutions", instData.length);
    setText("totalEmployees", empData.length);
    setText("totalReports", reportData.length);

    // --------------------------------------
    // Chart 1: Institutions by Type
    // --------------------------------------

    renderChart(
        "institutionTypeChart",
        "doughnut",
        groupCount(instData, "institution_type"),
        ["#0B6E4F", "#0d6efd", "#ffc107", "#dc3545", "#6c757d"]
    );

    // --------------------------------------
    // Chart 2: Institutions by Block
    // --------------------------------------

    renderChart(
        "institutionBlockChart",
        "bar",
        groupCount(instData, "block"),
        "#0B6E4F"
    );

    // --------------------------------------
    // Chart 3: Employees by Designation
    // --------------------------------------

    renderChart(
        "employeeDesignationChart",
        "doughnut",
        groupCount(empData, "designation"),
        ["#0d6efd", "#0B6E4F", "#ffc107", "#6c757d"]
    );

    // --------------------------------------
    // Chart 4: Monthly Reports by Status
    // --------------------------------------

    renderChart(
        "reportStatusChart",
        "bar",
        groupCount(reportData, "status"),
        ["#6c757d", "#0d6efd", "#198754", "#212529"]
    );

}

// ==========================================
// HELPER: Group and count by a field
// ==========================================

function groupCount(data, field) {

    const counts = {};

    data.forEach(item => {

        const key = item[field] || "Unspecified";

        counts[key] = (counts[key] || 0) + 1;

    });

    return {
        labels: Object.keys(counts),
        values: Object.values(counts)
    };

}

// ==========================================
// HELPER: Render a Chart.js chart
// ==========================================

function renderChart(canvasId, type, groupedData, colors) {

    const canvas = document.getElementById(canvasId);

    if (!canvas) return;

    if (!groupedData.labels.length) {
        return;
    }

    new Chart(canvas, {
        type: type,
        data: {
            labels: groupedData.labels,
            datasets: [{
                label: "Count",
                data: groupedData.values,
                backgroundColor: colors,
                borderWidth: type === "bar" ? 0 : 2,
                borderColor: "#fff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === "doughnut",
                    position: "bottom"
                }
            },
            scales: type === "bar" ? {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            } : {}
        }
    });

}

// ==========================================
// HELPER
// ==========================================

function setText(id, value) {

    const el = document.getElementById(id);

    if (el) el.innerText = value;

}