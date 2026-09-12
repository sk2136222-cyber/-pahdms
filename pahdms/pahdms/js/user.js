if (!requireRole("district_admin", "block_officer")) { throw new Error("Unauthorized"); }
// ===============================
// Pagination Variables
// ===============================

let allUsers = [];
let currentPage = 1;
const rowsPerPage = 10;
let filteredUsers = [];

// Block-scoping: block_officer sees only users in their own block.
// district_admin sees everyone. Populated by loadMyBlock() on page load.
let myBlock = null;
let myRole = null;

// ===============================
// Isolated client for creating new Auth accounts.
// persistSession:false + a separate storageKey means calling
// .auth.signUp() here does NOT touch or replace the admin's
// own logged-in session (which lives on the main "db" client).
// ===============================


async function loadMyBlock() {

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    myRole = currentUser.role;

    if (myRole !== "block_officer") return;

    const { data, error } = await db
        .from("users")
        .select("block")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("Could not load officer's block:", error);
        return;
    }

    myBlock = data?.block || null;
}

document.addEventListener("DOMContentLoaded", async function () {

    console.log("User Management Loaded");

    await loadMyBlock();

    loadInstitutions();

    loadUsers();
    loadSummary();
    document
    .getElementById("searchUser")
    .addEventListener("keyup", searchUsers);
document
    .getElementById("roleFilter")
    .addEventListener("change", filterUsersByRole);
loadInstitutionFilter();

document
    .getElementById("institutionFilter")
    .addEventListener("change", filterUsersByInstitution);
document
    .getElementById("statusFilter")
    .addEventListener("change", filterUsersByStatus);
    document
        .getElementById("saveUserBtn")
        .addEventListener("click", saveUser);
document
    .getElementById("prevPageBtn")
    .addEventListener("click", previousPage);

document
    .getElementById("nextPageBtn")
    .addEventListener("click", nextPage);

});

async function loadInstitutions() {


    const { data, error } = await db
        .from("institutions")
        .select("id, institution_name")
        .order("institution_name");

    if (error) {
        console.error(error);
        return;
    }

    const dropdown = document.getElementById("institution");

    dropdown.innerHTML =
        `<option value="">Select Institution</option>`;

    data.forEach(item => {

        dropdown.innerHTML += `
            <option value="${esc(item.id)}">
                ${esc(item.institution_name)}
            </option>
        `;

    });

}
async function loadInstitutionFilter() {

    const { data, error } = await db
        .from("institutions")
        .select("institution_name")
        .order("institution_name");

    if (error) return;

    const dropdown =
        document.getElementById("institutionFilter");

    dropdown.innerHTML =
        `<option value="ALL">All Institutions</option>`;

    data.forEach(item => {

        dropdown.innerHTML += `
            <option value="${esc(item.institution_name)}">
                ${esc(item.institution_name)}
            </option>
        `;

    });

}
async function loadUsers() {

    let query = db
        .from("users")
        .select(`
            id,
            full_name,
            username,
            email,
            role,
            active,
            block,
            institutions (
                institution_name
            )
        `)
        .order("full_name");

    // Block officers only manage users within their own block.
    if (myRole === "block_officer" && myBlock) {
        query = query.eq("block", myBlock);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }
   allUsers = data;
filteredUsers = [...data];

    renderTable();
}
function renderTable() {
    let rows = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    const pageData = filteredUsers.slice(start, end);

    pageData.forEach(user => {

        rows += `
        <tr>

            <td>${esc(user.full_name ?? "")}</td>

            <td>${esc(user.username ?? "")}</td>

            <td>${esc(user.email ?? "")}</td>

            <td>${esc(user.role ?? "")}</td>

            <td>${esc(user.institutions?.institution_name ?? "-")}</td>

            <td>
                ${user.active
                    ? '<span class="status-active">Active</span>'
                    : '<span class="status-inactive">Inactive</span>'
                }
            </td>

            <td>
                <button
                    class="edit-btn"
                    onclick="editUser('${esc(user.id)}')">
                    ✏ Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteUser('${esc(user.id)}')">
                    🗑 Delete
                </button>
            </td>

        </tr>`;

    });

    document.getElementById("userList").innerHTML = rows;
const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));

