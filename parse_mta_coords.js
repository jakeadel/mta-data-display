const fs = require('fs');

const SVG_HEIGHT = 1000;
const SVG_WIDTH = 1000;

async function parseMtaSVG(filename, height, width) {
    const file = await fs.readFileSync(`./${filename}`, 'utf-8').split('\r\n');
    const lines = file.slice(1, -1).map((line) => line.split(','));

    // Find min and max of each
    let minLong = Infinity;
    let maxLong = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let trains = {};

    // and also get all of the lines into their own lists
    for (let [line, index, lat, long] of lines) {
        lat = parseFloat(lat);
        long = parseFloat(long);
        minLong = Math.min(minLong, long);
        maxLong = Math.max(maxLong, long);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    }

    for (let [line, index, lat, long] of lines) {
        lat = (lat - minLat) / (maxLat - minLat) * height;
        long = (long - minLong) / (maxLong - minLong) * width;

        if (line in trains) {
            trains[line].push({index, lat, long});
        }
        else {
            trains[line] = [{index, lat, long}];
        }
    }
    return trains;
}

function coordsToInput(trainLines) {
    let input;
    let pathsInput = [];
    let connectionsInput = [];
    let count = 0;

    for (const line in trainLines) {
        for (let i = 0; i < trainLines[line].length; i++) {
            if (i === 0) {
                continue;
            }

            const prev = trainLines[line][i-1];
            const curr = trainLines[line][i];

            pathsInput.push({
                id: count++,
                type: "straight",
                origin: {
                    x: prev.long,
                    y: prev.lat
                },
                destination: {
                    x: curr.long,
                    y: curr.lat
                }
            });
            connectionsInput.push(
                [[count-1, 1], [count, 0]]
            )
        }
    }

    fs.writeFileSync(
        'mta-input.json',
        JSON.stringify({pathsInput, connectionsInput: []}),
        'utf-8'
    )
    return input;
}

function templatePath(origin, destination, midpoint=false) {
    return `<path d="M ${origin.long} ${origin.lat} L ${destination.long} ${destination.lat}"/>`;
}


function coordsToSVG(trains) {
    let all = `<svg id="subway" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">\n`;
    for (const train in trains) {
        const trainData = trains[train];
        let curr = '\t<g fill="none" stroke="black" stroke-width="1">\n';
        for (let i = 1; i < trainData.length; i++) {
            curr += '\t\t' + templatePath(trainData[i-1], trainData[i]) + "\n";
        }
        all += curr;
        all += '\t</g>\n'
    }
    all += '</svg>'
    fs.writeFileSync(
        'tracks.svg',
        all,
        'utf-8'
    )
}

const trains = parseMtaSVG('mta_coords.csv', SVG_HEIGHT, SVG_WIDTH).then((trains) => {
    coordsToInput(trains);
    coordsToSVG(trains);
});
