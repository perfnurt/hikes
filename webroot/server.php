<?php
error_reporting(E_ALL);

// This is a simple PHP script that reads and writes the hike info JSON data to a file.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit();
}

const HIKE_INFO_FILE_NAME = "hike_info.json";

// --------------- functions

// Function to read and decode JSON data from the file
function readHikeInfoFile() {
    $jsonData = file_get_contents(HIKE_INFO_FILE_NAME);
    return json_decode($jsonData, true);
}

// Function to write data to the JSON file
function writeHikeInfoFile($data) {
    $jsonData = json_encode($data, JSON_PRETTY_PRINT);
    file_put_contents(HIKE_INFO_FILE_NAME, $jsonData);
}

function error($err) {
    return array("error" => $err);
}

// --------------- main
function resolve_request() {
    $data = json_decode(file_get_contents("php://input"));
    $op = $data->op;
    switch($op) {
          case "save_hike_info":
            $fileData = readHikeInfoFile();
            $fileData["hikes"][$data->name] = $data->hike_info;
            writeHikeInfoFile($fileData);
            return "OK";
        case "save_hikes_info":
            $fileData = readHikeInfoFile();
            foreach ($data->hikes as $h) {
                $fileData["hikes"][$h->display_name] = $h;
            }
            writeHikeInfoFile($fileData);
            return "OK";
        default:
            return error("Unknown op:" . $op);
    };
}

header('Content-Type: application/json');
echo json_encode(resolve_request());
?>