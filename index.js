const DEBUG = false;

function debugLog(...args) {
    if (DEBUG) console.log(...args);
}

document.addEventListener("DOMContentLoaded", async function() {

    const response = await fetch('./tracks.min.svg');
    const svgText = await response.text();

    const container = document.getElementById("svg-container");
    container.innerHTML = svgText;

    const subway = container.querySelector("svg");
    subway.id = "subway"; 

    // maybe process paths with svgo separately to
    // preserve connection stuff

    const {pathsInput, connectionsInput} = await readInput("./mta-input.json");

    let paths = createPathObjects(pathsInput);
    addPathConnections(connectionsInput, paths);
    console.log({paths})

    const trainElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    trainElement.setAttribute("r", 10);
    trainElement.setAttribute("fill", "red");
    document.getElementById("subway").appendChild(trainElement);

    const train = new Train(0, 4, 0, 1, 0, trainElement, paths[0]);

    function animate() {
        train.animateTrain();
        requestAnimationFrame(animate);
    }
    animate();
});

function createPathObjects(pathsInput) {
    let paths = {};
    for (const pathInput of pathsInput) {
        const pathData = templatePath(pathInput.origin, pathInput.destination, pathInput.midpoint ??= false);
        const path = makePath("subway", pathData, pathInput.id);
        paths[pathInput.id] = path;
    }
    return paths;
}

function addPathConnections(connectionsInput, paths) {
    for (const connection of connectionsInput) {
        const [path1, end1] = connection[0];
        const [path2, end2] = connection[1];

        const path1EndPoint = paths[path1].getPointAtLength(end1 === 1 ? paths[path1].length : 0);
        const path2EndPoint = paths[path2].getPointAtLength(end2 === 1 ? paths[path2].length : 0);

        // Detect invalid connections and skip them
        if (path1EndPoint.x !== path2EndPoint.x || path1EndPoint.y !== path2EndPoint.y) {
            console.error(`Invalid connection: Path ${path1} (end ${end1}) does not match Path ${path2} (end ${end2})`);
            continue;
        }

        if (end1 === 1) {
            paths[path1].addPositiveConnections(paths[path2], end2);
        } else {
            paths[path1].addNegativeConnections(paths[path2], end2);
        }

        if (end2 === 1) {
            paths[path2].addPositiveConnections(paths[path1], end1);
        } else {
            paths[path2].addNegativeConnections(paths[path1], end1);
        } 
    }
}

async function readInput(filename) {
    const file = await fetch(filename);
    const json = await file.json();
    console.log({json});
    return json;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function templatePath(origin, destination, midpoint=false) {
    if (midpoint) {
        return `M ${origin.x} ${origin.y} Q ${midpoint.x} ${midpoint.y} ${destination.x} ${destination.y}`;
    }
    else {
        return `M ${origin.x} ${origin.y} L ${destination.x} ${destination.y}`;
    }
}

function makePath(attachToId, pathData, id) {
    const toAttach = document.getElementById(attachToId);
    if (toAttach) {
        const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

        newPath.setAttribute("id", `path-${id}`);
        newPath.setAttribute("d", pathData);
        newPath.setAttribute("stroke", "black");
        newPath.setAttribute("fill", "none");
        newPath.setAttribute("stroke-width", 4);
        toAttach.appendChild(newPath);

        if (DEBUG) {
            const length = newPath.getTotalLength();
            const midpoint = newPath.getPointAtLength(length / 2);
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", midpoint.x);
            label.setAttribute("y", midpoint.y);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("fill", "red");
            label.setAttribute("font-size", "25");
            label.textContent = `${id}`;
            toAttach.appendChild(label);
        }
        return new Path(newPath, id);
    }
}

class Path {
    constructor(element, id) {
        this.id = id;
        this.element = element;
        this.length = element.getTotalLength();
        this.positiveConnections = {};
        this.negativeConnections = {};
        this.numPositiveConnections = 0;
        this.numNegativeConnections = 0;
    }

    getPointAtLength(location) {
        return this.element.getPointAtLength(location);
    }

    addPositiveConnections(path, adjoiningEnd) {
        this.positiveConnections[this.numPositiveConnections] = [path, adjoiningEnd];
        this.numPositiveConnections += 1;
    }

    addNegativeConnections(path, adjoiningEnd) {
        this.negativeConnections[this.numNegativeConnections] = [path, adjoiningEnd];
        this.numNegativeConnections += 1;
    }

    getPositiveConnection(direction) {
        console.log({direction});
        console.log(this.positiveConnections)
        if (this.numPositiveConnections === 1) {
            return this.positiveConnections[0];
        }
        else {
            return this.positiveConnections[direction];
        }
    }

    getNegativeConnection(direction) {
        if (this.numNegativeConnections === 1) {
            return this.negativeConnections[0];
        }
        else {
            return this.negativeConnections[direction];
        }
    }
};

class Train {
    constructor(line, speed, distance, direction, turnDirection, element, currentPath) {
        this.line = line;
        this.speed = speed;
        this.distance = distance;
        this.direction = direction;
        this.turnDirection = turnDirection;
        this.element = element;
        console.log({element, currentPath})
        this.currentPath = currentPath;
        this.initKeyListeners();
    }

    initKeyListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.code === "ArrowLeft") {
                this.turnDirection = 0; // Set turn direction to 0 (left)
                console.log("Turn direction set to left");
            }
            else if (event.code === "ArrowRight") {
                this.turnDirection = 1; // Set turn direction to 1 (right)
                console.log("Turn direction set to right");
            }
            else if (event.code === "ArrowDown") {
                this.direction = -1;
            }
            else if (event.code === "ArrowUp") {
                this.direction = 1;
            }
        });
    }

    animateTrain() {
        if (this.distance >= this.currentPath.length) {
            // Check for positive connections
            if (this.currentPath.numPositiveConnections > 0) {
                console.log("Has a positive connection");
                let adjoiningEnd;
                [this.currentPath, adjoiningEnd] = this.currentPath.getPositiveConnection(this.turnDirection);
                if (adjoiningEnd === 1) {
                    this.distance = this.currentPath.length;
                    this.direction = -1;
                }
                else {
                    this.distance = 0;
                }
            }
            else {
                this.direction = -1;
            }
        }
        else if (this.distance <= 0){
            if (this.currentPath.numNegativeConnections > 0) {
                console.log("Has a negative connection!");
                let adjoiningEnd;
                [this.currentPath, adjoiningEnd] = this.currentPath.getNegativeConnection(this.turnDirection);
                console.log(this.currentPath, {adjoiningEnd})
                if (adjoiningEnd === 0) {
                    this.distance = 0;
                    this.direction = 1;
                }
                else {
                    this.distance = this.currentPath.length;
                    this.direction = -1;
                }
            }
            else {
                this.direction = 1;
            }
        }
       
        const point = this.currentPath.getPointAtLength(this.distance);
        this.element.setAttribute('cx', point.x);
        this.element.setAttribute('cy', point.y);
       
        this.distance += this.speed * this.direction;
    }

    changeDirection(direction) {
        this.direction = direction;
    }
};
