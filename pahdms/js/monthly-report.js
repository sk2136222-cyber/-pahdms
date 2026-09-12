requireLogin();
/* =========================================================
   PAHDMS V5
   Monthly Report Management
   Fazilka District
   ========================================================= */

console.log("Monthly Report Management Loaded");


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let allReports = [];
let filteredReports = [];

let currentPage = 1;
const recordsPerPage = 10;

let institutions = [];


// =========================================================
// PAGE READY
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Monthly Report Page Ready");

    // Safety check
    if (!window.db) {

        console.error("❌ Supabase database object not found");

        showTableMessage(
            "Supabase connection not available."
        );

        return;
    }

    console.log("✅ Supabase database object available");

    // Load institutions
    await loadInstitutions();

    // Load reports
    await loadMonthlyReports();

    // Event listeners
    setupEventListeners();

});


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {

    const monthFilter =
        document.getElementById("reportMonth");

    const yearFilter =
        document.getElementById("reportYear");

    const institutionFilter =
        document.getElementById("reportInstitution");

    const statusFilter =
        document.getElementById("reportStatus");

    const searchInput =
        document.getElementById("reportSearch");

    const prevBtn =
        document.getElementById("reportPrevBtn");

    const nextBtn =
        document.getElementById("reportNextBtn");

    const createBtn =
        document.getElementById("createReportBtn");


    if (monthFilter) {

        monthFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (institutionFilter) {

        institutionFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyFilters
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );

    }


    if (prevBtn) {

        prevBtn.addEventListener(
            "click",
            previousPage
        );

    }


    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            nextPage
        );

    }


    if (createBtn) {

        createBtn.addEventListener(
            "click",
            openCreateReport
        );

    }

}
    // CREATE DRAFT BUTTON
    const saveCreateReportBtn =
        document.getElementById(
            "saveCreateReportBtn"
        );

    if (saveCreateReportBtn) {
        saveCreateReportBtn.addEventListener(
            "click",
            createDraftMonthlyReport
        );

        console.log(
            "✅ Create Draft button connected"
        );
    }

    // CLOSE CREATE REPORT MODAL
    const closeCreateReportBtn =
        document.getElementById(
            "closeCreateReportBtn"
        );

    const cancelCreateReportBtn =
        document.getElementById(
            "cancelCreateReportBtn"
        );

    if (closeCreateReportBtn) {
        closeCreateReportBtn.addEventListener(
            "click",
            closeCreateReport
        );
    }

    if (cancelCreateReportBtn) {
        cancelCreateReportBtn.addEventListener(
            "click",
            closeCreateReport
        );
    }


// =========================================================
// LOAD INSTITUTIONS
// =========================================================

async function loadInstitutions() {

    try {

        const { data, error } = await window.db
    .from("institutions")
    .select(`
        id,
        institution_code,
        institution_name,
        institution_type
    `)
    .order("institution_code", {
        ascending: true
    });

        if (error) {

            console.error(
                "❌ Institution Error:",
                error
            );

            return;
        }

institutions = (data || []).map(inst => ({
    id: inst.id,
    code: inst.institution_code || "",
    name: inst.institution_name || "",
    type: inst.institution_type || ""
}));

console.log(
    "Institutions Loaded:",
    institutions.length
);


        populateInstitutionFilters();


    } catch (error) {

        console.error(
            "❌ Institution Load Error:",
            error
        );

    }

}


// =========================================================
// POPULATE INSTITUTION DROPDOWNS
// =========================================================

function populateInstitutionFilters() {

    // ---------------------------------------------
    // FILTER DROPDOWN
    // ---------------------------------------------

    const filter =
        document.getElementById(
            "reportInstitution"
        );

    if (filter) {

        filter.innerHTML = `
            <option value="ALL">
                All Institutions
            </option>
        `;

        institutions.forEach(inst => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                inst.id;

            option.textContent =
                `${inst.code || ""} - ${inst.name || ""}`;

            filter.appendChild(option);
        });
    }


    // ---------------------------------------------
    // CREATE REPORT DROPDOWN
    // ---------------------------------------------

    const createFilter =
        document.getElementById(
            "createReportInstitution"
        );

    if (createFilter) {

        createFilter.innerHTML = `
            <option value="">
                Select Institution
            </option>
        `;

        institutions.forEach(inst => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                inst.id;

            option.textContent =
                `${inst.code || ""} - ${inst.name || ""}`;

            createFilter.appendChild(option);
        });

        console.log(
            "✅ Create Report Institution dropdown populated"
        );
    }

}

