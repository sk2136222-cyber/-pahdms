if (!requireLogin()) { throw new Error("Not logged in"); }

document.addEventListener("DOMContentLoaded", function () {

    console.log("Settings Page Loaded");

    loadMyAccount();
    loadDepartmentInfo();

    document
        .getElementById("changePasswordBtn")
        .addEventListener("click", changePassword);

    document
        .getElementById("saveDepartmentBtn")
        .addEventListener("click", saveDepartmentInfo);

});

// ==========================================
// MY ACCOUNT INFO (read-only)
// ==========================================

function loadMyAccount() {

    const user = getCurrentUser();

    if (!user) return;

    document.getElementById("myFullName").innerText = user.full_name || "-";
    document.getElementById("myUsername").innerText = user.username || "-";
    document.getElementById("myRoleBadge").innerText = user.role || "-";

}

// ==========================================
// CHANGE PASSWORD
// ==========================================

async function changePassword() {

    const newPassword =
        document.getElementById("newPassword").value.trim();

    const confirmPassword =
        document.getElementById("confirmPassword").value.trim();

    if (!newPassword || !confirmPassword) {
        alert("Please fill both password fields.");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const { error } = await db.auth.updateUser({
        password: newPassword
    });

    if (error) {
        console.error("Password Update Error:", error);
        alert(
            "Could not update password: " + error.message +
            "\n\nIf this keeps failing, please contact the District Administrator to reset it for you."
        );
        return;
    }

    alert("Password updated successfully. Please use the new password next time you log in.");

    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

}

// ==========================================
// DEPARTMENT INFO
// ==========================================

async function loadDepartmentInfo() {

    const { data, error } = await db
        .from("department_settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) {
        console.error("Department Settings Load Error:", error);
        return;
    }

    document.getElementById("departmentName").value = data.department_name || "";
    document.getElementById("districtName").value = data.district_name || "";
    document.getElementById("contactEmail").value = data.contact_email || "";
    document.getElementById("contactPhone").value = data.contact_phone || "";

    // Only district_admin can edit; others see read-only fields.
    const user = getCurrentUser();

    if (!user || user.role !== "district_admin") {

        ["departmentName", "districtName", "contactEmail", "contactPhone"]
            .forEach(id => document.getElementById(id).disabled = true);

        document.getElementById("saveDepartmentBtn").style.display = "none";
        document.getElementById("adminOnlyBadge").style.display = "inline-block";

    }

}

async function saveDepartmentInfo() {

    const department_name =
        document.getElementById("departmentName").value.trim();

    const district_name =
        document.getElementById("districtName").value.trim();

    const contact_email =
        document.getElementById("contactEmail").value.trim();

    const contact_phone =
        document.getElementById("contactPhone").value.trim();

    if (!department_name || !district_name) {
        alert("Department Name and District Name are required.");
        return;
    }

    const { error } = await db
        .from("department_settings")
        .update({
            department_name,
            district_name,
            contact_email: contact_email || null,
            contact_phone: contact_phone || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", 1);

    if (error) {
        console.error("Department Settings Save Error:", error);
        alert(error.message);
        return;
    }

    alert("Department Info Updated Successfully.");

}