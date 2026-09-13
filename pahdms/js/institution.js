if (!requireRole("district_admin", "block_officer")) { throw new Error("Unauthorized"); }
let currentPage = 1;
const recordsPerPage = 10;
let allInstitutions = [];
document.addEventListener("DOMContentLoaded", function () {
    console.log("Institution Module Loaded");

    const addBtn = document.getElementById("btnAddInstitution");
    if (addBtn) addBtn.addEventListener("click", async function () {
        document.getElementById("editId").value = "";
        document.getElementById("code").value = "";
        document.getElementById("name").value = "";
        document.getElementById("type").value = "";
        document.getElementById("block").value = "";
        document.getElementById("district").value = "Fazilka";
        document.getElementById("saveBtn").innerText = "Save Institution";

        // Block officers can only create institutions in their own
        // block, so lock the field to it instead of leaving it free-text.
        const myBlock = await getMyBlock();
        const blockField = document.getElementById("block");
        if (myBlock) {
            blockField.value = myBlock;
            blockField.readOnly = true;
        } else {
            blockField.readOnly = false;
        }

        openInstitutionModal();
    });

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveInstitution);
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportInstitutions);
    const prevBtn = document.getElementById("prevPageBtn");
    if (prevBtn) prevBtn.addEventListener("click", function () { if (currentPage > 1) { currentPage--; loadInstitutions(); } });
    const nextBtn = document.getElementById("nextPageBtn");
    if (nextBtn) nextBtn.addEventListener("click", function () {
        const totalPages = Math.ceil(allInstitutions.length / recordsPerPage);
        if (currentPage < totalPages) { currentPage++; loadInstitutions(); }
    });
    ["typeFilter", "blockFilter", "statusFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", () => { currentPage = 1; loadInstitutions(); });
    });
    const search = document.getElementById("searchBox");
    if (search) search.addEventListener("input", filterInstitutionRows);

    loadInstitutions();
});

function filterInstitutionRows() {
    const value = (document.getElementById("searchBox")?.value || "").toLowerCase();
    document.querySelectorAll("#institutionList tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(value) ? "" : "none";
    });
}

async function loadInstitutions() {

    let query = db
        .from("institutions")
        .select("*");

    const myBlock = await getMyBlock();

    if (myBlock) {
        query = query.eq("block", myBlock);
    }

    const typeFilter =
        document.getElementById("typeFilter").value;

    if (typeFilter !== "ALL") {
        query = query.eq("institution_type", typeFilter);
    }
const blockFilter =
    document.getElementById("blockFilter").value;

if (blockFilter !== "ALL") {
    query = query.eq("block", blockFilter);
}
const statusFilter =
    document.getElementById("statusFilter").value;

if (statusFilter === "ACTIVE") {
    query = query.eq("active", true);
}

if (statusFilter === "INACTIVE") {
    query = query.eq("active", false);
}
    const { data, error } = await query.order("institution_name");

    if (error) {
        console.error(error);
        return;
    }
const totalPages = Math.ceil(data.length / recordsPerPage);

if (currentPage > totalPages) {
    currentPage = totalPages || 1;
}
allInstitutions = data;

const start = (currentPage - 1) * recordsPerPage;
const end = start + recordsPerPage;

const pageData = allInstitutions.slice(start, end);

document.getElementById("recordInfo").innerText =
`Showing ${start + 1}-${Math.min(end, allInstitutions.length)} of ${allInstitutions.length} Records`;

document.getElementById("pageNumber").innerText =
`Page ${currentPage}`;
    let rows = "";

   pageData.forEach(item => {

        rows += `
        <tr>
            <td>${esc(item.institution_code)}</td>
            <td>${esc(item.institution_name)}</td>
            <td>${esc(item.institution_type)}</td>
            <td>${esc(item.block)}</td>
            <td>${esc(item.district)}</td>
            <td>
<button
onclick="toggleStatus('${esc(item.id)}', ${item.active})"
style="
background:${item.active ? '#198754' : '#dc3545'};
padding:6px 12px;
margin:0;
font-size:13px;
">
${item.active ? "🟢 Active" : "🔴 Inactive"}
</button>
</td>
            <td>

<button
onclick="editInstitution('${esc(item.id)}')"
style="
background:#0d6efd;
padding:6px 12px;
margin:2px;
">
✏️ Edit
</button>

<button
onclick="deleteInstitution('${esc(item.id)}')"
style="
background:#dc3545;
padding:6px 12px;
margin:2px;
">
🗑 Delete
</button>

</td>
        </tr>
        `;

    });

    document.getElementById("institutionList").innerHTML = rows;

loadSummary(data);

populateBlockFilter(data);

}