// =========================================================
// LOAD MONTHLY REPORTS
// =========================================================

async function loadMonthlyReports() {

    try {

        showTableMessage(
            "Loading Reports..."
        );


        const { data, error } =
            await window.db
                .from("mpr_reports")
                .select(`
                    id,
                    report_month,
                    report_year,
                    institution_id,
                    status,
                    created_by,
                    created_at,
                    updated_at,
                    updated_by,
                    submitted_by,
                    submitted_at,
                    verified_by,
                    verified_at,
                    approved_by,
                    approved_at
                `)
                .order("report_year", {
                    ascending: false
                })
                .order("report_month", {
                    ascending: false
                })
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            console.error(
                "❌ Monthly Report Error:",
                error
            );

            showTableMessage(
                "Unable to load monthly reports."
            );

            return;
        }


        allReports = data || [];


        console.log(
            "Monthly Reports Loaded:",
            allReports.length
        );


        // Attach institution information
        allReports =
            allReports.map(report => {

                const institution =
                    institutions.find(
                        inst =>
                            inst.id ===
                            report.institution_id
                    );


                return {

                    ...report,

                    institution_code:
                        institution?.code || "",

                    institution_name:
                        institution?.name || "",

                    institution_type:
                        institution?.type || ""

                };

            });


        updateStatistics();

        applyFilters();


    } catch (error) {

        console.error(
            "❌ Monthly Report Load Error:",
            error
        );

        showTableMessage(
            "Error loading reports."
        );

    }

}


// =========================================================
// APPLY FILTERS
// =========================================================

function applyFilters() {

    const month =
        document.getElementById(
            "reportMonth"
        )?.value || "ALL";


    const year =
        document.getElementById(
            "reportYear"
        )?.value || "ALL";


    const institution =
        document.getElementById(
            "reportInstitution"
        )?.value || "ALL";


    const status =
        document.getElementById(
            "reportStatus"
        )?.value || "ALL";


    const search =
        document.getElementById(
            "reportSearch"
        )?.value
        ?.trim()
        .toLowerCase() || "";


    filteredReports =
        allReports.filter(report => {


            // Month
            if (
                month !== "ALL" &&
                String(report.report_month) !==
                String(month)
            ) {

                return false;

            }


            // Financial Year (Apr → Mar)
            // "year" is the FY start year (e.g. 2026 = FY 2026-27,
            // Apr 2026 - Mar 2027), so a report belongs to it when
            // either: month is Apr-Dec of that same calendar year,
            // or month is Jan-Mar of the following calendar year.
            if (year !== "ALL") {

                const fyStartYear = Number(year);
                const reportMonth = Number(report.report_month);
                const reportYear = Number(report.report_year);

                const inFinancialYear =
                    (reportMonth >= 4 && reportYear === fyStartYear) ||
                    (reportMonth <= 3 && reportYear === fyStartYear + 1);

                if (!inFinancialYear) {

                    return false;

                }

            }


            // Institution
            if (
                institution !== "ALL" &&
                report.institution_id !==
                institution
            ) {

                return false;

            }


            // Status
            if (
                status !== "ALL" &&
                report.status !== status
            ) {

                return false;

            }


            // Search
            if (search) {

                const searchableText =
                    `${report.institution_code || ""}
                     ${report.institution_name || ""}
                     ${report.institution_type || ""}
                     ${report.status || ""}`
                    .toLowerCase();


                if (
                    !searchableText.includes(search)
                ) {

                    return false;

                }

            }


            return true;

        });


    currentPage = 1;

    renderReports();

}


// =========================================================
// RENDER REPORT TABLE
// =========================================================

