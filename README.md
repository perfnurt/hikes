# Hikes

This is a web app that, based on .gpx files, allows you to manage and view hiking trails. It provides a simple interface to visualize hikes on a map, log comments, ratings, and other information about the hikes.
It:
* Displays a map with tracks/hikes
* Shows a corresponding table/list of the hikes
* Holds hike info that are mapped to the tracks/hikes.
* Holds a "home" element for showing distance to the track.
* Provides means of logging/commenting/rating hikes.
* Allows for multiple .gpx files to be loaded, e.g. for different sets of hiking trails.
<img src="screenshot.png">

# Dependencies
* [leaflet](https://leafletjs.com/) and [leaflet-gpx](https://github.com/mpetazzoni/leaflet-gpx) are used for resolving .gpx file info and displaying map.
* PHP used for server side commands.

## config.json
File holding the apps's static configuration. It is structured like,
``` jsonc
{
    "home": {  // The location used when computing distance to hikes.
        "name": <string>,
        "latlng": [ <latitude>, <longitude> ]       
    },
    "links": [ // Links to other resources, displayed at the top left of the page
        {
            "name" : <string>,
            "href" : <string>
        }
    ],
    "gpxFiles" : [ // List of gpx files to be loaded
        {
            "display_name" : <string>, // Name to display in the UI
            "filename" : <string>, // Name of the gpx file
            "options" : { // Options for leaflet-gpx
              // See https://github.com/mpetazzoni/leaflet-gpx
            }
        }
    ]
}
```

Example:
``` jsonc
{
    "home": {
        "name": "Lund",
        "latlng": [55.70584, 13.19321 ]
    },
    "links": [
        {
            "name" : "Skåeneleden",
            "href" : "https://skaneleden.se/"
        }
    ],
    "gpxFiles" : [
        {
            "display_name" : "Skåneleden",
            "filename" : "skaneleden.gpx",
            "options" : {
                "async": true,
                "gpx_options" : {
                    "parseElements": ["track"]
                },
                "markers" : {
                    "startIcon" : false, 
                    "endIcon" : false
                },
                "polyline_options": {
                    "color" : "orange"
                }
            }
        },
    ]
}
```


## hike_info.json
The "database" storing user provided hike info, such as comments, ratings, etc. It is structured like,
``` jsonc
{
    <name>: { // The name as defined in the trk/name element in the gpx file.
        "display_name": <string> // This is so one can give it custom name while keeping the mapping to the trk.
        "rate": <int>, // Rating of the hike, 1-10, 0/none means it has not been rated yet
        "comment": <string>, // Comment about the hike
        "hike_length": <string> // Length of the hike, e.g. "10 km"
    },
}
```
It is updated by invoking `server.php`.

## GPX structure
* The GPX files should use `trk` as the means of defining the hikes (i.e. not using `rte` or `wpt`).  
* Each track should have a name defined in the trk/name element. 
* If the trk has the (optional) href attribute, the link is displayed when showing the details of the hike.

Example:
``` xml
<gpx>
    <trk href="https://example.com/hike1">
        <name>Hike 1</name>
        <trkseg>
            <trkpt lat="55.70584" lon="13.19321"></trkpt>
            <trkpt lat="55.70600" lon="13.19400"></trkpt>
        </trkseg>
    </trk>
    <trk>
        <name>Hike 2</name>
        <trkseg>
            <trkpt lat="55.70700" lon="13.19500"></trkpt>
            <trkpt lat="55.70800" lon="13.19600"></trkpt>
        </trkseg>
    </trk>
</gpx>
```