if (currentPage > totalPages) currentPage = totalPages;
document.getElementById("pageNumber").innerText =
    `Page ${currentPage} of ${totalPages}`;

const startRecord =
    filteredUsers.length === 0 ? 0 : start + 1;

const endRecord =
    Math.min(end, filteredUsers.length);

document.getElementById("recordInfo").innerText =
    `Showing ${startRecord}-${endRecord} of ${filteredUsers.length} Records`

document.getElementById("prevPageBtn").disabled =
    currentPage === 1;

document.getElementById("nextPageBtn").disabled =
    currentPage === totalPages;

}
function previousPage() {

    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }

}

function nextPage() {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
    if (currentPage < totalPages) { currentPage++; renderTable(); }
}

async function deleteUser(id) {

    const currentUser = getCurrentUser();

    if (currentUser && currentUser.id === id) {
        alert("You cannot delete your own account while logged in.");
        return;
    }

    const targetUser = allUsers.find(u => u.id === id);

    if (targetUser && targetUser.role === "district_admin") {
        const activeAdminCount = allUsers.filter(
            u => u.role === "district_admin" && u.active
        ).length;

        if (activeAdminCount <= 1) {
            alert("Cannot delete the last active District Administrator account.");
            return;
        }
    }

    const confirmDelete = confirm(
        "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    const { error } = await db
        .from("users")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    alert("User Deleted Successfully.");

    loadUsers();
    loadSummary();

}
async function editUser(id) {

    const { data, error } = await db
        .from("users")
        .select("id, full_name, username, email, mobile, role, institution_id, active")
        .eq("id", id)
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById("editId").value = data.id;
    document.getElementById("fullName").value = data.full_name;
    document.getElementById("username").value = data.username;
    document.getElementById("email").value = data.email || "";
    document.getElementById("mobile").value = data.mobile || "";
    document.getElementById("password").value = "";
    document.getElementById("password").placeholder = "Leave blank to keep existing password";
    document.getElementById("role").value = data.role;
    document.getElementById("institution").value = data.institution_id || "";

    document.getElementById("saveUserBtn").innerHTML =
        "💾 Update User";

}


async function saveUser() {

    const saveUserBtnEl =
        document.getElementById("saveUserBtn");

    if (saveUserBtnEl.disabled) return;

    saveUserBtnEl.disabled = true;

    try {

        const full_name =
            document.getElementById("fullName").value.trim();

        const username =
            document.getElementById("username").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const mobile =
            document.getElementById("mobile").value.trim();

        const password =
            document.getElementById("password").value.trim();

        const role =
            document.getElementById("role").value;

        const institution_id =
            document.getElementById("institution").value;

        const editId =
            document.getElementById("editId").value.trim();

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!full_name || !username || !role) {
            alert("Please fill all required fields.");
            return;
        }

        // Password required only for NEW user
        if (editId === "" && !password) {
            alert("Password is required for a new user.");
            return;
        }

        if (password && password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        // ==========================================
        // BLOCK
        // ==========================================

        const blockToAssign =
            (myRole === "block_officer" && myBlock)
                ? myBlock
                : null;

        // ==========================================
        // CALL EDGE FUNCTION
        // CREATE + UPDATE
        // ==========================================

        console.log(
            editId
                ? "Updating user through Edge Function..."
                : "Creating user through Edge Function..."
        );

        const { data, error } =
            await db.functions.invoke(
                "admin-create-user",
                {
                    body: {
                        editId: editId || "",

                        full_name,
                        username,
                        email,
                        mobile,
                        password,
                        role,
                        institution_id:
                            institution_id || null,
                        block:
                            blockToAssign
                    }
                }
            );

        // ==========================================
        // EDGE FUNCTION ERROR
        // ==========================================

        if (error) {

            console.error(
                "admin-create-user invoke error:",
                error
            );

            alert(
                "Could not save user:\n\n" +
                (error.message || "Unknown error")
            );

            return;
        }

        // ==========================================
        // APPLICATION ERROR
        // ==========================================

        if (!data || data.success !== true) {

            console.error(
                "admin-create-user response:",
                data
            );

            alert(
                "Could not save user:\n\n" +
                (
                    data?.error ||
                    "Unknown error"
                )
            );

            return;
        }

        // ==========================================
        // SUCCESS
        // ==========================================

        console.log(
            "User operation successful:",
            data
        );

        if (editId === "") {

            alert(
                "User Saved Successfully."
            );

        } else {

            alert(
                "User Updated Successfully."
            );
        }

        // ==========================================
        // RESET FORM
        // ==========================================

        document.getElementById("editId").value = "";

        document.getElementById("fullName").value = "";
        document.getElementById("username").value = "";
        document.getElementById("email").value = "";
        document.getElementById("mobile").value = "";
        document.getElementById("password").value = "";
        document.getElementById("role").value = "";
        document.getElementById("institution").value = "";

        document.getElementById("password").placeholder =
            "Password";

        saveUserBtnEl.innerHTML =
            "💾 Save User";

        currentPage = 1;

        await loadUsers();
        await loadSummary();

    } catch (err) {

        console.error(
            "Unexpected Save User Error:",
            err
        );

        alert(
            "Unexpected error:\n\n" +
            (err?.message || String(err))
        );

    } finally {

        saveUserBtnEl.disabled = false;
    }
}
async function loadSummary() {

    let query = db
        .from("users")
        .select("*");

    if (myRole === "block_officer" && myBlock) {
        query = query.eq("block", myBlock);
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById("totalUsers").innerText =
        data.length;

    document.getElementById("totalAdmins").innerText =
        data.filter(u => u.role === "district_admin").length;

    document.getElementById("totalDistrict").innerText =
        data.filter(u => u.role === "block_officer").length;

    document.getElementById("totalStaff").innerText =
        data.filter(u =>
            u.role === "vo" ||
            u.role === "vi"
        ).length;

    document.getElementById("totalActive").innerText =
        data.filter(u => u.active).length;
}
function clearForm() {

    document.getElementById("editId").value = "";

    document.getElementById("fullName").value = "";

    document.getElementById("username").value = "";

    document.getElementById("email").value = "";

    document.getElementById("mobile").value = "";

    document.getElementById("password").value = "";

    document.getElementById("role").value = "";

    document.getElementById("institution").value = "";

    document.getElementById("saveUserBtn").innerHTML =
        "💾 Save User";

}
function searchUsers() {
    applyFilters();
}
function filterUsersByRole() {
    applyFilters();
}
function filterUsersByInstitution() {
    applyFilters();
}
function filterUsersByStatus() {
    applyFilters();
}
function applyFilters() {

    const search =
        document.getElementById("searchUser").value.toLowerCase();

    const role =
        document.getElementById("roleFilter").value.toLowerCase();

    const institution =
        document.getElementById("institutionFilter").value.toLowerCase();

    const status =
        document.getElementById("statusFilter").value.toLowerCase();

    filteredUsers = allUsers.filter(user => {

        const name = (user.full_name || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const userRole = (user.role || "").toLowerCase();
        const userInstitution =
            (user.institutions?.institution_name || "").toLowerCase();
        const userStatus =
            user.active ? "active" : "inactive";

        const matchSearch =
            name.includes(search) ||
            username.includes(search) ||
            email.includes(search) ||
            userRole.includes(search) ||
            userInstitution.includes(search);

        const matchRole =
            role === "" ||
            role === "all" ||
            userRole === role;

        const matchInstitution =
            institution === "all" ||
            userInstitution === institution;

        const matchStatus =
            status === "all" ||
            userStatus === status;

        return (
            matchSearch &&
            matchRole &&
            matchInstitution &&
            matchStatus
        );

    });

    currentPage = 1;

    renderTable();

}