function renderReports() {

    const tbody =
        document.getElementById(
            "monthlyReportTableBody"
        );


    if (!tbody) {

        console.error(
            "❌ monthlyReportTableBody not found"
        );

        return;
    }


    if (filteredReports.length === 0) {

        showTableMessage(
            "No Monthly Reports Found"
        );

        updatePagination();

        return;

    }


    const startIndex =
        (currentPage - 1) *
        recordsPerPage;


    const endIndex =
        startIndex +
        recordsPerPage;


    const pageRecords =
        filteredReports.slice(
            startIndex,
            endIndex
        );


    tbody.innerHTML = "";


    pageRecords.forEach(
        (report, index) => {


            const row =
                document.createElement("tr");


            const serialNumber =
                startIndex + index + 1;


            const monthName =
                getMonthName(
                    report.report_month
                );


            const statusClass =
                getStatusClass(
                    report.status
                );


            const actionText =
                report.status === "Locked"
                    ? "View"
                    : "Open";


            row.innerHTML = `

                <td>
                    ${serialNumber}
                </td>


                <td>
                    ${monthName}
                </td>


                <td>
                    ${report.report_year || ""}
                </td>


                <td>

                    <div class="institution-cell">

                        <strong>
                            ${escapeHtml(
                                report.institution_code || "-"
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                report.institution_name || "-"
                            )}
                        </span>

                    </div>

                </td>


                <td>
                    ${escapeHtml(
                        report.institution_type || "-"
                    )}
                </td>


                <td>

                    <span class="status-badge ${statusClass}">

                        ${escapeHtml(
                            report.status || "Draft"
                        )}

                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="action-btn"
                        onclick="openMonthlyReport('${report.id}')">

                        ${actionText}

                    </button>

                </td>

            `;


            tbody.appendChild(row);

        }
    );


    updatePagination();

}


// =========================================================
// UPDATE STATISTICS
// =========================================================

function updateStatistics() {

    const total =
        allReports.length;


    const draft =
        allReports.filter(
            r => r.status === "Draft"
        ).length;


    const submitted =
        allReports.filter(
            r => r.status === "Submitted"
        ).length;


    const verified =
        allReports.filter(
            r => r.status === "Verified"
        ).length;


    const approved =
        allReports.filter(
            r => r.status === "Approved"
        ).length;


    const locked =
        allReports.filter(
            r => r.status === "Locked"
        ).length;


    setElementText(
        "totalReports",
        total
    );


    setElementText(
        "draftReports",
        draft
    );


    setElementText(
        "submittedReports",
        submitted
    );


    setElementText(
        "verifiedReports",
        verified
    );


    setElementText(
        "lockedReports",
        locked
    );


    // Optional approved card
    setElementText(
        "approvedReports",
        approved
    );

}


// =========================================================
// PAGINATION
// =========================================================

function updatePagination() {

    const total =
        filteredReports.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                recordsPerPage
            )
        );


    const pageNumber =
        document.getElementById(
            "reportPageNumber"
        );


    const recordInfo =
        document.getElementById(
            "reportRecordInfo"
        );


    const prevBtn =
        document.getElementById(
            "reportPrevBtn"
        );


    const nextBtn =
        document.getElementById(
            "reportNextBtn"
        );


    if (pageNumber) {

        pageNumber.textContent =
            `Page ${currentPage}`;

    }


    if (recordInfo) {

        recordInfo.textContent =
            `Showing ${total} Records`;

    }


    if (prevBtn) {

        prevBtn.disabled =
            currentPage <= 1;

    }


    if (nextBtn) {

        nextBtn.disabled =
            currentPage >= totalPages;

    }

}


// =========================================================
// PREVIOUS PAGE
// =========================================================

function previousPage() {

    if (currentPage > 1) {

        currentPage--;

        renderReports();

    }

}


// =========================================================
// NEXT PAGE
// =========================================================

function nextPage() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredReports.length /
                recordsPerPage
            )
        );


    if (currentPage < totalPages) {

        currentPage++;

        renderReports();

    }

}


// =========================================================
// CREATE MONTHLY REPORT
// =========================================================

function openCreateReport() {

    console.log(
        "Create Monthly Report clicked"
    );


    const modal =
        document.getElementById(
            "createReportModal"
        );


    if (modal) {

        modal.style.display = "flex";

        return;

    }


    // If modal does not exist yet,
    // show a simple message.

    alert(
        "Create Monthly Report form is not available yet."
    );

}
// =========================================================
// CREATE DRAFT MONTHLY REPORT
// =========================================================

