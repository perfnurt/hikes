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

// The hikes collection holds hike elements tying the hike info and layers/markers/lines together.
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

                const lenA = parseFloat(a.info.hike_length ? a.info.hike_length : a.computed_hike_length);
                const lenB = parseFloat(b.info.hike_length ? b.info.hike_length : b.computed_hike_length);
                return compare(lenB, lenA);
        }
    });
}

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
        if (h.hidden) {
            continue;
        }
        if (filter.length > 0 && h.info.display_name.toLowerCase().indexOf(filter) === -1) {
            continue;
        }

        let tr = $add(table, "tr")
        tr.id = "tr_" + h.name;
        $add(tr, "td").textContent = h.info ? h.info.display_name : h.name;
        $add(tr, "td").textContent = h.dist;
        $add(tr, "td").textContent = h.info.rate ? h.info.rate : "";
        $add(tr, "td").textContent = h.info.hike_length ?  h.info.hike_length.toFixed(1) : (h.computed_hike_length ? h.computed_hike_length.toFixed(1) : "");

        tr.addEventListener('click', (e) => { handle_click(e); });
        tr.addEventListener('mouseover', () => { highlight(h); });
        tr.addEventListener('mouseout', () => { clear_highlighted(); });
    }
}

function compute_polyline_length(line) {
    // Compute the total length of the polyline in kilometers
    let totalLength = 0;
    const latlngs = line.getLatLngs();
    for (let i = 0; i < latlngs.length - 1; i++) {
        totalLength += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    return (totalLength / 1000); // Return length in kilometers
}

function highlight_from_map(h) {
    let row = highlight(h);
    row.scrollIntoView({ behavior: 'instant', block: 'center' });
}

function updated_visited_icons(map) {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            let name = layer.options.title;
            let h = hikes.find(h => h.name === name);
            if (!h.info.rate) {
                layer._icon.classList.add("not_visited");
            }
        }
    });
    }

var count_to_load = 0;
var loaded_count = 0;

function load_gpx_file(map, home, gpxFile, hike_info, options) {
    const homePos = home["latlng"];

    let layer_group = new L.GPX(gpxFile, options);
    // leaflet-gpx events, see https://github.com/mpetazzoni/leaflet-gpx?tab=readme-ov-file#events
    // line was added to the event in this pr, https://github.com/mpetazzoni/leaflet-gpx/pull/169, not yet officially released.
    layer_group.on("addpoint", e => {
        let name = e.line.getElementsByTagName('name')[0].textContent;
        let h = hikes.find(h => h.name === name);
        h.marker = e.point;

        e.point.on('mouseover', function (mouseEvent) { highlight_from_map(h); });
        e.point.on('mouseout', function (mouseEvent) { clear_highlighted(); });

        e.point.options.title = name

        layer_group.addLayer(e.point);

    })
    .on("addline", e => {
        let name = e.element.getElementsByTagName('name')[0].textContent;
        let link = e.element.getElementsByTagName('link')[0];
        if (link) {
            // Get link from the element's href attribute
            link = link.getAttribute('href');
        }
        let h = hikes.find(h => h.name === name);
        e.line.options.title = name
        if (h) { // For then the trk has multiple trkseg
            h.lines.push(e.line); // Add the line to the existing hike
            h.computed_hike_length += compute_polyline_length(e.line); // Update the computed length of the hike
        } else{
            h = {
                name: name,
                info:name in hike_info ? hike_info[name] : { // Default info if not found in hike_info, all info values are editable by the user.
                    display_name : name,
                    rate : 0,
                    comment : "",
                },
                dist: (e.line.getLatLngs()[0].distanceTo(homePos) / 1000).toFixed(1),
                latlng: e.line.getLatLngs()[0], // Use the first point as the marker position
                lines : [e.line], // Store the line in the info for later use
                link: link, // Link to the hike, if available. Displayed in the edit page.
                computed_hike_length: compute_polyline_length(e.line), // Computed the length of the hike. Overridden if having a info.hike_length.
                hidden: false, // Hidden from the table by default
            }

            hikes.push(h);
        }

        e.line.on('mouseover', function (mouseEvent) { highlight_from_map(h);  });
        e.line.on('mouseout', function (mouseEvent) { clear_highlighted(); });
        h.hidden = false;
        layer_group.addLayer(e.line);

    })
    .on('loaded', function(e) {
        const gpx = e.target;
        map.fitBounds(gpx.getBounds());

        loaded_count += 1;

        // If all files are loaded ...
        if (loaded_count == count_to_load) {
            updated_visited_icons(map);
            sortTable(SORT_BY_DIST);

            const total_hikes = hikes.length;
            const total_visited = hikes.filter(h => h.info.rate).length;

            $("hike-summary").textContent = ` ${total_hikes} vandringar/leder, varav ${total_visited}  besökta (betygsatta). `;
        }
    })
    .on('click', e => { handle_click(e.originalEvent); })
    .addTo(map);

    return layer_group;
}
function hide_show_hikes(layers, hide) {
    for (let layer of layers) {
        if (layer instanceof L.Polyline) {
            let h = hikes.find(h => h.name === layer.options.title);
            if (h) {
                h.hidden = hide;
            }
        }
    }
    show_hikes_table();
}

function setup() {
    get("hike_info.json", hike_info => {
        get("config.json", config => {

            for(let l of config["links"]) {
                $add($("top-bar"), "a", { "href" : l.href, "target":"_blank"}).textContent = l.name;
                // Add space between top-bar elements
                $add($("top-bar"), "span").textContent = " ";
            }

            const home = config["home"];
            count_to_load = config["gpxFiles"].length;
            loaded_count = 0;

            var map = L.map('map');

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            for (let file_config of config["gpxFiles"]) {
                let filename = file_config["filename"];
                let options = file_config["options"];

                // hike sets with checkboxes. When unchecked the layer_group is removed from the map, when checked it is added to the map.
                let label = $add($("hike-sets"), "label");
                let checkbox = $add(label, "input", { "type": "checkbox", "checked": "true" });
                label.appendChild($text(file_config["display_name"]));

                let layer_group = load_gpx_file(map, home, filename, hike_info, options);

                checkbox.addEventListener('change', function() {
                    hide_show_hikes(layer_group.getLayers(), !this.checked);
                    if (this.checked) {
                        layer_group.addTo(map);
                        updated_visited_icons(map);
                    } else {
                        layer_group.remove();
                    }
                });

            }
        })
    });
}

function highlight(h) {
    highlighted = h;
    if (h.marker) {
        h.marker._icon.classList.add('highlight_map');
    }
    let row = $("tr_" + h.name);
    row.classList.add('highlight_row');
    for (let line of h.lines) line.setStyle({ weight: 8 });

    return row;
}

function clear_highlighted() {
    for (let line of highlighted.lines) line.setStyle({ weight: 3 });
    if (highlighted.marker) {
        highlighted.marker._icon.classList.remove('highlight_map');
    }
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
    if (h.link) {
        $add($('h_link'), "a", { "href" : h.link, "target":"_blank"}).textContent = h.link;
    }

    let latlng = h.latlng;
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
    let hike_length = h.info.hike_length ? h.info.hike_length : h.computed_hike_length;
    $('h_length').value = hike_length !== undefined ? hike_length.toFixed(1) : "";
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

