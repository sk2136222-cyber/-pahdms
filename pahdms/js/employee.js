if (!requireRole("district_admin", "block_officer")) { throw new Error("Unauthorized"); }

console.log("Employee Management Loaded");


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let employees = [];
let institutions = [];

let filteredEmployees = [];

let currentPage = 1;
const recordsPerPage = 10;


// ==========================================
// DOM READY
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    console.log("Employee Page Ready");

    // --------------------------------------
    // Add Employee
    // --------------------------------------

    const addBtn = document.getElementById("addEmployeeBtn");

    if (addBtn) {
        addBtn.addEventListener("click", async function () {

            openEmployeeModal();

            const nextCode = await generateNextEmployeeCode();

            const codeField = document.getElementById("employeeCode");

            if (codeField) {
                codeField.value = nextCode;
                codeField.readOnly = true;
            }

        });
    }


    // --------------------------------------
    // Save Employee
    // --------------------------------------

    const saveBtn = document.getElementById("saveEmployeeBtn");

    if (saveBtn) {
        saveBtn.addEventListener("click", saveEmployee);
    }


    // --------------------------------------
    // Close Modal
    // --------------------------------------

    const closeBtn = document.getElementById("closeEmployeeBtn");

    if (closeBtn) {
        closeBtn.addEventListener("click", closeEmployeeModal);
    }


    // --------------------------------------
    // Search
    // --------------------------------------

    const searchBox =
        document.getElementById("employeeSearch");

    if (searchBox) {
        searchBox.addEventListener("input", filterEmployees);
    }


    // --------------------------------------
    // Designation Filter
    // --------------------------------------

    const designationFilter =
        document.getElementById("designationFilter");

    if (designationFilter) {
        designationFilter.addEventListener(
            "change",
            filterEmployees
        );
    }


    // --------------------------------------
    // Institution Filter
    // --------------------------------------

    const institutionFilter =
        document.getElementById("institutionFilter");

    if (institutionFilter) {
        institutionFilter.addEventListener(
            "change",
            filterEmployees
        );
    }


    // --------------------------------------
    // Status Filter
    // --------------------------------------

    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            filterEmployees
        );
    }


    // --------------------------------------
    // Pagination
    // --------------------------------------

    const prevBtn =
        document.getElementById("prevPageBtn");

    const nextBtn =
        document.getElementById("nextPageBtn");


    if (prevBtn) {

        prevBtn.addEventListener("click", function () {

            if (currentPage > 1) {

                currentPage--;

                renderCurrentPage();

            }

        });

    }


    if (nextBtn) {

        nextBtn.addEventListener("click", function () {

            const totalPages =
                Math.ceil(
                    filteredEmployees.length /
                    recordsPerPage
                );


            if (currentPage < totalPages) {

                currentPage++;

                renderCurrentPage();

            }

        });

    }


    // --------------------------------------
    // Export CSV
    // --------------------------------------

    const exportBtn =
        document.getElementById("exportEmployeeBtn");

    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportEmployeesCSV
        );

    }


    // --------------------------------------
    // Location field: show only for VO/VI
    // --------------------------------------

    const designationSelect =
        document.getElementById("designation");

    if (designationSelect) {
        designationSelect.addEventListener(
            "change",
            toggleLocationField
        );
    }

    const captureLocationBtn =
        document.getElementById("captureLocationBtn");

    if (captureLocationBtn) {
        captureLocationBtn.addEventListener(
            "click",
            captureCurrentLocation
        );
    }


    // --------------------------------------
    // LOAD DATA
    // --------------------------------------

    await loadInstitutions();

    await loadEmployees();

});


// ==========================================
// LOCATION: show/hide field based on designation
// ==========================================

function toggleLocationField() {

    const designation =
        document.getElementById("designation").value;

    const locationGroup =
        document.getElementById("locationFieldGroup");

    if (!locationGroup) return;

    if (designation === "VO" || designation === "VI") {
        locationGroup.style.display = "block";
    } else {
        locationGroup.style.display = "none";
        document.getElementById("employeeLatitude").value = "";
        document.getElementById("employeeLongitude").value = "";
        document.getElementById("locationStatus").innerText = "No location captured";
    }

}


// ==========================================
// LOCATION: capture current GPS position
// ==========================================

function captureCurrentLocation() {

    const statusEl = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
        statusEl.innerText = "Geolocation not supported on this device.";
        return;
    }

    statusEl.innerText = "Fetching location...";

    navigator.geolocation.getCurrentPosition(
        function (position) {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            document.getElementById("employeeLatitude").value = lat;
            document.getElementById("employeeLongitude").value = lng;

            statusEl.innerText =
                "📍 Captured: " + lat.toFixed(5) + ", " + lng.toFixed(5);

        },
        function (error) {

            console.error("Geolocation Error:", error);
            statusEl.innerText =
                "Could not get location. Please allow location access and try again.";

        },
        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );

}


