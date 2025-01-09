document.addEventListener("DOMContentLoaded", function() {

    const locations = [
        {x: 0, y: 0},
        {x: 100, y: 100},
        {x: 200, y: 500},
        {x: 300, y: 200},
        {x: 0, y: 0}
    ]

    const paths = [];

    for (let i = 0; i < locations.length - 1; i++) {
        const origin = locations[i];
        const destination = locations[i + 1];
        const pathData = templatePath(origin, destination);
        const path = makePath("subway", pathData, i);
        paths.push(path);
    }

    for (let i = 0; i < paths.length; i++) {
        const positiveConnection = paths[(i + 1) % paths.length];
        const negativeConnection = paths[(i - 1 + paths.length) % paths.length];
        paths[i].addPositiveConnections({ 0: positiveConnection });
        paths[i].addNegativeConnections({ 0: negativeConnection });
    }

    const trainElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    trainElement.setAttribute("r", 10);
    trainElement.setAttribute("fill", "red");
    document.getElementById("subway").appendChild(trainElement);

    const train = new Train(0, 2, 0, 1, 0, trainElement, paths[0]);

    function animate() {
        train.animateTrain();
        requestAnimationFrame(animate);
    }
    animate();
});

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

        newPath.setAttribute("id", id);
        newPath.setAttribute("d", pathData);
        newPath.setAttribute("stroke", "black");
        newPath.setAttribute("fill", "none");
        newPath.setAttribute("stroke-width", 4);
        toAttach.appendChild(newPath);
        return new Path(newPath);
    }
}

class Path {

    // Connections go strictly from this path to the input paths in the direction specified
    // Connections may not go the other way
    constructor(element) {
        this.element = element;
        this.length = element.getTotalLength();
        this.positiveConnections = null;
        this.negativeConnections = null;
        this.numPositiveConnections = 0;
        this.numNegativeConnections = 0;
    }

    getPointAtLength(location) {
        return this.element.getPointAtLength(location);
    }

    addPositiveConnections(paths) {
        this.positiveConnections = paths;
        this.numPositiveConnections = Object.keys(paths).length;
    }

    addNegativeConnections(paths) {
        this.negativeConnections = paths;
        this.numNegativeConnections = Object.keys(paths).length;
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

    getNegativeConnection(turnDirection) {
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
                this.currentPath = this.currentPath.getPositiveConnection(this.turnDirection);
                this.distance = 0;
            }
            else {
                this.direction = -1;
            }
        }
        else if (this.distance <= 0){
            if (this.currentPath.numNegativeConnections > 0) {
                console.log("Has a negative connection!");
                this.currentPath = this.currentPath.getNegativeConnection(this.turnDirection);
                this.distance = this.currentPath.length;

            }
            else {
                this.direction = 1;
            }
        }
       
        const point = this.currentPath.getPointAtLength(this.distance);
        this.element.setAttribute('cx', point.x);
        this.element.setAttribute('cy', point.y);
       
        this.distance += this.speed * this.direction; // Speed of the train (increase the value for faster movement)
    }

    changeDirection(direction) {
        this.direction = direction;
    }
};
