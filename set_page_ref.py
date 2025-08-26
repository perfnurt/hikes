# Script that sets the trk link in the <FILE> .gpx file, file path given on command line

# page_refs is a dictionary mapping the name in the gpx file to the page number in the pdf to link to
# [ <name as set in the rtk/name element in the gpx file>, <page number in the pdf to link to> ]
page_refs = {
    "SK1" : 6,
    "SK2" : 9,
    "SK3" : 13,
    "SK4" : 16,
    "SK5" : 21,
    "SK6" : 25,
    "SK7" : 28,
    "SK8" : 31,
    "SK9" : 35,
    "SK10" : 39,
    "SK11" : 44,
    "SK12" : 47,
    "SK13" : 50,
    "SK14" : 54,
    "SK15" : 58,
    "SK16" : 61,
    "SK17" : 65,
    "SK18" : 68,
    "SK19" : 71,
    "SK20" : 74,
    "SK21" : 78,
    "SK22" : 81,
    "SK23" : 84,
    "SK24" : 88,
    "SK25" : 91,
    "SK26" : 94,
    "SK27" : 98,
    "SK28" : 103,
    "SK29" : 107,
    "SK30" : 111,
    "SK31" : 115,
    "SK32" : 120,
    "SK33" : 123,
    "SK34" : 127,

    'ms1-Himmavi': 6,
    'MS2 Krageholmssjön': 9,
    'MS3-Snogeholm': 13,
    'MS4-Fylan': 17,
    'MS5-Sjöbo Ora': 21,
    'MS6-Öved': 25,
    'MS7-Borstbäcken': 29,
    'MS8-Silvåkra': 33,
    'MS9-Dalby hage': 37,
    'MS10-Torna Hällestad': 42,
    'MS11-Klintaskogen': 46,
    'MS12-Körsbärsdalen-Humlamaden': 50,
    'MS13-Häckeberga': 55,
    'MS14-Bökeberg': 60,
    'MS15-Gyllebo sjö': 63 ,
    'MS16-Heinge': 66,
    'MS17-Verkasjön': 69 ,
    'MS18-Brösarps norra backar': 73,
    'MS19-Agusa': 76,
    'MS20 Degeberga': 79,
    'MS21-Bosarpasjön': 83,
    'MS22-Tjörnarpasjön': 87,
    'MS23-Fulltofta': 91,
    'MS24-Bjeveröd': 94,
    'MS25-Frostavallen': 98,
    'MS26-Södra Dagstorpstorpssjön': 102,
    'MS27- Stockamöllan': 105,
    'MS28-Odensjön': 109,
    'MS29 Skäralid Härsnäsdammarna': 113,
    'MS30-Spånbobacken-Klåveröd': 117,
    'MS31-Ruveröd': 121,
    'MS32-Klövahallar': 125,

    'ns1 - Tingvalla-Maglaby kärr' : 6,
    'ns2-Rössjön Trollehallar' : 10,
    'ns3-Vasasjön, Borgarsjön, Bihagasjön' : 15,
    'ns4-Riseberga' : 19,
    'ns5-Jällabjär' : 23,
    'ns6-Hunseröd' : 27,
    'ns7-Guvarp' : 31,
    'ns8-Gustavsborg Fåglasjön' : 35,
    'ns9-Lärkesholmssjön' : 40,
    'ns10-Tyringe' : 44,
    'ns11-Sösdala' : 49,
    'ns12-Vittsjö' : 53, 
    'ns13-Bjärlången-Dalsjön' : 59, 
    'ns14-Vieån' : 64,
    'ns15-Vedema' : 68,
    'ns16-Magle våtmark' : 73,
    'ns17-Maltesholm' : 78,
    'ns18-Åbjärravinen' : 83,
    'ns19-Wanås' : 87,
    'ns20-Torsebro bruk' : 91,
    'ns21-Balsberg kort' : 95, 
    'ns21-Balsberget' : 95, 
    'ns22-Ekestad - Karsholms skog' : 100,
    'ns23-Glimåkra-Trollabackarna' : 104, 
    'ns24-Kullaskogen' : 109,
    'ns25-Vesslarp' : 113,
    'ns26-Immeln' : 118,
    'ns27-Lerjevallen' : 123,
    'ns28-Vånga-Kastagropen' : 133,
    'ns29-Levrasjön' : 138, 
    'ns30-Östafors' : 143,
}

# Mapping name prefix to the PDF URL
PDF_URLs = {
    "SK": "https://rundvandringar_skanes_kust.pdf",
    "MS": "https://rundvandringar_mitt_skanes.pdf",
    "NS": "https://rundvandringar_norra_skanes.pdf",
}

import xml.etree.ElementTree as ET

# Get/set the filename
import sys
if len(sys.argv) != 2:
    print("Usage: python set_page_ref.py <FILE>.gpx")
    sys.exit(1)
FILENAME = sys.argv[1]

# Read the gpx file
with open(FILENAME, "r", encoding="utf-8") as f:
    gpx_data = f.read()
tree = ET.ElementTree(ET.fromstring(gpx_data))
root = tree.getroot()

for trk in root.findall("trk"):
    name_elem = trk.find("name")
    if name_elem is not None:
        name = name_elem.text
        if name in page_refs:
            page_number = page_refs[name]

            # URL chosen by looking at first to characters in name (uppercase)
            prefix = name[:2].upper()
            pdf_url = PDF_URLs[prefix] # Let it fail hard if prefix not found
            
            link = f"{pdf_url}#page={page_number}"
            # Set content of existing link element or create a new one
            link_elem = trk.find("link")
            if link_elem is None:
                link_elem = ET.Element("link")
                trk.append(link_elem)
            link_elem.attrib["href"] = link
        else:
            print(f"Link for '{name}' not set")

# Write back the modified gpx file
tree.write(FILENAME, encoding="utf-8", xml_declaration=True, default_namespace='')
