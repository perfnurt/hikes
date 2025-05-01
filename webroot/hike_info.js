// This file, hike_info.js, is responsible for managing and displaying information about various hikes.
// It includes functionality for sorting hikes, displaying them in a table, and interacting with a map.
// The main features include:
// - Sorting hikes by name, distance, rating, or length.
// - Displaying hikes in a table with sortable columns.
// - Highlighting hikes on the map and in the table when hovered over.
// - Selecting hikes for detailed information and editing.
// - Loading hike data from a JSON file and GPX file.
// - Providing an interface for editing hike details in a separate window.
// - Saving hike information back to the server.

// highlighted reflects the highlighted hike, hovered over in map or table.
var highlighted;

// selected reflects the hike selected for showing info / editing.
var selected;

// The hikes collection holds hike elements tying the hike info and layers/markers together.
// Order of the elements determines the order displayed in the table.
var hikes = []

const SORT_BY_NAME = 0;
const SORT_BY_DIST = 1;
const SORT_BY_RATE = 2;
const SORT_BY_LENGTH = 3;
var sort_by;
var toggle_sort = false;

const sort_icons = ["▲", "▼"];
const sort_asc = 0;
const sort_desc = 1;

const table_heads =  [
    {
        "name" : "Namn",
        "sort_ix" : SORT_BY_NAME,
        "sort_order" : sort_asc,
    },
    {
        "name" : "Avstånd (km)",
        "sort_ix" : SORT_BY_DIST,
        "sort_order" : sort_asc,
    },
    {
        "name" : "Betyg",
        "sort_ix" : SORT_BY_RATE,
        "sort_order" : sort_desc,
    },
    {
        "name" : "Längd (km)",
        "sort_ix" : SORT_BY_LENGTH,
        "sort_order" : sort_desc,
    },
];

function sort_hikes(sort_by_) {
    if (sort_by_ === sort_by) {
        toggle_sort = !toggle_sort;
    } else {
        toggle_sort = false;
    }
    sort_by = sort_by_;
    hikes.sort((a, b) => {
        // Utility function to compare two values, taking toggle_sort into account.
        const compare = (x, y) => toggle_sort ? y - x : x - y;
        switch(sort_by){
            case SORT_BY_NAME:
                // Example: "MS11 - Klintaskogen" => ["MS", 11, "Klintaskogen"]
                // Sort by left part, then number, then right part
                const parseName = name => {
                    const match = name.replace(/[-\s]/g, "").toLowerCase().match(/^([a-zA-Z]*)(\d+)(.*)$/);
                    return match ? [match[1], parseInt(match[2], 10), match[3]] : [name, 0, ""];
                };
                const [leftA, numA, rightA] = parseName(a.name);
                const [leftB, numB, rightB] = parseName(b.name);
                if (leftA !== leftB) return compare(leftA.localeCompare(leftB), leftB.localeCompare(leftA));
                if (numA !== numB) return compare(numA, numB);
                return compare(rightA.localeCompare(rightB), rightB.localeCompare(rightA));
            case SORT_BY_DIST:
                return compare(a.dist, b.dist);
            case SORT_BY_RATE:
                return compare(b.info.rate, a.info.rate);
            case SORT_BY_LENGTH:
                const lenA = parseFloat(a.info.hike_length ? a.info.hike_length : 0);
                const lenB = parseFloat(b.info.hike_length ? b.info.hike_length : 0);
                return compare(lenB, lenA);
        }
    });
}

var home_name;
function show_hikes_table() {

    // text input with id "filter" holds the filter string
    let filter = $("filter").value.toLowerCase();

    let table = $clear($("track-table"));
    // Headers
    let tr = $add(table, "tr");
    for (let i = 0; i < table_heads.length; i++) {
        $add(tr, "th", { "onclick":"sortTable(" + table_heads[i].sort_ix + ")", "id" : "head_" + i });

        let sort_order = table_heads[i].sort_order;
        // If toggle_sort, invert the sort order
        if (toggle_sort) {
            sort_order = sort_order == sort_asc ? sort_desc : sort_asc;
        }

        const ch = i == sort_by ? sort_icons[sort_order] : "&nbsp;";
        let th = $("head_" + i);
        th.innerHTML = table_heads[i].name + " " + ch;
    }
    // Rows
    for (let h of hikes) {
        // Filter
        if (filter.length > 0 && h.info.display_name.toLowerCase().indexOf(filter) === -1) {
            continue;
        }

        let tr = $add(table, "tr")
        tr.id = "tr_" + h.name;
        $add(tr, "td").textContent = h.info ? h.info.display_name : h.name;
        $add(tr, "td").textContent = h.dist;
        $add(tr, "td").textContent = h.info.rate ? h.info.rate : "";
        $add(tr, "td").textContent = h.info.hike_length !== undefined ?  h.info.hike_length : "";

        tr.addEventListener('click', (e) => { handle_click(e); });
        tr.addEventListener('mouseover', () => { highlight(h); });
        tr.addEventListener('mouseout', () => { clear_hightlighted(); });
    }
}

