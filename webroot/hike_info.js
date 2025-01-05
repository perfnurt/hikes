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
var sort_order = SORT_BY_DIST; // default

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
        "name" : "Avstånd",
        "sort_ix" : SORT_BY_DIST,
        "sort_order" : sort_asc,
    },
    {
        "name" : "Betyg",
        "sort_ix" : SORT_BY_RATE,
        "sort_order" : sort_desc,
    },
    {
        "name" : "Längd",
        "sort_ix" : SORT_BY_LENGTH,
        "sort_order" : sort_desc,
    },
];

function sort_hikes(sort_order_) {
    sort_order = sort_order_;
    hikes.sort((a, b) => {
        switch(sort_order){
            case SORT_BY_NAME:
                // Example name "MS19-Agusa"
                // Split name into left part, integer, and right part and sort them separately
                // So that the integer part is sorted numerically.
                // Also ignore spaces and dashes in the name when comparing.
                const parseName = (name) => {
                    // Normalize name by removing dashes and spaces and lowercasing
                    const normalized = name.replace(/[-\s]/g, "").toLowerCase();

                    // Match components: left part, integer, and right part
                    const match = normalized.match(/^([a-zA-Z]*)(\d+)(.*)$/);
                    if (!match) return [normalized, 0, ""]; // If no match, return normalized as left part

                    const [, left, num, right] = match;
                    return [left, parseInt(num, 10), right];
                };

              // Parse both names
              const [leftA, numA, rightA] = parseName(a.name);
              const [leftB, numB, rightB] = parseName(b.name);

              // Compare left parts alphabetically
              if (leftA !== leftB) return leftA.localeCompare(leftB);

              // Compare numeric parts numerically
              if (numA !== numB) return numA - numB;

              // Compare right parts alphabetically
              return rightA.localeCompare(rightB);
            case SORT_BY_DIST:
                return  a.dist - b.dist;
            case SORT_BY_RATE:
                return b.info.rate - a.info.rate;
            case SORT_BY_LENGTH:
                let lenA = a.info.hike_length !== undefined ? parseFloat(a.info.hike_length) : 0;
                let lenB = b.info.hike_length !== undefined ? parseFloat(b.info.hike_length) : 0;
                if (lenA > lenB) return -1;
                if (lenA < lenB) return 1;
                return 0;
            }
    });
}

var home_name;
function show_hikes_table() {
    let table = $clear($("track-table"));
    let tr = $add(table, "tr");
    $add(tr, "th", { "onclick":"sortTable(SORT_BY_NAME)", "id" : "head_0"});
    $add(tr, "th", { "onclick":"sortTable(SORT_BY_DIST)", "id" : "head_1"});
    $add(tr, "th", { "onclick":"sortTable(SORT_BY_RATE)", "id" : "head_2"});
    $add(tr, "th", { "onclick":"sortTable(SORT_BY_LENGTH)", "id" : "head_3"});
    for (let i = 0; i < table_heads.length; i++) {
        const ch = i == sort_order ? sort_icons[table_heads[i].sort_order] : "&nbsp;";
        let th = $("head_" + i);
        th.innerHTML = table_heads[i].name + " " + ch;
    }
    for (let h of hikes) {
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
            $add($("links"), "a", { "href" : l.href, "target":"_blank"}).textContent = l.name;
            // Add space between links
            $add($("links"), "span").textContent = " ";
        }

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
            show_hikes_table();
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