// ==========================================
// GENERATE NEXT EMPLOYEE CODE (EMP001, EMP002...)
// ==========================================

async function generateNextEmployeeCode() {

    try {

        const { data, error } = await db
            .from("employees")
            .select("employee_code")
            .like("employee_code", "EMP%");

        if (error) {
            console.error("Employee Code Generation Error:", error);
            return "EMP001";
        }

        let maxNum = 0;

        (data || []).forEach(row => {

            const match = String(row.employee_code || "").match(/^EMP(\d+)$/);

            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }

        });

        const nextNum = maxNum + 1;

        return "EMP" + String(nextNum).padStart(3, "0");

    }
    catch (error) {

        console.error("Employee Code Generation Error:", error);
        return "EMP001";

    }

}


// ==========================================
// OPEN MODAL
// ==========================================

function openEmployeeModal() {

    const modal =
        document.getElementById("employeeModal");

    if (!modal) return;


    clearEmployeeForm();

    modal.style.display = "flex";

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeEmployeeModal() {

    const modal =
        document.getElementById("employeeModal");

    if (!modal) return;


    modal.style.display = "none";

}


window.closeEmployeeModal =
    closeEmployeeModal;


// ==========================================
// CLEAR FORM
// ==========================================

function clearEmployeeForm() {

    const editId =
        document.getElementById("employeeEditId");

    const code =
        document.getElementById("employeeCode");

    const name =
        document.getElementById("employeeName");

    const designation =
        document.getElementById("designation");

    const institution =
        document.getElementById("employeeInstitution");

    const mobile =
        document.getElementById("employeeMobile");

    const status =
        document.getElementById("employeeStatus");

    const saveBtn =
        document.getElementById("saveEmployeeBtn");


    if (editId) editId.value = "";

    if (code) code.value = "";

    if (name) name.value = "";

    if (designation) designation.value = "";

    if (institution) institution.value = "";

    if (mobile) mobile.value = "";

    if (status) status.value = "true";

    if (saveBtn) {
        saveBtn.innerText = "Save Employee";
    }

    document.getElementById("employeeLatitude").value = "";
    document.getElementById("employeeLongitude").value = "";
    document.getElementById("locationStatus").innerText = "No location captured";
    document.getElementById("locationFieldGroup").style.display = "none";

}


// ==========================================
// LOAD INSTITUTIONS
// ==========================================

async function loadInstitutions() {

    try {

        const { data, error } = await db
            .from("institutions")
            .select("*")
            .eq("active", true)
            .order("institution_name");


        if (error) {

            console.error(
                "Institution Load Error:",
                error
            );

            alert(error.message);

            return false;

        }


        institutions = data || [];


        const employeeInstitution =
            document.getElementById(
                "employeeInstitution"
            );

        const institutionFilter =
            document.getElementById(
                "institutionFilter"
            );


        // --------------------------------------
        // Employee Form Dropdown
        // --------------------------------------

        if (employeeInstitution) {

            employeeInstitution.innerHTML =
                `<option value="">
                    Select Institution
                </option>`;


            institutions.forEach(inst => {

                const code =
                    inst.institution_code || "";

                const name =
                    inst.institution_name || "";


                employeeInstitution.innerHTML += `
                    <option value="${escapeHtml(inst.id)}">
                        ${escapeHtml(code)} - ${escapeHtml(name)}
                    </option>
                `;

            });

        }


        // --------------------------------------
        // Filter Dropdown
        // --------------------------------------

        if (institutionFilter) {

            institutionFilter.innerHTML =
                `<option value="ALL">
                    All Institutions
                </option>`;


            institutions.forEach(inst => {

                const code =
                    inst.institution_code || "";

                const name =
                    inst.institution_name || "";


                institutionFilter.innerHTML += `
                    <option value="${escapeHtml(inst.id)}">
                        ${escapeHtml(code)} - ${escapeHtml(name)}
                    </option>
                `;

            });

        }


        console.log(
            "Institutions Loaded:",
            institutions.length
        );


        return true;

    }
    catch (error) {

        console.error(
            "Institution Error:",
            error
        );

        return false;

    }

}


// ==========================================
// LOAD EMPLOYEES
// ==========================================

async function loadEmployees() {

    try {

        const { data, error } = await db
            .from("employees")
            .select("*")
            .order("employee_name");


        if (error) {

            console.error(
                "Employee Load Error:",
                error
            );

            alert(error.message);

            return;

        }


        employees = data || [];


        console.log(
            "Employees Loaded:",
            employees.length
        );


        updateEmployeeStatistics(employees);


        filteredEmployees =
            [...employees];


        currentPage = 1;


        renderCurrentPage();

    }
    catch (error) {

        console.error(
            "Employee Error:",
            error
        );

    }

}


// ==========================================
// GET INSTITUTION
// ==========================================

function getInstitution(institutionId) {

    if (!institutionId) return null;


    return institutions.find(
        inst =>
            String(inst.id) ===
            String(institutionId)
    ) || null;

}


// ==========================================
// GET INSTITUTION DISPLAY NAME
// ==========================================

function getInstitutionDisplayName(
    institutionId
) {

    const institution =
        getInstitution(institutionId);


    if (!institution) {

        return institutionId || "";

    }


    const code =
        institution.institution_code || "";

    const name =
        institution.institution_name || "";


    return `${code} - ${name}`;

}


// ==========================================
// RENDER CURRENT PAGE
// ==========================================

function renderCurrentPage() {

    const totalRecords =
        filteredEmployees.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalRecords /
                recordsPerPage
            )
        );


    if (currentPage > totalPages) {

        currentPage = totalPages;

    }


    const start =
        (currentPage - 1) *
        recordsPerPage;


    const end =
        start +
        recordsPerPage;


    const pageData =
        filteredEmployees.slice(
            start,
            end
        );


    renderEmployees(
        pageData,
        start
    );


    updatePagination(
        totalRecords,
        totalPages
    );

}