function setup_map() {
    get("hike_info.json", hike_info => {
        for(let l of hike_info["links"]) {
            $add($("top-bar"), "a", { "href" : l.href, "target":"_blank"}).textContent = l.name;
            // Add space between top-bar elements
            $add($("top-bar"), "span").textContent = " ";
        }

        const keys = Object.keys(hike_info["hikes"])
        let total_hikes = keys.length;
        let total_visited = 0;
        for (let k of keys) {
            let h = hike_info["hikes"][k];
            if (h.rate) {
                total_visited++;
            }
        }
        $add($("top-bar"), "span").textContent = ` ${total_hikes} vandringar, varav ${total_visited}  besökta (betygsatta). `;

        home_name = hike_info["home"]["name"]
        var map = L.map('map');

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Load the .gpx file
        const gpxFile = "source.gpx";
        new L.GPX(gpxFile, {
            async: true,
            gpx_options : {
                parseElements: ['track'], // Only get the trk elements from the gpx
            },
            markers : {
                endIcon : false, // These would overwrite the start marker
            },
        })
        // leaflet-gpx events, see https://github.com/mpetazzoni/leaflet-gpx?tab=readme-ov-file#events
        // line was added to the event in this pr, https://github.com/mpetazzoni/leaflet-gpx/pull/169, not yet officially released.
        .on("addpoint", e => {
            let trk = e.line;
            let name = trk.getElementsByTagName('name')[0].textContent;
            e.point.options.title = name;
        })
        .on('loaded', function(e) {
            const gpx = e.target;

            // Fit the map bounds to the GPX tracks
            map.fitBounds(gpx.getBounds());

            let newHikes = [];
            const homePos = hike_info["home"]["latlng"];

            // For each marker/track
            // * Create a hike element in the hikes collection
            // * Add eventlisteners for mouse interaction on map
            map.eachLayer(marker => {
                if (marker instanceof L.Marker && marker.options.title) {
                    let name = marker.options.title;
                    let h = {
                        name: name,
                        dist:(marker.getLatLng().distanceTo(homePos) / 1000).toFixed(1),
                        marker:marker,
                        info:name in hike_info["hikes"] ? hike_info["hikes"][name] : {
                            display_name : name,
                            rate : 0,
                            comment : "",
                        },
                    }
                    if (!(h.name in hike_info["hikes"])) {
                        newHikes.push(h.info)
                    }
                    hikes.push(h);

                    // hike UI /interaction
                    if (!h.info.rate) {
                        marker._icon.classList.add("not_visited");
                    }
                    marker.on('mouseover', function (mouseEvent) {
                        let row = highlight(h);
                        row.scrollIntoView({ behavior: 'instant', block: 'center' });
                    });
                    marker.on('mouseout', function (mouseEvent) {
                        clear_hightlighted();
                    });
                }
            });

            if (newHikes.length > 0) {
                console.log("New hikes : ", newHikes.length);
                save_hikes(newHikes, res => {
                    console.log("save_hikes : ", res);
                })
            }
            sortTable(SORT_BY_DIST);


        })
        .on('click', e => { handle_click(e.originalEvent); })
        .addTo(map);
    });
}

function highlight(h) {
    highlighted = h;
    h.marker._icon.classList.add('highlight_map');
    let row = $("tr_" + h.name);
    row.classList.add('highlight_row');
    return row;
}

function clear_hightlighted() {
    highlighted.marker._icon.classList.remove('highlight_map');
    $("tr_" + highlighted.name).classList.remove('highlight_row');
}

function sortTable(sort_order_) {
    sort_hikes(sort_order_);
    show_hikes_table();
}

function handle_click(e) {
    if(!highlighted) return;
    selected = highlighted;
    const left = e.clientX;
    const top = e.clientY;
    window.open("edit.html", 'Vandring', `width=800,height=400,left=${left},top=${top}`);
}

function save_hike(h, f) {
    post("server.php", {"op" : "save_hike_info", "name": h.name, "hike_info" : h.info}, f);
}

function save_hikes(hikes, f) {
    post("server.php", {"op" : "save_hikes_info", "hikes":  hikes}, f);
}

function save_selected() {
    save_hike(selected, res => {
        if (selected.info && selected.info.rate) {
            selected.marker._icon.classList.remove("not_visited");
        }
        show_hikes_table();
    })
}

//------------------------------------------
// edit page functions
//------------------------------------------
function setup_edit() {
    window.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            window.close();
        }
        if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
            save_edit();
        }
    });
    let h = window.opener.selected;

    $('h_dist').textContent = h.dist + " km";
    $('h_name').value = h.info.display_name;
    let latlng = h.marker.getLatLng();
    $add($('h_map_link'), "a", { "href" : `https://www.google.com/maps?q=${latlng.lat},${latlng.lng}`, "target":"_blank"}).textContent = latLngToDMS(latlng.lat, latlng.lng);
    const rateInputs = document.querySelectorAll("input[type='radio']");
    for (let input of rateInputs) {
        if (input.value == h.info.rate) {
            input.checked = true;
            break;
        }
    }
    $('h_comment').value = h.info.comment;
    // Additional elements (i.e. may be undefined in the info)
    $('h_length').value = h.info.hike_length !== undefined ? h.info.hike_length : "";
    $('h_length').focus();
}

function save_edit() {
    const rateInputs = document.querySelectorAll("input[type='radio']");
    let selectedRate = 0;
    rateInputs.forEach(input => { if (input.checked) selectedRate = input.value; });
    window.opener.selected.info = {
        display_name : $('h_name').value,
        rate : selectedRate,
        comment : $('h_comment').value,
        hike_length : $('h_length').value,
    }
    window.opener.save_selected();
    window.close();
}

// Convert decimal degrees to degrees, minutes, and seconds
function latLngToDMS(lat, lng) {
    // Convert a single value
    function toDMS(value) {
        const degrees = Math.floor(value);
        const minutes = Math.floor((value - degrees) * 60);
        const seconds = ((value - degrees - minutes / 60) * 3600).toFixed(2);
        return `${Math.abs(degrees)}°${Math.abs(minutes)}'${Math.abs(seconds)}"`;
    }

    const ns = lat >= 0 ? "N" : "S";
    const ew = lng >= 0 ? "E" : "W";
    const latDMS = `${toDMS(lat)}${ns}`;
    const lngDMS = `${toDMS(lng)}${ew}`;
    return `${latDMS} ${lngDMS}`;
}