async function createDraftMonthlyReport() {

    console.log(
        "📝 Create Draft button clicked"
    );

    const month =
        document.getElementById(
            "createReportMonth"
        )?.value;

    const year =
        document.getElementById(
            "createReportYear"
        )?.value;

    const institution =
        document.getElementById(
            "createReportInstitution"
        )?.value;

    console.log(
        "Create Draft Values:",
        {
            month,
            year,
            institution
        }
    );

    // Validation
    if (!month || !year || !institution) {

        alert(
            "Please select Month, Year and Institution."
        );

        return;
    }

    // ---------------------------------------------
    // FINANCIAL YEAR → CALENDAR YEAR
    // "year" is the Financial Year start year (e.g. 2026
    // means FY 2026-27, running Apr 2026 - Mar 2027).
    // Apr-Dec belong to the FY start year; Jan-Mar belong
    // to the following calendar year.
    // ---------------------------------------------
    const monthNum = Number(month);
    const fyStartYear = Number(year);
    const calendarYear =
        monthNum >= 4 ? fyStartYear : fyStartYear + 1;

    const button =
        document.getElementById(
            "saveCreateReportBtn"
        );

    try {

        // Disable button
        if (button) {
            button.disabled = true;
            button.innerHTML =
                "Creating Monthly Report...";
        }

        // ---------------------------------------------
        // CHECK EXISTING REPORT
        // ---------------------------------------------

        const {
            data: existing,
            error: checkError
        } = await window.db
            .from("mpr_reports")
            .select("id,status")
            .eq(
                "institution_id",
                institution
            )
            .eq(
                "report_month",
                monthNum
            )
            .eq(
                "report_year",
                calendarYear
            )
            .maybeSingle();

        if (checkError) {

            console.error(
                "❌ Check Existing Report Error:",
                checkError
            );

            alert(
                "Unable to check existing monthly report."
            );

            return;
        }

        // ---------------------------------------------
        // REPORT ALREADY EXISTS
        // ---------------------------------------------

        if (existing) {

            alert(
                `Monthly report already exists.\n\nStatus: ${existing.status}`
            );

            return;
        }

        // ---------------------------------------------
        // INSERT NEW DRAFT
        // ---------------------------------------------

        console.log(
            "Creating Monthly Report..."
        );

        const {
            data,
            error
        } = await window.db
            .from("mpr_reports")
            .insert({
                report_month:
                    monthNum,

                report_year:
                    calendarYear,

                institution_id:
                    institution,

                status:
                    "Draft"
            })
            .select()
            .single();

        // ---------------------------------------------
        // INSERT ERROR
        // ---------------------------------------------

        if (error) {

            console.error(
                "❌ Create Report Error:",
                error
            );

            alert(
                "Unable to create monthly report.\n\n" +
                error.message
            );

            return;
        }

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        console.log(
            "✅ Monthly Report Created:",
            data
        );

        alert(
            "Report created successfully."
        );

        // Close modal
        closeCreateReport();

        // Reload reports
        await loadMonthlyReports();

    } catch (error) {

        console.error(
            "❌ Create Monthly Report Error:",
            error
        );

        alert(
            "Unexpected error occurred.\n\n" +
            error.message
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                '<i class="fa-solid fa-save"></i> Create Draft';
        }
    }
}
// =========================================================
// CLOSE CREATE REPORT MODAL
// =========================================================

function closeCreateReport() {

    const modal =
        document.getElementById(
            "createReportModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

}


// =========================================================
// OPEN EXISTING REPORT
// =========================================================

function openMonthlyReport(reportId) {

    console.log(
        "Opening Monthly Report:",
        reportId
    );


    const report =
        allReports.find(
            r => r.id === reportId
        );


    if (!report) {

        alert(
            "Report not found."
        );

        return;

    }


    /*
       V5 NEXT STAGE

       Later this function will open:

       monthly-report-entry.html?id=REPORT_ID

       For now we keep the existing report
       safely identified.
    */


    window.location.href =
        `monthly-report-entry.html?id=${encodeURIComponent(reportId)}`;

}


// =========================================================
// MONTH NAME
// =========================================================

function getMonthName(monthNumber) {

    const months = [

        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"

    ];


    return months[
        Number(monthNumber)
    ] || "-";

}


// =========================================================
// STATUS CSS CLASS
// =========================================================

function getStatusClass(status) {

    switch (status) {

        case "Draft":
            return "status-draft";

        case "Submitted":
            return "status-submitted";

        case "Verified":
            return "status-verified";

        case "Approved":
            return "status-approved";

        case "Locked":
            return "status-locked";

        default:
            return "";

    }

}


// =========================================================
// SHOW TABLE MESSAGE
// =========================================================

function showTableMessage(message) {

    const tbody =
        document.getElementById(
            "monthlyReportTableBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:30px;
                ">

                ${escapeHtml(message)}

            </td>

        </tr>

    `;

}


// =========================================================
// SET ELEMENT TEXT
// =========================================================

function setElementText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================================
// GLOBAL FUNCTIONS
// =========================================================

window.openMonthlyReport =
    openMonthlyReport;


window.previousPage =
    previousPage;


window.nextPage =
    nextPage;


window.applyFilters =
    applyFilters;


console.log(
    "✅ Monthly Report JS Ready"
);