// ==========================================
// RENDER EMPLOYEES
// ==========================================

function renderEmployees(
    data,
    startIndex = 0
) {

    const list =
        document.getElementById(
            "employeeTableBody"
        );


    if (!list) return;


    list.innerHTML = "";


    if (!data || data.length === 0) {

        list.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No Employee Records Found
                </td>
            </tr>
        `;

        return;

    }


    data.forEach((emp, index) => {

        const statusClass =
            emp.active
                ? "active"
                : "inactive";


        const employeeName =
            emp.employee_name || "— Post Vacant —";


        const designation =
            emp.designation || "";


        const institution =
            getInstitutionDisplayName(
                emp.institution_id
            );


        const mobile =
            emp.mobile || "";


        const locationCell =
            (emp.latitude && emp.longitude)
                ? `<a href="https://www.google.com/maps?q=${emp.latitude},${emp.longitude}" target="_blank">📍 View</a>`
                : (designation === "VO" || designation === "VI")
                    ? "Not captured"
                    : "—";


        const employeeId =
            String(emp.id);


        list.innerHTML += `
            <tr>

                <td>
                    ${startIndex + index + 1}
                </td>

                <td>
                    ${escapeHtml(employeeName)}
                </td>

                <td>
                    ${escapeHtml(designation)}
                </td>

                <td>
                    ${escapeHtml(institution)}
                </td>

                <td>
                    ${escapeHtml(mobile)}
                </td>

                <td>
                    ${locationCell}
                </td>

                <td class="${statusClass}">
                    ${emp.active
                        ? "Active"
                        : "Inactive"}
                </td>

                <td>

                    <button
                        type="button"
                        class="action-btn edit-btn"
                        onclick="editEmployee('${employeeId}')"
                    >
                        <i class="fa-solid fa-pen"></i>
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-btn delete-btn"
                        onclick="deleteEmployee('${employeeId}')"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Delete
                    </button>

                </td>

            </tr>
        `;

    });

}


// ==========================================
// SAVE EMPLOYEE
// ==========================================

async function saveEmployee() {

    const editId =
        document.getElementById(
            "employeeEditId"
        ).value;


    const employeeCode =
        document.getElementById(
            "employeeCode"
        ).value.trim();


    const name =
        document.getElementById(
            "employeeName"
        ).value.trim();


    const designation =
        document.getElementById(
            "designation"
        ).value;


    const institutionId =
        document.getElementById(
            "employeeInstitution"
        ).value;


    const mobile =
        document.getElementById(
            "employeeMobile"
        ).value.trim();


    const active =
        document.getElementById(
            "employeeStatus"
        ).value === "true";


    const latitude =
        document.getElementById("employeeLatitude").value;

    const longitude =
        document.getElementById("employeeLongitude").value;


    // --------------------------------------
    // Validation
    // --------------------------------------

    if (
        designation === "" ||
        institutionId === ""
    ) {

        alert(
            "Please select Designation and Institution."
        );

        return;

    }


    // --------------------------------------
    // Mobile validation
    // --------------------------------------

    if (
        mobile !== "" &&
        !/^[0-9]{10}$/.test(mobile)
    ) {

        alert(
            "Please enter a valid 10-digit mobile number."
        );

        return;

    }


    // --------------------------------------
    // Employee Data
    // --------------------------------------

    const isVoOrVi = (designation === "VO" || designation === "VI");

    const employeeData = {

        employee_code:
            employeeCode || null,

        employee_name:
            name || null,

        designation:
            designation,

        institution_id:
            institutionId,

        mobile:
            mobile || null,

        active:
            active,

        latitude:
            (isVoOrVi && latitude) ? parseFloat(latitude) : null,

        longitude:
            (isVoOrVi && longitude) ? parseFloat(longitude) : null

    };


    let result;


    // --------------------------------------
    // UPDATE
    // --------------------------------------

    if (editId) {

        result = await db
            .from("employees")
            .update(employeeData)
            .eq("id", editId);

    }


    // --------------------------------------
    // INSERT
    // --------------------------------------

    else {

        result = await db
            .from("employees")
            .insert([
                employeeData
            ]);

    }


    // --------------------------------------
    // Error
    // --------------------------------------

    if (result.error) {

        console.error(
            "Save Employee Error:",
            result.error
        );

        alert(
            result.error.message
        );

        return;

    }


    alert(
        editId
            ? "Employee Updated Successfully"
            : "Employee Added Successfully"
    );


    closeEmployeeModal();

    clearEmployeeForm();


    await loadEmployees();

}


// ==========================================
// EDIT EMPLOYEE
// ==========================================

async function editEmployee(id) {

    const employee =
        employees.find(
            emp =>
                String(emp.id) ===
                String(id)
        );


    if (!employee) {

        alert(
            "Employee record not found."
        );

        return;

    }


    document.getElementById(
        "employeeEditId"
    ).value =
        employee.id || "";


    document.getElementById(
        "employeeCode"
    ).value =
        employee.employee_code || "";

    document.getElementById(
        "employeeCode"
    ).readOnly = true;


    document.getElementById(
        "employeeName"
    ).value =
        employee.employee_name || "";


    document.getElementById(
        "designation"
    ).value =
        employee.designation || "";


    document.getElementById(
        "employeeInstitution"
    ).value =
        employee.institution_id || "";


    document.getElementById(
        "employeeMobile"
    ).value =
        employee.mobile || "";


    document.getElementById(
        "employeeStatus"
    ).value =
        employee.active === true
            ? "true"
            : "false";


    // Location fields (VO/VI only)
    document.getElementById("employeeLatitude").value =
        employee.latitude || "";

    document.getElementById("employeeLongitude").value =
        employee.longitude || "";

    toggleLocationField();

    if (employee.latitude && employee.longitude) {
        document.getElementById("locationStatus").innerText =
            "📍 Captured: " +
            Number(employee.latitude).toFixed(5) + ", " +
            Number(employee.longitude).toFixed(5);
    } else {
        document.getElementById("locationStatus").innerText =
            "No location captured";
    }


    document.getElementById(
        "saveEmployeeBtn"
    ).innerText =
        "Update Employee";


    document.getElementById(
        "employeeModal"
    ).style.display =
        "flex";

}


window.editEmployee =
    editEmployee;


// ==========================================
// DELETE EMPLOYEE
// ==========================================

async function deleteEmployee(id) {

    const employee =
        employees.find(
            emp =>
                String(emp.id) ===
                String(id)
        );


    if (!employee) return;


    const employeeName =
        employee.employee_name ||
        "this employee";


    const confirmDelete =
        confirm(
            `Delete employee "${employeeName}"?`
        );


    if (!confirmDelete) return;


    const { error } =
        await db
            .from("employees")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(
            "Delete Employee Error:",
            error
        );

        alert(
            error.message
        );

        return;

    }


    alert(
        "Employee Deleted Successfully"
    );


    await loadEmployees();

}


window.deleteEmployee =
    deleteEmployee;


// ==========================================
// SEARCH + FILTER
// ==========================================

function filterEmployees() {

    const search =
        (
            document.getElementById(
                "employeeSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const designation =
        document.getElementById(
            "designationFilter"
        )?.value || "ALL";


    const institution =
        document.getElementById(
            "institutionFilter"
        )?.value || "ALL";


    const status =
        document.getElementById(
            "statusFilter"
        )?.value || "ALL";


    filteredEmployees =
        employees.filter(emp => {

            const inst =
                getInstitution(
                    emp.institution_id
                );


            const institutionCode =
                inst?.institution_code || "";


            const institutionName =
                inst?.institution_name || "";


            const employeeCode =
                emp.employee_code || "";


            // ----------------------------------
            // Search text
            // ----------------------------------

            const searchText = [

                employeeCode,

                emp.employee_name || "",

                emp.designation || "",

                emp.mobile || "",

                institutionCode,

                institutionName

            ]
            .join(" ")
            .toLowerCase();


            const matchesSearch =
                search === "" ||
                searchText.includes(
                    search
                );


            // ----------------------------------
            // Designation
            // ----------------------------------

            const matchesDesignation =
                designation === "ALL" ||
                designation === "" ||
                emp.designation === designation;


            // ----------------------------------
            // Institution
            // ----------------------------------

            const matchesInstitution =
                institution === "ALL" ||
                institution === "" ||
                String(
                    emp.institution_id
                ) === String(
                    institution
                );


            // ----------------------------------
            // Status
            // ----------------------------------

            const matchesStatus =
                status === "ALL" ||
                status === "" ||
                (
                    status === "ACTIVE" &&
                    emp.active === true
                ) ||
                (
                    status === "INACTIVE" &&
                    emp.active !== true
                );


            return (
                matchesSearch &&
                matchesDesignation &&
                matchesInstitution &&
                matchesStatus
            );

        });


    currentPage = 1;


    renderCurrentPage();

}


// ==========================================
// STATISTICS
// ==========================================

function updateEmployeeStatistics(data) {

    const total =
        data.length;


    const vo =
        data.filter(
            emp =>
                emp.designation === "VO"
        ).length;


    const vi =
        data.filter(
            emp =>
                emp.designation === "VI"
        ).length;


    const aiw =
        data.filter(
            emp =>
                emp.designation === "AIW"
        ).length;


    const vp =
        data.filter(
            emp =>
                emp.designation === "VP"
        ).length;


    const active =
        data.filter(
            emp =>
                emp.active === true
        ).length;


    setText(
        "totalEmployees",
        total
    );


    setText(
        "totalVO",
        vo
    );


    setText(
        "totalVI",
        vi
    );


    setText(
        "totalAIW",
        aiw
    );


    setText(
        "totalVP",
        vp
    );


    setText(
        "totalActive",
        active
    );

}


// ==========================================
// PAGINATION
// ==========================================

function updatePagination(
    totalRecords,
    totalPages
) {

    const recordInfo =
        document.getElementById(
            "recordInfo"
        );


    const pageNumber =
        document.getElementById(
            "pageNumber"
        );


    const prevBtn =
        document.getElementById(
            "prevPageBtn"
        );


    const nextBtn =
        document.getElementById(
            "nextPageBtn"
        );


    if (recordInfo) {

        if (totalRecords === 0) {

            recordInfo.innerText =
                "Showing 0 Records";

        }
        else {

            const start =
                (
                    (currentPage - 1) *
                    recordsPerPage
                ) + 1;


            const end =
                Math.min(
                    currentPage *
                    recordsPerPage,
                    totalRecords
                );


            recordInfo.innerText =
                `Showing ${start}-${end} of ${totalRecords} Records`;

        }

    }


    if (pageNumber) {

        pageNumber.innerText =
            `Page ${currentPage} of ${totalPages}`;

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


// ==========================================
// EXPORT CSV
// ==========================================

function exportEmployeesCSV() {

    if (employees.length === 0) {

        alert(
            "No employee records to export."
        );

        return;

    }


    let csv =
        "Sr No,Employee Code,Employee Name,Designation,Institution,Mobile,Status\n";


    employees.forEach(
        (emp, index) => {

            const institution =
                getInstitutionDisplayName(
                    emp.institution_id
                );


            csv +=
                `${index + 1},` +
                `"${csvEscape(
                    emp.employee_code || ""
                )}",` +
                `"${csvEscape(
                    emp.employee_name || "Post Vacant"
                )}",` +
                `"${csvEscape(
                    emp.designation || ""
                )}",` +
                `"${csvEscape(
                    institution
                )}",` +
                `"${csvEscape(
                    emp.mobile || ""
                )}",` +
                `"${emp.active
                    ? "Active"
                    : "Inactive"}"\n`;

        }
    );


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;


    link.download =
        "Fazilka_Employee_List.csv";


    document.body.appendChild(link);


    link.click();


    document.body.removeChild(link);


    URL.revokeObjectURL(url);

}


// ==========================================
// CSV ESCAPE
// ==========================================

function csvEscape(value) {

    return String(value)
        .replace(/"/g, '""');

}


// ==========================================
// HELPER
// ==========================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.innerText =
            value;

    }

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(value) {

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