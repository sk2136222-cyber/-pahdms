if (!requireRole("district_admin", "block_officer")) { throw new Error("Unauthorized"); }
/* =========================================================
   PAHDMS V5.1
   Employee Live Tracking
   ========================================================= */

console.log("Live Tracking Loaded");

// Fazilka district, Punjab -> sensible default map center
const DEFAULT_CENTER = [30.403, 74.024];
const DEFAULT_ZOOM = 10;

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

let map = null;
let markers = {};       // user_id -> L.marker
let currentLocations = [];
let refreshTimer = null;

document.addEventListener("DOMContentLoaded", () => {

    if (!window.db) {
        console.error("Supabase database object not found");
        return;
    }

    initMap();
    loadLocations();

    document.getElementById("refreshBtn")
        .addEventListener("click", () => loadLocations(true));

    document.getElementById("employeeSearch")
        .addEventListener("input", renderEmployeeList);

    refreshTimer = setInterval(loadLocations, 15000);

});

// =========================================================
// MAP SETUP
// =========================================================

function initMap() {
    map = L.map("trackingMap").setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
}

// =========================================================
// LOAD LOCATIONS
// =========================================================

async function loadLocations(manual) {

    const icon = document.getElementById("refreshIcon");
    if (manual && icon) icon.classList.add("spin");

    try {

        const { data, error } = await window.db
            .from("user_locations")
            .select("*")
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Live Tracking load error:", error);
            return;
        }

        currentLocations = data || [];
        renderStats();
        renderMapMarkers();
        renderEmployeeList();

        const now = new Date();
        document.getElementById("lastRefreshedNote").textContent =
            "Last updated: " + now.toLocaleTimeString();

    } catch (e) {
        console.error("Live Tracking load exception:", e);
    } finally {
        if (manual && icon) {
            setTimeout(() => icon.classList.remove("spin"), 400);
        }
    }
}

// =========================================================
// HELPERS
// =========================================================

function isOnline(row) {
    if (!row.updated_at) return false;
    return (Date.now() - new Date(row.updated_at).getTime()) < ONLINE_THRESHOLD_MS;
}

function timeAgo(dateStr) {
    if (!dateStr) return "Never";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    return days + "d ago";
}

function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function roleLabel(role) {
    const map = {
        district_admin: "District Admin",
        block_officer: "Block Officer",
        vo: "Veterinary Officer",
        vi: "Veterinary Inspector"
    };
    return map[role] || role || "";
}

// =========================================================
// STATS
// =========================================================

function renderStats() {
    const total = currentLocations.length;
    const online = currentLocations.filter(isOnline).length;
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statOnline").textContent = online;
    document.getElementById("statOffline").textContent = total - online;
}

// =========================================================
// MAP MARKERS
// =========================================================

function renderMapMarkers() {

    const seenIds = new Set();

    currentLocations.forEach(row => {

        if (row.latitude == null || row.longitude == null) return;

        seenIds.add(row.user_id);

        const online = isOnline(row);
        const color = online ? "#22c55e" : "#9ca3af";

        const dot = L.divIcon({
            className: "",
            html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};
                    border:3px solid #fff;box-shadow:0 0 0 2px ${color};"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const popupHtml = `
            <h4>${esc(row.full_name || "Unknown")}</h4>
            <p>${esc(roleLabel(row.role))}</p>
            <p>${esc(row.institution_name || "-")}</p>
            <p>Last seen: ${timeAgo(row.updated_at)}</p>
        `;

        if (markers[row.user_id]) {
            markers[row.user_id]
                .setLatLng([row.latitude, row.longitude])
                .setIcon(dot)
                .setPopupContent(popupHtml);
        } else {
            markers[row.user_id] = L.marker([row.latitude, row.longitude], { icon: dot })
                .addTo(map)
                .bindPopup(popupHtml);
        }

    });

    // Remove markers for users no longer in the result set
    Object.keys(markers).forEach(id => {
        if (!seenIds.has(id)) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });
}

// =========================================================
// EMPLOYEE LIST (with search filter)
// =========================================================

function renderEmployeeList() {

    const search = (document.getElementById("employeeSearch")?.value || "")
        .trim().toLowerCase();

    const container = document.getElementById("employeeList");

    let rows = currentLocations;

    if (search) {
        rows = rows.filter(r =>
            (r.full_name || "").toLowerCase().includes(search) ||
            (r.institution_name || "").toLowerCase().includes(search)
        );
    }

    if (!rows.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-location-crosshairs"></i>
                ${currentLocations.length ? "No matching employees." : "No employee locations reported yet."}
            </div>`;
        return;
    }

    // Online first, then most recently seen
    rows = [...rows].sort((a, b) => {
        const aOnline = isOnline(a), bOnline = isOnline(b);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    container.innerHTML = rows.map(row => {
        const online = isOnline(row);
        return `
        <div class="employee-item ${online ? "" : "offline"}" data-user-id="${esc(row.user_id)}">
            <div class="avatar">${esc(initials(row.full_name))}</div>
            <div class="info">
                <h4>${esc(row.full_name || "Unknown")}</h4>
                <p>${esc(roleLabel(row.role))} ${row.institution_name ? "· " + esc(row.institution_name) : ""}</p>
                <div class="last-seen">
                    <span class="status-dot ${online ? "online" : "offline"}"></span>
                    ${online ? "Online" : "Offline"} · ${timeAgo(row.updated_at)}
                </div>
            </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".employee-item").forEach(el => {
        el.addEventListener("click", () => focusEmployee(el.dataset.userId));
    });
}

function focusEmployee(userId) {
    const marker = markers[userId];
    if (!marker) return;
    map.setView(marker.getLatLng(), 15);
    marker.openPopup();
}