function populateBlockFilter(data){

    const blockFilter = document.getElementById("blockFilter");
    if(!blockFilter) return;

    const currentValue = blockFilter.value || "ALL";

    const uniqueBlocks = [...new Set(
        data.map(item => item.block).filter(b => b && b.trim() !== "")
    )].sort();

    blockFilter.innerHTML = `<option value="ALL">All Blocks</option>`;

    uniqueBlocks.forEach(block => {
        blockFilter.innerHTML += `<option value="${esc(block)}">${esc(block)}</option>`;
    });

    blockFilter.value = currentValue;

}

async function saveInstitution() {
console.log("saveInstitution running...");
const editId = document.getElementById("editId").value;

const code = document.getElementById("code").value.trim();
const name = document.getElementById("name").value.trim();
const type = document.getElementById("type").value;
const block = document.getElementById("block").value.trim();
const district = document.getElementById("district").value.trim();

if (
    code === "" ||
    name === "" ||
    type === "" ||
    block === "" ||
    district === ""
) {
    alert("Please fill all required fields");
    return;
}
let result;

if (editId) {

    result = await db
        .from("institutions")
        .update({
            institution_code: code,
            institution_name: name,
            institution_type: type,
            block: block,
            district: district
        })
        .eq("id", editId);

} else {

    result = await db
        .from("institutions")
        .insert([{
            institution_code: code,
            institution_name: name,
            institution_type: type,
            block: block,
            district: district,
            active: true
        }]);

}
if (result.error) {

    console.error(result.error);
    alert(result.error.message);
    return;

}

alert(
    editId
        ? "Institution Updated Successfully"
        : "Institution Saved Successfully"
);

// Close Popup
closeInstitutionModal();

// Clear Form
document.getElementById("editId").value = "";
document.getElementById("code").value = "";
document.getElementById("name").value = "";
document.getElementById("type").value = "";
document.getElementById("block").value = "";
document.getElementById("district").value = "Fazilka";

// Reset Button
document.getElementById("saveBtn").innerText = "Save Institution";

// Reload Table
loadInstitutions();
    

}async function deleteInstitution(id){

    if(!confirm("Are you sure you want to delete this institution?")){
        return;
    }


    const { error } = await db
        .from("institutions")
        .delete()
        .eq("id", id);


    if(error){

        console.error(error);
        alert(error.message);

    }
    else{

        alert("Institution Deleted Successfully");

        loadInstitutions();

    }

}async function editInstitution(id){

    const { data, error } = await db
        .from("institutions")
        .select("*")
        .eq("id", id)
        .single();


    if(error){

        console.error(error);
        alert(error.message);
        return;

    }


    document.getElementById("editId").value = data.id;

    document.getElementById("code").value = data.institution_code;

    document.getElementById("name").value = data.institution_name;

    document.getElementById("type").value = data.institution_type;

    document.getElementById("block").value = data.block;

    document.getElementById("district").value = data.district;

    // Lock the block field for block officers here too, so they
    // can't move an institution out of their own block.
    const myBlock = await getMyBlock();
    document.getElementById("block").readOnly = !!myBlock;

    document.getElementById("saveBtn").innerText = "Update Institution";

    openInstitutionModal();

}async function toggleStatus(id, currentStatus){

    const { error } = await db
        .from("institutions")
        .update({
            active: !currentStatus
        })
        .eq("id", id);

    if(error){

        console.error(error);
        alert(error.message);
        return;

    }

    loadInstitutions();

}async function exportInstitutions() {

    const { data, error } = await db
        .from("institutions")
        .select("*")
        .order("institution_name");

    if (error) {
        alert(error.message);
        return;
    }

    let csv =
"Code,Name,Category,Block,District,Status\n";

    const csvEscape = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    data.forEach(item => {

        csv += [
            csvEscape(item.institution_code),
            csvEscape(item.institution_name),
            csvEscape(item.institution_type),
            csvEscape(item.block),
            csvEscape(item.district),
            csvEscape(item.active ? "Active" : "Inactive")
        ].join(",") + "\n";

    });

    const blob = new Blob([csv], {
        type: "text/csv"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "Institutions.csv";

    a.click();

    URL.revokeObjectURL(url);

}
function loadSummary(data){

    document.getElementById("totalInstitution").innerText =
    data.length;

document.getElementById("totalCVH").innerText =
    data.filter(item =>
        item.institution_type === "CVH"
    ).length;

document.getElementById("totalCVD").innerText =
    data.filter(item =>
        item.institution_type === "CVD"
    ).length;
    document.getElementById("totalActive").innerText =
        data.filter(item => item.active).length;

}
// ======================================
// Close Institution Modal
// ======================================

function closeInstitutionModal() {

    document.getElementById("institutionModal").style.display = "none";

}

function openInstitutionModal(){

    document.getElementById("institutionModal").style.display = "flex";

}