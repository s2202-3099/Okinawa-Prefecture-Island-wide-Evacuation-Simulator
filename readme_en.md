# Okinawa Prefecture-wide Evacuation Simulator

A single-file HTML tabletop model of a full-prefecture civilian evacuation from Okinawa
(≈1.45 million residents, up to ≈100,000 tourists) to mainland Japan under an anticipated
armed attack situation. It asks where the binding constraint actually sits: lift capacity,
reception capacity, or time.

**Unofficial, for tabletop study only.** This is not the position or plan of any government,
municipality, or armed force. Seat counts, sortie rates, turnaround days, parking stands,
reception capacities and availability rates are estimates derived from aircraft type and
distance, not published figures.

## What it models

Three transport layers — ground assembly on Okinawa main island, feeder legs from outlying
islands to hub islands, and trunk legs from three hubs (Naha, Miyako/Shimoji, New Ishigaki)
to 27 receiving airports and 4 discharge ports. Great-circle distance is computed per airport,
so sorties per aircraft per day fall with range and distant airports tie up far more airframes
per passenger moved. Reception on the mainland is modelled as temporary shelter plus long-term
housing that opens at a daily rate rather than all at once.

## Main finding

Monte Carlo over 1,000 runs, with sensitivity measured both by median split and by PRCC.
Warning time dominates every other variable (PRCC +0.96). Adding aircraft and shipping moves
the outcome far less than deciding to start days earlier. Under the central scenario, roughly
480,000 people remain in the prefecture when hostilities begin.

## Running it

`index.html` is self-contained — drag it into a browser, or serve it via GitHub Pages.
External dependencies are Leaflet 1.9.4 and CARTO map tiles only; it falls back to a built-in
vector coastline when neither loads.

## Known limits

Reception capacity figures, especially the 1.55 million "full national mobilization" case, are
placeholders rather than real allocations. Use of US military facilities in Japan is a pure
assumption. The mainland reception layer is calibrated only to the correct order of magnitude.
Full source list and further limitations are documented in Japanese below.

---
